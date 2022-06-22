// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// containers for video streams
const localStreamDisplay = document.getElementById('local-view')
const foreignStreamDisplay = document.getElementById('foreign-view')
const foreignAudioPlayer = document.getElementById('foreign-audio')

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
});

// webRTC connection handling
var answered = false

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(localStream => {
    addVideoStream(localStreamDisplay, localStream)
    socket.emit('join-robot', ROBOT_ID, me.id)
    me.on('call', call => {
        call.answer(localStream)
        call.on('stream', foreignStream => {
            if (!answered) {
                socket.emit('control-msg', 'unpark', ROBOT_ID)
                socket.emit('control-msg', 'short', ROBOT_ID)
                addVideoStream(foreignAudioPlayer, foreignStream)
                triggerAR(foreignStream)
                triggerControls()
            }
            answered = true
        })
    })
})

// utility function for displaying video/audio
function addVideoStream(display, stream) {
    display.srcObject = stream
    display.addEventListener('loadedmetadata', () => {
        display.play()
    })
}

// health responses, triggered when the robot state changes in some monitored way
socket.on('health-msg', message => {
    if (message.target == ROBOT_ID) {
        switch (message.type) {
            case ('battery'):
                document.getElementById('battery').textContent = message.status + '%'
                if (message.status > 60) {
                    document.getElementById('battery').className = 'text-success'
                } else if (message.status > 30) {
                    document.getElementById('battery').className = 'text-warning'
                } else {
                    document.getElementById('battery').className = 'text-danger'
                }
                break
            case ('kickstand'):
                if (message.status == 1 || message.status == 2) {
                    document.getElementById('parked').disabled = false
                }
                if (message.status == 2) {
                    document.getElementById('parked').checked = false
                }
                break
        }
    }
})

// vars for robot state and input handling
var muted = false 
var parked = false
var short = true

var forward = false
var back = false
var left = false
var right = false
var hardStop = false

// input handling for buttons and arrow keys
function triggerControls() {
    document.getElementById('tilt').oninput = function () {
        socket.emit('control-msg', document.getElementById('tilt').value, ROBOT_ID)
    }
    document.getElementById('muted').onclick = function () {
        if (muted) {
            socket.emit('control-msg', 'unmute', ROBOT_ID)
        } else {
            socket.emit('control-msg', 'mute', ROBOT_ID)
        }
        muted = !muted
    }
    document.getElementById('parked').onclick = function () {
        if (parked) {
            socket.emit('control-msg', 'unpark', ROBOT_ID)
            document.getElementById('parked').disabled = true

        } else {
            socket.emit('control-msg', 'park', ROBOT_ID)
            document.getElementById('parked').disabled = true
        }
        parked = !parked
    }
    document.getElementById('short').onclick = function () {
        socket.emit('control-msg', 'short', ROBOT_ID)
        short = true
    }
    document.getElementById('tall').onclick = function () {
        socket.emit('control-msg', 'tall', ROBOT_ID)
        short = false
    }

    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case "ArrowUp":
                parked = false
                forward = true
                break
            case "ArrowDown":
                parked = false
                back = true
                break
            case "ArrowLeft":
                parked = false
                left = true
                break
            case "ArrowRight":
                parked = false
                right = true
                break
        }
    })

    document.addEventListener('keyup', function (event) {
        switch (event.key) {
            case "ArrowUp":
                forward = false
                hardStop = true
                break
            case "ArrowDown":
                back = false
                hardStop = true
                break
            case "ArrowLeft":
                left = false
                hardStop = true
                break
            case "ArrowRight":
                right = false
                hardStop = true
                break
        }
    })

    // these controls need to be persistently deployed for the robot to respond
    setInterval(function () {
        if (forward) {
            socket.emit('control-msg', 'forward', ROBOT_ID)
        }
        if (back) {
            socket.emit('control-msg', 'back', ROBOT_ID)
        }
        if (left) {
            socket.emit('control-msg', 'left', ROBOT_ID)
        }
        if (right) {
            socket.emit('control-msg', 'right', ROBOT_ID)
        }

        if (hardStop) {
            socket.emit('control-msg', 'hard-stop', ROBOT_ID)
            hardStop = false
        }
    }, 200)
}

// smart action augmented reality set-up
function triggerAR(foreignStream) {

    // webGL renderer instantiation
    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    })
    renderer.setSize(foreignStreamDisplay.clientWidth, foreignStreamDisplay.clientHeight)
    // renderer will create canvas element in html for AR graphics
    foreignStreamDisplay.appendChild(renderer.domElement)

    // scene and camera instantiation for AR matrix calculations
    var renderFunctions = []
    var arToolkitContext, markerControls
    var scene = new THREE.Scene()
    var camera = new THREE.PerspectiveCamera()
    scene.add(camera)

    // objects for containing 'marker packages', i.e., relations
    // between fiducial markers, the AR graphics to show, and the
    // smart action which is triggered when raytraced (clicked)
    var markerRoots = {}
    Object.keys(smartActions).forEach(function (uuid) {
        markerRoots[uuid] = new THREE.Group
        markerRoots[uuid].name = uuid
        scene.add(markerRoots[uuid])
    })

    // source instantiation, i.e., the webRTC stream coming from the robot
    var arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'video',
        sourceWidth: 1920,
        sourceHeight: 1080,
        displayWidth: foreignStreamDisplay.clientWidth,
        displayHeight: foreignStreamDisplay.clientHeight
    })

    arToolkitSource.init(function onReady() {
        foreignStreamDisplay.appendChild(arToolkitSource.domElement)
        triggerARContext()
        onResize()
    })
    arToolkitSource.domElement.srcObject = foreignStream

    window.addEventListener('resize', function () {
        onResize()
    })
    function onResize() {
        arToolkitSource.onResizeElement()
        arToolkitSource.copyElementSizeTo(renderer.domElement)
        if (arToolkitContext.arController !== null) {
            arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
        }
    }

    // unique THREEx instantiations for AR.js functionality
    function triggerARContext() {

        // defines some parameters for how markers are detected
        arToolkitContext = new THREEx.ArToolkitContext({
            cameraParametersUrl: 'camera_para.dat',
            detectionMode: 'mono',
            canvasWidth: 1920,
            canvasHeight: 1080
        })

        // handles matrices between THREE and THREEx
        arToolkitContext.init(function onCompleted() {
            camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix())
            window.arToolkitContext = arToolkitContext
        })

        // relevant fiducial markers (.patt files) associated with each smart action package
        Object.keys(smartActions).forEach(function (uuid) {
            markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoots[uuid], {
                type: 'pattern',
                patternUrl: 'assets/fiducial/' + uuid + '.patt',
            })
        })
    }

    // all functions in renderFunctions will run once per frame
    renderFunctions.push(function () {
        // wait for async functions
        if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
            return;
        }

        // updates THREEx context
        arToolkitContext.update(arToolkitSource.domElement)
    })
        ; (function () {

            // defines the AR models which are shown when fiducial markers are 
            // detected. again, unique for each smart action package, as per db contents
            var materials = {}
            var materialsConfirm = {}
            var planes = {}

            // geometry - single double-sided plane
            // same for all smart actions
            var geometry = new THREE.PlaneGeometry(1, 1)

            Object.keys(smartActions).forEach(function (uuid) {
                // materials for specific smart action
                materials[uuid] = new THREE.MeshBasicMaterial({
                    map: THREE.ImageUtils.loadTexture('/assets/ar-icon/' + uuid + '.png'),
                    transparent: true,
                    opacity: 1,
                    side: THREE.DoubleSide
                })
                materialsConfirm[uuid] = new THREE.MeshBasicMaterial({
                    map: THREE.ImageUtils.loadTexture('/assets/ar-icon-confirm/' + uuid + '.png'),
                    transparent: true,
                    opacity: 1,
                    side: THREE.DoubleSide
                })

                // instance of geometry, with smart action specific parameters (i.e., materials)
                planes[uuid] = new THREE.Mesh(geometry, materials[uuid])
                planes[uuid].rotateX(-1.5708)
                planes[uuid].position.y = geometry.parameters.height / 2
                planes[uuid].position.x = geometry.parameters.width / 4
                markerRoots[uuid].add(planes[uuid])

                // callback for instance of geometry when raytraced (clicked)
                planes[uuid].callback = function () {
                    (async () => {
                        planes[uuid].material = materialsConfirm[uuid]
                        // actual location ifttt is triggered via a webhook
                        var requ = new XMLHttpRequest()
                        requ.open('GET', smartActions[uuid].webhook, true)
                        requ.send(null)
                        await delay(2000)
                        planes[uuid].material = materials[uuid]
                    })()
                }
            })
        })()

    renderFunctions.push(function () {
        renderer.render(scene, camera);
    })

    // render loop
    requestAnimationFrame(function animate() {
        renderFunctions.forEach(function (renderFunction) {
            renderFunction()
        })
        requestAnimationFrame(animate)
    })

    // onclick handling for renderer (canvas), both for raytracing 
    // and sending to robot for click-to-drive functionality
    renderer.domElement.addEventListener("click", onClick)
    var raycaster = new THREE.Raycaster()
    var mouse = new THREE.Vector2()

    function onClick(event) {
        mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = - (event.offsetY / renderer.domElement.clientHeight) * 2 + 1

        // the double 3 likes a different normalization range
        var mouseNormX = (mouse.x - -1) / (1 - -1)
        var mouseNormY = (mouse.y - -1) / (1 - -1)
        socket.emit('click-to-drive', mouseNormX, 1 - mouseNormY, ROBOT_ID)

        raycaster.setFromCamera(mouse, camera)

        // ray trace for each smart action package
        var intersects = {}
        Object.keys(smartActions).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObjects(markerRoots[uuid].children)

            if (intersects[uuid].length > 0) {
                intersects[uuid][0].object.callback()
            }
        })
    }
}
