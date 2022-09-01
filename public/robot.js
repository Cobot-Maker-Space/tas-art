/**
 * * Frontend code running the robot WebRTC connection and DRDOubleSDK communication
 * Broadly, responds to and despatches Socket messages with the server, and thus the driver
 * These events are either triggered by the driver (e.g., click-to-drive) or DRDoubleSDK (e.g., battery life)
 * ! DRDoubleSDK commands must always be sanitised or hard-coded robot-side for security reasons
 */

import { configWebRTC } from './webrtc_config.js'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * ? The DRDoubleSDK has an internal method for checking if the standby screen is 'alive', which
 * ? involves polling it with a watchdog command every X milliseconds. If it doesn't receive a poll
 * ? it will default the standby screen to the WiFi window. In practice this is really annoying
 * ? and I don't think it actually helps anything, so this command disables it.
 */
DRDoubleSDK.sendCommand('gui.watchdog.disallow')

// Initial DRDoubleSDK set-up commands for enabling camera etc. when the page loads
// TODO: Try and solve the problem that sometimes the DRDoubleSDK doesn't respond to these commands
window.onload = () => {
  ;(async () => {
    // Attempt to decrease the frequency of the aforementioned bug
    await delay(2000)

    DRDoubleSDK.sendCommand('events.subscribe', {
      events: ['DRBase.status', 'DRCamera.hitResult', 'DRMotor.position']
    })
    DRDoubleSDK.sendCommand('navigate.enable')
    DRDoubleSDK.sendCommand('system.screen.setBrightness', {
      percent: 1.0,
      fadeMs: 100
    })
    DRDoubleSDK.sendCommand('camera.enable', {
      height: 1080,
      template: 'v4l2'
    })
    DRDoubleSDK.sendCommand('tilt.minLimit.disable')
    DRDoubleSDK.sendCommand('tilt.maxLimit.disable')

    // Only enable 'highest' performance if reverse cam enabled
    if (REVERSE_CAM_LABEL != null && REVERSE_CAM_LABEL != '') {
      DRDoubleSDK.sendCommand('system.setPerformanceModel', {
        name: 'highest'
      })
    } else {
      DRDoubleSDK.sendCommand('system.setPerformanceModel', {
        name: 'high'
      })
    }

    DRDoubleSDK.sendCommand('speaker.enable')
    DRDoubleSDK.sendCommand('speaker.setVolume', { percent: 0.5 })

    DRDoubleSDK.sendCommand('base.requestStatus')

    DRDoubleSDK.sendCommand('system.enableRearUSBPorts')

    DRDoubleSDK.sendCommand('base.requestStatus')
  })()
}

// Containers for video streams
const localStreamDisplay = document.getElementById('local-view')
const foreignStreamDisplay = document.getElementById('foreign-view')

var webRTC = configWebRTC()
var socket = webRTC[0]
var me = webRTC[1]

var driverConnected = false

// Fetch the rear webcam device if it is enabled and exists
var reverseCamEnabled = false
var reverseCamId = null
navigator.mediaDevices.enumerateDevices().then(function (devices) {
  console.log(devices)
  for (var i in devices) {
    if (devices[i].label == REVERSE_CAM_LABEL) {
      console.log('entered')
      reverseCamId = devices[i].deviceId
      reverseCamEnabled = true
      break
    }
  }
})

var merger

// * WebRTC connection establishment and handling
// Get front-facing camera stream
navigator.mediaDevices
  .getUserMedia({
    video: {
      width: { max: 1920 },
      height: { max: 1080 }
    },
    audio: true
  })
  .then(localStream => {
    // If enabled, get rear-view camera stream
    if (reverseCamEnabled) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            deviceId: { exact: reverseCamId },
            width: { max: 1280 },
            height: { max: 720 }
          },
          audio: false
        })
        .then(reverseStream => {
          // If enabled, use a merger to combine the two streams into one MediaStream
          merger = new VideoStreamMerger({
            width: 1920,
            height: 1080,
            fps: 30,
            clearRect: false
          })
          merger.addStream(localStream, {
            x: 0,
            y: 0,
            width: merger.width,
            height: merger.height,
            mute: false
          })

          // Picture-in-picture style; rear-view bottom left
          var sizeDivisor = 4
          merger.addStream(reverseStream, {
            x: 30,
            y: merger.height - merger.height / sizeDivisor - 100,
            width: merger.width / sizeDivisor,
            height: merger.height / sizeDivisor,
            mute: true
          })
          merger.start()
          makeConnection(merger.result, localStream)
        })
        // ! This is a workaround for the camera spawning bug
        .catch(err => {
          async function reload () {
            await delay(2000)
            location.reload()
          }
          reload()
        })
    } else {
      makeConnection(localStream, localStream)
    }
  })
  // ! This is a workaround for the camera spawning bug
  .catch(err => {
    async function reload () {
      await delay(2000)
      location.reload()
    }
    reload()
  })
/**
 * makeConnection
 * * Actually establish the WebRTC connection with the driver
 * @param localSend The MediaStream to send to the driver
 * @param localShow the MediaStream to show on the robot display
 * ? These parameters differ in the case of the rear-view for performance reasons
 */
function makeConnection (localSend, localShow) {
  socket.on('user-connected', theirID => {
    const call = me.call(theirID, localSend)
    call.on('stream', foreignStream => {
      addVideoStream(localStreamDisplay, localShow)
      addVideoStream(foreignStreamDisplay, foreignStream)
      // Set initial robot state, particularly the camera tilt
      DRDoubleSDK.sendCommand('screensaver.nudge')
      DRDoubleSDK.sendCommand('base.requestStatus')
      DRDoubleSDK.sendCommand('tilt.target', {
        percent: 0.4
      })
      driverConnected = true
    })
  })
}
me.on('open', myID => {
  socket.emit('robot-alive', ROBOT_ID)
  socket.emit('join-robot', ROBOT_ID, myID)
})
// Utility function for displaying video/audio on-page async
function addVideoStream (display, stream) {
  display.srcObject = stream
  display.addEventListener('loadedmetadata', () => {
    display.play()
  })
}

// Reload the page if the driver disconnects
// ! Honestly this is a dirty way of making sure everything is reset for the next call
// ? Technically increases server load but also, not really
socket.on('user-disconnected', theirID => {
  driverConnected = false
  location.reload()
})

var attemptClickToDrive = false

// * This is triggered when a DRDoubleSDK event which has been subscribed to occurs
// It's responded to usually by broadcoasting to the driver, via the server, some information 
// Also changes info on the standby screen (not in call)
// Also, as a special case, will call the click-to-drive functionality when it receives the validity
DRDoubleSDK.on('event', message => {
  switch (message.class + '.' + message.key) {
    case 'DRBase.status':
      // Emit info to driver
      socket.emit('health-msg', 'battery', message.data.battery, ROBOT_ID)
      socket.emit('health-msg', 'charging', message.data.charging, ROBOT_ID)
      socket.emit('health-msg', 'kickstand', message.data.kickstand, ROBOT_ID)
      socket.emit('health-msg', 'pole', message.data.pole, ROBOT_ID)
      // Update standby screen
      document.getElementById('battery').textContent =
        '🔋 ' + message.data.battery + '%'
      if (message.data.battery > 60) {
        document.getElementById('battery').className = 'mt-5 p-5 text-success'
      } else if (message.data.battery > 30) {
        document.getElementById('battery').className = 'mt-5 p-5 text-warning'
      } else {
        document.getElementById('battery').className = 'mt-5 p-5 text-danger'
      }
      break
    // If click-to-drive attempt is drivable, then drive
    case 'DRCamera.hitResult':
      socket.emit('health-msg', 'highlight-cursor', message.data.hit, ROBOT_ID)
      if (attemptClickToDrive) {
        DRDoubleSDK.sendCommand('navigate.hitResult', message.data)
        attemptClickToDrive = false
      }
      break
    case 'DRMotor.position':
      socket.emit('health-msg', 'tilt-position', message.data.percent, ROBOT_ID)
      break
  }
})

// Respond to driver with media devices for the admin robot workflow
socket.on('get-media-devices', robotId => {
  if (decodeURIComponent(robotId).replace(/ /g, '+') == ROBOT_ID) {
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
      socket.emit('media-devices', devices)
    })
  }
})

var velocity = 0.0
var rotation = 0.0
var move = false
/**
 * * 'Translates' incoming messages from the driver into DRDoubleSDK commands
 * This is where all of the user interaction with the robot is translated into actual actuation
 */
socket.on('control-msg', message => {
  if (message.target == ROBOT_ID) {
    switch (message.content) {
      case 'mute':
        foreignStreamDisplay.muted = true
        break
      case 'unmute':
        foreignStreamDisplay.muted = false
        break
      case 'undock':
        DRDoubleSDK.sendCommand('navigate.target', {
          action: 'exitDock'
        })
        break
      case 'unpark':
        DRDoubleSDK.sendCommand('base.kickstand.retract')
        break
      case 'park':
        DRDoubleSDK.sendCommand('base.kickstand.deploy')
        break
      case 'short':
        DRDoubleSDK.sendCommand('base.pole.sit')
        break
      case 'tall':
        DRDoubleSDK.sendCommand('base.pole.stand')
        break
      case 'forward':
        velocity = 1.0
        move = true
        break
      case 'back':
        velocity = -1.0
        move = true
        break
      case 'left':
        rotation = -1.0
        move = true
        break
      case 'right':
        rotation = 1.0
        move = true
        break
      case 'hard-stop':
        velocity = 0.0
        rotation = 0.0
        move = true
        break
      default:
        DRDoubleSDK.sendCommand('tilt.target', {
          percent: 1 - message.content / 100
        })
        break
    }

    // Aggregate of all movement commands into one message
    // ! Movement messages are emitted periodically (e.g., every 200ms) as the DRDoubleSDK requires this
    // ? The robot will stop moving when movement messages stop, but it will stop faster if a message to stop is sent
    if (move) {
      DRDoubleSDK.sendCommand('navigate.drive', {
        throttle: velocity,
        turn: rotation,
        powerDrive: true
      })
      move = false
    }
  }
})

// If the driver attempts click-to-drive, emit a hit test to the DRDoubleSDK which is then parsed above
socket.on('click-to-drive', message => {
  if (message.target == ROBOT_ID) {
    DRDoubleSDK.sendCommand('camera.hitTest', {
      x: message.xCoord,
      y: message.yCoord,
      highlight: true
    })
    if (message.attempt) {
      attemptClickToDrive = true
    }
  }
})

// * On-screen volume control
// A disappearing slider which appears when someone touches the screen in-call
var relativeX = 0
var touchActive = false

foreignStreamDisplay.addEventListener('touchstart', function (event) {
  event.preventDefault()
  if (!driverConnected) return

  touchActive = true
  document.getElementById('volume-parent').style.visibility = 'visible'

  var touch = event.touches[0]
  relativeX = touch.clientX / foreignStreamDisplay.clientWidth
  document.getElementById('volume').value = relativeX * 100
})

foreignStreamDisplay.addEventListener('touchend', function (event) {
  ;(async () => {
    event.preventDefault()
    if (!driverConnected) return

    touchActive = false
    DRDoubleSDK.sendCommand('speaker.setVolume', { percent: relativeX })
    await delay(1000)
    if (!touchActive) {
      document.getElementById('volume-parent').style.visibility = 'hidden'
    }
  })()
})

foreignStreamDisplay.addEventListener('touchmove', function (event) {
  event.preventDefault()
  if (!driverConnected) return

  var touch = event.touches[0]
  relativeX = touch.clientX / foreignStreamDisplay.clientWidth
  document.getElementById('volume').value = relativeX * 100
})
