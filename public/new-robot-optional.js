// The in-built Double 3 media devices
const ignoredDeviceLabels = [
  "Default",
  "Mic Rear Center",
  "Mic Front Center",
  "Mic Front Left/Right",
  "Mic Ears Left/Right",
  "Intel(R) RealSense(TM) Depth Camera 430  Depth (8086:0ad4)",
  "D3_Camera",
  "Built-in Audio",
];

const socket = io("/");

var topRadioLabel = "";
var bottomRadioLabel = "";

// Basic aesthetic switch for the user enabling/disabling the optional feature
var rearViewVisible = false;
document.getElementById("rearView").onclick = function () {
  rearViewVisible = !rearViewVisible;
  document.getElementById("rearViewLabel").innerHTML = rearViewVisible
    ? "<b>Configure rear-view camera</b>"
    : "Configure rear-view camera";
  document.getElementById("rearViewHint").style.display = rearViewVisible
    ? "none"
    : "block";
  document.getElementById("rearViewInsts").style.display = rearViewVisible
    ? "block"
    : "none";
};

// Basic aesthetic switch for the user enabling/disabling the optional feature
var handRaiseVisible = false;
document.getElementById("handRaise").onclick = function () {
  handRaiseVisible = !handRaiseVisible;
  document.getElementById("handRaiseLabel").innerHTML = handRaiseVisible
    ? "<b>Configure physical hand-raising</b>"
    : "Configure physical hand-raising";
  document.getElementById("handRaiseHint").style.display = handRaiseVisible
    ? "none"
    : "block";
  document.getElementById("handRaiseInsts").style.display = handRaiseVisible
    ? "block"
    : "none";
};

/**
 * * Retrieve the media devices plugged into the Double 3 by requesting via the server
 */
document.getElementById("refreshDevices").onclick = function () {
  socket.emit("get-media-devices", ROBOT_PUBLIC_ID);

  socket.on("media-devices", (devices) => {
    // On retrieval, update the HTML elements to reflect the labels for selection
    for (var id in devices) {
      if (!ignoredDeviceLabels.includes(devices[id].label)) {
        if (
          topRadioLabel == devices[id].label ||
          bottomRadioLabel == devices[id].label
        ) {
          continue;
        }
        if (topRadioLabel == "") {
          document.getElementById("device1Label").innerHTML =
            "<b>" + devices[id].label + "</b>";
          document.getElementById("device1").value = devices[id].label;
          document.getElementById("device1").disabled = false;
          document.getElementById("device1").checked = true;
          topRadioLabel = devices[id].label;
        } else {
          document.getElementById("device2Label").innerHTML = devices[id].label;
          document.getElementById("device2").value = devices[id].label;
          document.getElementById("device2").disabled = false;
          bottomRadioLabel = devices[id].label;
        }
      }
    }
  });
};
