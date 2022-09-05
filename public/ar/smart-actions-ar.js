const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * initModelling
 * * Initialises the modelling and interaction of the smart action AR content
 * @param smartActions An object containing the smart actions from the database
 * @param markerRoots An object containing the THREE groups for each smart action
 * @param socket The communication socket with the server
 */
export function initModelling(smartActions, markerRoots, socket) {
  // Variable initialisation
  var geometry = new THREE.PlaneGeometry(1, 1);
  var materials = {};
  var materialsConfirm = {};
  var planes = {};

  // * Loop through each smart action, performing initialisation
  Object.keys(smartActions).forEach(function (uuid) {
    // Smart action materials
    materials[uuid] = new THREE.MeshBasicMaterial({
      map: THREE.ImageUtils.loadTexture("/ar/assets/ar-icon/" + uuid + ".png"),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    materialsConfirm[uuid] = new THREE.MeshBasicMaterial({
      map: THREE.ImageUtils.loadTexture(
        "/ar/assets/ar-icon-confirm/" + uuid + ".png"
      ),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    // Smart action geometry
    planes[uuid] = new THREE.Mesh(geometry, materials[uuid]);
    planes[uuid].rotateX(-1.5708);
    markerRoots[uuid].add(planes[uuid]);

    // Smart action interaction; server communication to poll IFTTT
    markerRoots[uuid].callback = function () {
      (async () => {
        planes[uuid].material = materialsConfirm[uuid];
        socket.emit("ifttt-event", smartActions[uuid].webhook);
        await delay(2000);
        planes[uuid].material = materials[uuid];
      })();
    };
  });
}
