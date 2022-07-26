// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function initAR(socket, foreignStream, foreignStreamDisplay) {

    var mouse = new THREE.Vector2();
    var mouseNorm = new THREE.Vector2();
    var cursorActive = false;

    var lastTime = 0;

    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize(foreignStreamDisplay.clientWidth, foreignStreamDisplay.clientHeight);
    foreignStreamDisplay.appendChild(renderer.domElement);

    var renderFunctions = [];
    var arToolkitContext, markerControls;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera();
    scene.add(camera);

    var markerRoots = {};
    Object.keys(smartActions).forEach(function (uuid) {
        markerRoots[uuid] = new THREE.Group;
        markerRoots[uuid].name = uuid;
        scene.add(markerRoots[uuid]);
    });
    Object.keys(officeCards).forEach(function (uuid) {
        markerRoots[uuid] = new THREE.Group;
        markerRoots[uuid].name = uuid;
        scene.add(markerRoots[uuid]);
    });

    var arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'video',
        sourceWidth: 1920,
        sourceHeight: 1080,
        displayWidth: foreignStreamDisplay.clientWidth,
        displayHeight: foreignStreamDisplay.clientHeight
    });

    arToolkitSource.init(function onReady() {
        foreignStreamDisplay.appendChild(arToolkitSource.domElement);
        triggerARContext();
        onResize();
    });
    arToolkitSource.domElement.srcObject = foreignStream;

    window.addEventListener('resize', function () {
        onResize();
    });
    function onResize() {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(renderer.domElement);
        if (arToolkitContext.arController !== null) {
            arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
        };
    };

    function triggerARContext() {
        arToolkitContext = new THREEx.ArToolkitContext({
            cameraParametersUrl: '/camera-para.dat',
            detectionMode: 'mono',
            canvasWidth: foreignStreamDisplay.clientWidth,
            canvasHeight: foreignStreamDisplay.clientHeight
        });

        arToolkitContext.init(function onCompleted() {
            arToolkitContext.setProj;
            //camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix())
            window.arToolkitContext = arToolkitContext;
        });

        Object.keys(smartActions).forEach(function (uuid) {
            markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoots[uuid], {
                type: 'pattern',
                patternUrl: 'assets/fiducial/' + uuid + '.patt',
            });
        });
        Object.keys(officeCards).forEach(function (uuid) {
            markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoots[uuid], {
                type: 'pattern',
                patternUrl: 'assets/fiducial/' + uuid + '.patt',
            });
        });
    };

    var geometry = new THREE.PlaneGeometry(0.2, 0.2);

    var cursorMaterial = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('/assets/cursor.png'),
        depthTest: false,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    var cursorSelectMaterial = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('/assets/cursor_select.png'),
        depthTest: false,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    var cursorPlane = new THREE.Mesh(geometry, cursorMaterial);

    renderFunctions.push(function () {

        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        var intersects = {};
        Object.keys(smartActions).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObjects(markerRoots[uuid].children);
            if (intersects[uuid].length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
                cursorActive = true;
            };
        });
        Object.keys(officeCards).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObject(markerRoots[uuid], true);
            if (intersects[uuid].length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
                cursorActive = true;
            };
        });

        if (cursorActive) {
            cursorPlane.material = cursorSelectMaterial;
            cursorPlane.scale.set(0.466, 0.7);
        } else {
            cursorPlane.material = cursorMaterial;
            cursorPlane.scale.set(0.667, 1);
        };

        var cursorPos = new THREE.Vector3(mouse.x, mouse.y, 0);

        cursorPos.unproject(camera);
        cursorPos.sub(camera.position).normalize();
        var distance = (-3 - camera.position.z) / cursorPos.z;

        cursorPlane.position.copy(camera.position).add(cursorPos.multiplyScalar(distance));

        if (document.body.style.cursor == 'none') {
            scene.add(cursorPlane);
        } else {
            scene.remove(cursorPlane);
        };
    });

    renderFunctions.push(function () {
        if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
            return;
        };

        arToolkitContext.update(arToolkitSource.domElement);
    })
        ; (function () {

            var geometry = new THREE.PlaneGeometry(1, 1);

            var materials = {};
            var materialsConfirm = {};
            var planes = {};

            Object.keys(smartActions).forEach(function (uuid) {
                materials[uuid] = new THREE.MeshBasicMaterial({
                    map: THREE.ImageUtils.loadTexture('/assets/ar-icon/' + uuid + '.png'),
                    transparent: true,
                    opacity: 1,
                    side: THREE.DoubleSide
                });
                materialsConfirm[uuid] = new THREE.MeshBasicMaterial({
                    map: THREE.ImageUtils.loadTexture('/assets/ar-icon-confirm/' + uuid + '.png'),
                    transparent: true,
                    opacity: 1,
                    side: THREE.DoubleSide
                });

                planes[uuid] = new THREE.Mesh(geometry, materials[uuid]);
                planes[uuid].rotateX(-1.5708);
                markerRoots[uuid].add(planes[uuid]);

                planes[uuid].callback = function () {
                    (async () => {
                        planes[uuid].material = materialsConfirm[uuid];
                        socket.emit('ifttt-event', smartActions[uuid].webhook);
                        await delay(2000);
                        planes[uuid].material = materials[uuid];
                    })();
                };
            });

            Object.keys(officeCards).forEach(function (uuid) {

                const msPanel = new ThreeMeshUI.Block({
                    width: 2,
                    height: 1.5,
                    padding: 0.2,
                    borderRadius: 0.15,
                    borderWidth: 0.05,
                    borderColor: new THREE.Color(0xFFFFFF),
                    borderOpacity: 0.5,
                    fontFamily: 'Roboto-msdf.json',
                    fontTexture: 'Roboto-msdf.png',
                    justifyContent: 'center',
                    textAlign: 'left',
                });

                msPanel.rotateX(-1.5708);

                socket.emit("get-office-card", officeCards[uuid].ms_id);

                socket.on("office-card", info => {

                    console.log(info);

                    var text;
                    var colour;
                    var icon;

                    switch (info.presence.toLowerCase()) {
                        case ("available" || "availableidle"):
                            text = "Available";
                            colour = new THREE.Color(0x93c353);
                            icon = "ms-available.png";
                            break;
                        case ("away" || "berightback"):
                            text = "Away";
                            colour = new THREE.Color(0xfcd116);
                            icon = "ms-away.png";
                            break;
                        case ("busy" || "busyidle"):
                            text = "Busy";
                            colour = new THREE.Color(0xc4314b);
                            icon = "ms-busy.png";
                            break;
                        case ("donotdisturb"):
                            text = "Do not disturb";
                            colour = new THREE.Color(0xc4314b);
                            icon = "ms-dnd.png";
                            break;
                        case ("offline" || "presenceunknown"):
                            text = "Offline";
                            colour = new THREE.Color(0x9c9c9c);
                            icon = "ms-offline.png";
                            break;
                        default:
                            text = "Error";
                            colour = new THREE.Color(0x9c9c9c);
                            icon = "ms-offline.png";
                            break;
                    }

                    const loader = new THREE.TextureLoader();
                    loader.load(icon, (texture) => {
                        console.log(info.displayName);
                        const nameText = new ThreeMeshUI.Text({
                            content: info.name + "\n",
                            fontSize: 0.25,
                        });
                        msPanel.add(nameText);

                        const iconBlock = new ThreeMeshUI.InlineBlock({
                            borderRadius: 0,
                            borderWidth: 0,
                            height: 0.15,
                            width: 0.15,
                            backgroundTexture: texture
                        });
                        msPanel.add(iconBlock);

                        const presenceText = new ThreeMeshUI.Text({
                            content: " " + text + "\n",
                            fontColor: colour,
                            fontSize: 0.2,
                        });
                        msPanel.add(presenceText);

                        const buttonText = new ThreeMeshUI.Text({
                            content: "\nClick to knock",
                            fontColor: new THREE.Color(0x87C1FF),
                            fontSize: 0.15,
                        });
                        msPanel.add(buttonText);
                    });
                    markerRoots[uuid].add(msPanel);
                });

                markerRoots[uuid].callback = function () {
                    socket.emit("chat-msg", officeCards[uuid].chat_id, "Hi, I'm outside your office using a telepresence robot. Could we have a chat?");
                };
            });
        })();

        renderFunctions.push(function () {
        ThreeMeshUI.update();
        renderer.render(scene, camera);
    });

    requestAnimationFrame(function animate() {
        renderFunctions.forEach(function (renderFunction) {
            renderFunction();
        });
        requestAnimationFrame(animate);
    });

    document.getElementById('toolbar').addEventListener('mouseover', function (event) {
        document.body.style.cursor = 'default';
    });
    document.getElementById('local-view').addEventListener('mouseover', function (event) {
        document.body.style.cursor = 'default';
    });

    renderer.domElement.addEventListener('mouseover', function (event) {
        document.body.style.cursor = 'none';
    }, false);

    renderer.domElement.addEventListener('mousemove', function (event) {
        mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = - (event.offsetY / renderer.domElement.clientHeight) * 2 + 1;
        mouseNorm.x = (mouse.x - -1) / (1 - -1);
        mouseNorm.y = (mouse.y - -1) / (1 - -1);

        if (lastTime < Date.now() - 200) {
            lastTime = Date.now();
            socket.emit('click-to-drive', mouseNorm.x, 1 - mouseNorm.y, false, ROBOT_ID);
        };

    }, false);

    var raycaster = new THREE.Raycaster();

    renderer.domElement.addEventListener('click', function (event) {
        socket.emit('click-to-drive', mouseNorm.x, 1 - mouseNorm.y, true, ROBOT_ID);

        raycaster.setFromCamera(mouse, camera);

        var intersects = {};
        Object.keys(smartActions).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObjects(markerRoots[uuid].children);

            if (intersects[uuid].length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
                intersects[uuid][0].object.callback();
            };
        });
        Object.keys(officeCards).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObject(markerRoots[uuid], true);

            if (intersects[uuid].length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
                markerRoots[uuid].callback();
            };
        });

    }, false);

    socket.on('health-msg', message => {
        if (message.target == ROBOT_ID && message.type == 'highlight-cursor') {
            cursorActive = message.status;
        };
    });
};