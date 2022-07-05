import { configWebRTC } from './webrtc_config.js';

// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

DRDoubleSDK.sendCommand('camera.enable', {
    'height': 1080,
    'template': 'v4l2'
});

DRDoubleSDK.sendCommand('gui.watchdog.disallow');

// initial double commands and lifecycle callback
window.onload = () => {
    (async () => {
        await delay(2000);

        DRDoubleSDK.sendCommand('events.subscribe', {
            events: [
                'DRBase.status',
                'DRCamera.hitResult',
                'DRMotor.position'
            ]
        });
        DRDoubleSDK.sendCommand('navigate.enable');
        DRDoubleSDK.sendCommand('system.screen.setBrightness', {
            'percent': 1.0,
            'fadeMs': 100
        });
        DRDoubleSDK.sendCommand('camera.enable', {
            'height': 1080,
            'template': 'v4l2'
        });
        DRDoubleSDK.sendCommand('tilt.minLimit.disable');
        DRDoubleSDK.sendCommand('tilt.maxLimit.disable');

        DRDoubleSDK.sendCommand('system.setPerformanceModel', {
            'name': 'highest'
        });
        DRDoubleSDK.sendCommand('speaker.enable');
        DRDoubleSDK.sendCommand('speaker.setVolume', { 'percent': 0.5 });

        DRDoubleSDK.sendCommand('base.requestStatus');
    })();
};

// containers for video streams
const localStreamDisplay = document.getElementById('local-view');
const foreignStreamDisplay = document.getElementById('foreign-view');

var webRTC = configWebRTC();
var socket = webRTC[0];
var me = webRTC[1];

var driverConnected = false;

// webRTC connection handling
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(localStream => {
    socket.on('user-connected', theirID => {
        const call = me.call(theirID, localStream);
        call.on('stream', foreignStream => {
            addVideoStream(localStreamDisplay, localStream);
            addVideoStream(foreignStreamDisplay, foreignStream);
            DRDoubleSDK.sendCommand('screensaver.nudge');
            DRDoubleSDK.sendCommand('base.requestStatus');
            DRDoubleSDK.sendCommand('tilt.target', {
                'percent': 0.5
            });
            driverConnected = true;
        });
    });
});
socket.on('user-disconnected', theirID => {
    localStreamDisplay.srcObject = null;
    foreignStreamDisplay.srcObject = null;
    driverConnected = false;
});
me.on('open', myID => {
    socket.emit('robot-alive', ROBOT_ID);
    socket.emit('join-robot', ROBOT_ID, myID);
});

// utility function for displaying video/audio
function addVideoStream(display, stream) {
    display.srcObject = stream;
    display.addEventListener('loadedmetadata', () => {
        display.play();
    });
};

var attemptClickToDrive = false;

// health broadcasting 
DRDoubleSDK.on('event', (message) => {
    switch (message.class + '.' + message.key) {
        case 'DRBase.status':
            socket.emit('health-msg', 'battery', message.data.battery, ROBOT_ID);
            socket.emit('health-msg', 'charging', message.data.charging, ROBOT_ID);
            socket.emit('health-msg', 'kickstand', message.data.kickstand, ROBOT_ID);
            socket.emit('health-msg', 'pole', message.data.pole, ROBOT_ID);

            document.getElementById('battery').textContent = "🔋 " + message.data.battery + '%';
            if (message.data.battery > 60) {
                document.getElementById('battery').className = 'mt-5 p-5 text-success';
            } else if (message.data.battery > 30) {
                document.getElementById('battery').className = 'mt-5 p-5 text-warning';
            } else {
                document.getElementById('battery').className = 'mt-5 p-5 text-danger';
            };
            break;
        case 'DRCamera.hitResult':
            socket.emit('health-msg', 'highlight-cursor', message.data.hit, ROBOT_ID);
            if (attemptClickToDrive) {
                DRDoubleSDK.sendCommand('navigate.hitResult', message.data);
                attemptClickToDrive = false;
            };
            break;
        case 'DRMotor.position':
            socket.emit('health-msg', 'tilt-position', message.data.percent, ROBOT_ID);
            break;
    };
});

// responses to control messages, i.e., comms with DRDoubleSDK
var velocity = 0.0;
var rotation = 0.0;
var move = false;

socket.on('control-msg', message => {
    if (message.target == ROBOT_ID) {
        switch (message.content) {
            case 'mute':
                foreignStreamDisplay.muted = true;
                break;
            case 'unmute':
                foreignStreamDisplay.muted = false;
                break;
            case 'undock':
                DRDoubleSDK.sendCommand('navigate.target', {
                    "action": "exitDock"
                });
                break;
            case 'unpark':
                DRDoubleSDK.sendCommand('base.kickstand.retract');
                break;
            case 'park':
                DRDoubleSDK.sendCommand('base.kickstand.deploy');
                break;
            case 'short':
                DRDoubleSDK.sendCommand('base.pole.sit');
                break;
            case 'tall':
                DRDoubleSDK.sendCommand('base.pole.stand');
                break;
            case 'forward':
                velocity = 1.0;
                move = true;
                break;
            case 'back':
                velocity = -1.0;
                move = true;
                break;
            case 'left':
                rotation = -1.0;
                move = true;
                break;
            case 'right':
                rotation = 1.0;
                move = true;
                break;
            case 'hard-stop':
                velocity = 0.0;
                rotation = 0.0;
                move = true;
                break;
            default:
                DRDoubleSDK.sendCommand('tilt.target', {
                    'percent': 1 - (message.content / 100)
                });
                break;
        };

        if (move) {
            DRDoubleSDK.sendCommand('navigate.drive', {
                'throttle': velocity, 'turn': rotation, 'powerDrive': true
            });
            move = false;
        };
    };
});

socket.on('click-to-drive', message => {
    if (message.target == ROBOT_ID) {
        DRDoubleSDK.sendCommand('camera.hitTest', {
            'x': message.xCoord, 'y': message.yCoord, 'highlight': true
        });
        if (message.attempt) {
            attemptClickToDrive = true;
        };
    };
});

// on-screen volume control
var relativeX = 0;
var touchActive = false;

foreignStreamDisplay.addEventListener("touchstart", function (event) {
    event.preventDefault();
    if (!driverConnected) return;

    touchActive = true;
    document.getElementById('volume-parent').style.visibility = 'visible';

    var touch = event.touches[0];
    relativeX = (touch.clientX / foreignStreamDisplay.clientWidth);
    document.getElementById('volume').value = relativeX * 100;
});

foreignStreamDisplay.addEventListener("touchend", function (event) {
    (async () => {
        event.preventDefault();
        if (!driverConnected) return;

        touchActive = false;
        DRDoubleSDK.sendCommand('speaker.setVolume', { 'percent': relativeX });
        await delay(1000);
        if (!touchActive) {
            document.getElementById('volume-parent').style.visibility = 'hidden';
        };
    })();
});

foreignStreamDisplay.addEventListener("touchmove", function (event) {
    event.preventDefault();
    if (!driverConnected) return;

    var touch = event.touches[0];
    relativeX = (touch.clientX / foreignStreamDisplay.clientWidth);
    document.getElementById('volume').value = relativeX * 100;
});