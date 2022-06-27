// initial double commands and lifecycle callback
window.onload = () => {
    DRDoubleSDK.sendCommand('base.requestStatus')
    DRDoubleSDK.sendCommand('events.subscribe', {
        events: [
            'DRBase.status',
            'DRCamera.hitResult'
        ]
    })
    DRDoubleSDK.sendCommand('navigate.enable')
    DRDoubleSDK.sendCommand('system.screen.setBrightness', {
        'percent': 1.0,
        'fadeMs': 100
    })
    //DRDoubleSDK.sendCommand('camera.output', {
    //    'width': 1920,
    //    'height': 1080,
    //    'template': 'v4l2'
    //})
    //DRDoubleSDK.sendCommand('system.setPerformanceModel', {
    //    'name': 'highest'
    //})
    window.setInterval(() => {
        DRDoubleSDK.resetWatchdog()
    }, 2000)
}

// containers for video streams
const localStreamDisplay = document.getElementById('local-view')
const foreignStreamDisplay = document.getElementById('foreign-view')

// webRTC TURN/STUN config 
const socket = io('/')
const me = new Peer({
    config: {
        'iceServers': [
            {
                urls: "stun:openrelay.metered.ca:80",
            },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
            },
        ],
    }
})

// webRTC connection handling
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(localStream => {
    socket.on('user-connected', theirID => {
        const call = me.call(theirID, localStream)
        call.on('stream', foreignStream => {
            addVideoStream(localStreamDisplay, localStream)
            addVideoStream(foreignStreamDisplay, foreignStream)
            document.getElementById('reassurance').style.visibility = 'hidden'
            DRDoubleSDK.sendCommand('screensaver.nudge')
            //DRDoubleSDK.sendCommand('navigate.target', {
            //    'action': 'exitDock'
            //})
        })
    })
})
socket.on('user-disconnected', theirID => {
    localStreamDisplay.srcObject = null
    foreignStreamDisplay.srcObject = null
    //DRDoubleSDK.sendCommand('base.kickstand.deploy')
    DRDoubleSDK.sendCommand('base.pole.sit')
    document.getElementById('reassurance').style.visibility = 'visible'
})
me.on('open', myID => {
    socket.emit('join-robot', ROBOT_ID, myID)
})

// utility function for displaying video/audio
function addVideoStream(display, stream) {
    display.srcObject = stream
    display.addEventListener('loadedmetadata', () => {
        display.play()
    })
}

var attemptClickToDrive = false

// health broadcasting 
DRDoubleSDK.on('event', (message) => {
    switch (message.class + '.' + message.key) {
        case 'DRBase.status':
            socket.emit('health-msg', 'battery', message.data.battery, ROBOT_ID)
            socket.emit('health-msg', 'kickstand', message.data.kickstand, ROBOT_ID)
            document.getElementById('battery').textContent = "🔋 " + message.data.battery + '%'
            if (message.data.battery > 60) {
                document.getElementById('battery').className = 'mt-5 p-5 text-success'
            } else if (message.data.battery > 30) {
                document.getElementById('battery').className = 'mt-5 p-5 text-warning'
            } else {
                document.getElementById('battery').className = 'mt-5 p-5 text-danger'
            }
            break
        case 'DRCamera.hitResult':
            socket.emit('health-msg', 'highlight-cursor', message.data.hit, ROBOT_ID)
            if (attemptClickToDrive) {
                DRDoubleSDK.sendCommand('navigate.hitResult', message.data)
                attemptClickToDrive = false
            }
            break
    }
})


// responses to control messages, i.e., comms with DRDoubleSDK
var velocity = 0.0
var rotation = 0.0
var move = false

socket.on('control-msg', message => {
    if (message.target == ROBOT_ID) {
        switch (message.content) {
            case 'mute':
                foreignStreamDisplay.muted = true
                break
            case 'unmute':
                foreignStreamDisplay.muted = false
                break
            case 'unpark':
                //DRDoubleSDK.sendCommand('base.kickstand.retract')
                break
            case 'park':
                DRDoubleSDK.sendCommand('base.kickstand.deploy')
                break
            case 'short':
                DRDoubleSDK.sendCommand('base.pole.sit')
                console.log('sit')
                break
            case 'tall':
                DRDoubleSDK.sendCommand('base.pole.stand')
                console.log('stand')
                break
            case 'forward':
                console.log('forward')
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
                    'percent': 1 - (message.content / 100)
                })
                break
        }

        if (move) {
            DRDoubleSDK.sendCommand('navigate.drive', {
                'throttle': velocity, 'turn': rotation, 'powerDrive': true
            })
            move = false
        }
    }
})

socket.on('click-to-drive', message => {
    if (message.target == ROBOT_ID) {
        DRDoubleSDK.sendCommand('camera.hitTest', {
            'x': message.xCoord, 'y': message.yCoord, 'highlight': true
        })
        if (message.attempt) {
            attemptClickToDrive = true
        }
    }
})

