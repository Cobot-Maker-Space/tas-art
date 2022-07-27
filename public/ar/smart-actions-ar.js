export function initModelling(smartActions, markerRoots, socket) {

    var geometry = new THREE.PlaneGeometry(1, 1);

    var materials = {};
    var materialsConfirm = {};
    var planes = {};

    Object.keys(smartActions).forEach(function (uuid) {
        materials[uuid] = new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('/ar/assets/ar-icon/' + uuid + '.png'),
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        materialsConfirm[uuid] = new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('/ar/assets/ar-icon-confirm/' + uuid + '.png'),
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        planes[uuid] = new THREE.Mesh(geometry, materials[uuid]);
        planes[uuid].rotateX(-1.5708);
        markerRoots[uuid].add(planes[uuid]);

        markerRoots[uuid].callback = function () {
            (async () => {
                planes[uuid].material = materialsConfirm[uuid];
                socket.emit('ifttt-event', smartActions[uuid].webhook);
                await delay(2000);
                planes[uuid].material = materials[uuid];
            })();
        };
    });
}