const ignoredDeviceLabels = [
    "Default",
    "Mic Rear Center",
    "Mic Front Center",
    "Mic Front Left/Right",
    "Mic Ears Left/Right",
    "Intel(R) RealSense(TM) Depth Camera 430  Depth (8086:0ad4)",
    "D3_Camera",
    "Built-in Audio"
];

const socket = io('/');

var rearViewVisible = false;

document.getElementById('rearView').onclick = function () {
    rearViewVisible = !rearViewVisible;
    document.getElementById('rearViewLabel').innerHTML =
        rearViewVisible ? "<b>Configure rear-view camera</b>" : "Configure rear-view camera";
    document.getElementById('rearViewHint').style.display =
        rearViewVisible ? "none" : "block";
    document.getElementById('rearViewInsts').style.display =
        rearViewVisible ? 'block' : 'none';
};

document.getElementById('refreshDevices').onclick = function () {
    socket.emit("get-media-devices", ROBOT_ID);

    socket.on("media-devices", data => {

    });
};