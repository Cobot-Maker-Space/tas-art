import { initAR } from './ar/ar.js';
import { configWebRTC } from './webrtc_config.js';

// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// containers for video streams
const localStreamDisplay = document.getElementById('local-view');
const foreignStreamDisplay = document.getElementById('foreign-view');
const foreignAudioPlayer = document.getElementById('foreign-audio');
const statusDisplay = document.getElementById('status');

var webRTC = configWebRTC();
var socket = webRTC[0];
var me = webRTC[1];

// webRTC connection handling
var answered = false;

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(localStream => {
    addVideoStream(localStreamDisplay, localStream);

    socket.emit('join-robot', ROBOT_ID, me.id);
    statusDisplay.textContent = '📞 Connecting to ' + ROBOT_NAME;
    me.on('call', call => {
        call.answer(localStream);
        statusDisplay.textContent = '✨ Loading augmented reality';
        call.on('stream', foreignStream => {
            if (!answered) {
                addVideoStream(foreignAudioPlayer, foreignStream);
                initAR(socket, foreignStream, foreignStreamDisplay);
                initControls();
            }
            answered = true;
        });
    });
});

socket.on('robot-disconnected', robotId => {
    location.href = '/select?error=disconnect';
});

// utility function for displaying video/audio
function addVideoStream(display, stream) {
    display.srcObject = stream;
    display.addEventListener('loadedmetadata', () => {
        display.play();
    });
};

// vars for robot state and input handling
var muted = false;
var parked = false;

var forward = false;
var back = false;
var left = false;
var right = false;
var hardStop = false;

// health responses, triggered when the robot state changes in some monitored way
socket.on('health-msg', message => {
    if (message.target == ROBOT_ID) {
        switch (message.type) {
            case ('battery'):
                document.getElementById('battery').textContent = message.status + '%';
                if (message.status > 60) {
                    document.getElementById('battery').className = 'text-success';
                } else if (message.status > 30) {
                    document.getElementById('battery').className = 'text-warning';
                } else {
                    document.getElementById('battery').className = 'text-danger';
                };
                break;
            case ('charging'):
                if (message.status) {
                    document.getElementById('charging').textContent = "🔌";
                    document.getElementById('prompt').style.visibility = 'visible';
                } else {
                    document.getElementById('charging').textContent = "🔋";
                    document.getElementById('prompt').style.visibility = 'hidden';
                };
                break;
            case ('kickstand'):
                if (message.status == 1 || message.status == 2) {
                    document.getElementById('parked').disabled = false;
                } else {
                    document.getElementById('parked').disabled = true;
                };
                if (message.status == 2) {
                    document.getElementById('parked').checked = false;
                    parked = false;
                } else if (message.status == 1) {
                    document.getElementById('parked').checked = true;
                    parked = true;
                };
                break;
            case ('pole'):
                document.getElementById('short').disabled = false;
                document.getElementById('tall').disabled = false;
                if (message.status == 0) {
                    document.getElementById('short').checked = true;
                    document.getElementById('tall').checked = false;
                } else if (message.status == 100) {
                    document.getElementById('short').checked = false;
                    document.getElementById('tall').checked = true;
                };
                break;
            case ('tilt-position'):
                document.getElementById('tilt').disabled = false;
                document.getElementById('tilt').value = (1 - message.status) * 100;
                break;
        };
    };
});

// input handling for buttons and arrow keys
function initControls() {

    async function resetHand() {
        await delay(10000);
        document.getElementById('hand').checked = false;
        document.getElementById('hand').disabled = false;
    }

    document.getElementById('tilt').oninput = function () {
        socket.emit('control-msg', document.getElementById('tilt').value, ROBOT_ID);
    };
    document.getElementById('undock').onclick = function () {
        socket.emit('control-msg', 'undock', ROBOT_ID);
    };
    document.getElementById('hand').onclick = function () {
        if (document.getElementById('hand').disabled == false) {
            socket.emit('ifttt-event', "https://maker.ifttt.com/trigger/doorbell/with/key/dYCXTSvVVAgvb-I3h-YYVG7MxBigGQZ7UYyYH45zl8X");
            document.getElementById('hand').disabled = true;
            resetHand();
        }
    };
    document.getElementById('muted').onclick = function () {
        if (muted) {
            socket.emit('control-msg', 'unmute', ROBOT_ID);
        } else {
            socket.emit('control-msg', 'mute', ROBOT_ID);
        };
        muted = !muted;
    };
    document.getElementById('parked').onclick = function () {
        if (parked) {
            socket.emit('control-msg', 'unpark', ROBOT_ID);
        } else {
            socket.emit('control-msg', 'park', ROBOT_ID);
        };
    };
    document.getElementById('short').onclick = function () {
        socket.emit('control-msg', 'short', ROBOT_ID);
    };
    document.getElementById('tall').onclick = function () {
        socket.emit('control-msg', 'tall', ROBOT_ID);
    };

    document.addEventListener('keydown', function (event) {
        event.preventDefault();
        switch (event.key) {
            case "ArrowUp":
                parked = false;
                forward = true;
                break;
            case "ArrowDown":
                parked = false;
                back = true;
                break;
            case "ArrowLeft":
                parked = false;
                left = true;
                break;
            case "ArrowRight":
                parked = false;
                right = true;
                break;
        };
    });

    document.addEventListener('keyup', function (event) {
        switch (event.key) {
            case "ArrowUp":
                forward = false;
                hardStop = true;
                break;
            case "ArrowDown":
                back = false;
                hardStop = true;
                break;
            case "ArrowLeft":
                left = false;
                hardStop = true;
                break;
            case "ArrowRight":
                right = false;
                hardStop = true;
                break;
        };
    });

    // these controls need to be persistently deployed for the robot to respond
    setInterval(function () {
        if (forward) {
            socket.emit('control-msg', 'forward', ROBOT_ID);
        };
        if (back) {
            socket.emit('control-msg', 'back', ROBOT_ID);
        };
        if (left) {
            socket.emit('control-msg', 'left', ROBOT_ID);
        };
        if (right) {
            socket.emit('control-msg', 'right', ROBOT_ID);
        };

        if (hardStop) {
            socket.emit('control-msg', 'hard-stop', ROBOT_ID);
            hardStop = false;
        };
    }, 200);
};
