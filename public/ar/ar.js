import * as SmartActionsAR from './smart-actions-ar.js';
import * as OfficeCardsAR from './office-cards-ar.js';

// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function initAR(socket, foreignStream, foreignStreamDisplay) {

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

    var markerRoots = {};

    var arContent = {
        ...smartActions,
        ...officeCards
    };

    Object.keys(arContent).forEach(function (uuid) {
        markerRoots[uuid] = new THREE.Group;
        markerRoots[uuid].name = uuid;
        scene.add(markerRoots[uuid]);
    });

    function triggerARContext() {
        arToolkitContext = new THREEx.ArToolkitContext({
            cameraParametersUrl: '/assets/camera-para.dat',
            detectionMode: 'mono',
            canvasWidth: foreignStreamDisplay.clientWidth,
            canvasHeight: foreignStreamDisplay.clientHeight
        });

        arToolkitContext.init(function onCompleted() {
            arToolkitContext.setProj;
            //camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix())
            window.arToolkitContext = arToolkitContext;
        });

        Object.keys(arContent).forEach(function (uuid) {
            markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoots[uuid], {
                type: 'pattern',
                patternUrl: '/ar/assets/fiducial/' + uuid + '.patt',
            });
        });
    };

    var mouse = new THREE.Vector2();
    var mouseNorm = new THREE.Vector2();
    var cursorActive = false;

    var lastTime = 0;

    var geometry = new THREE.PlaneGeometry(0.2, 0.2);

    var cursorMaterial = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('/ar/assets/cursor/cursor.png'),
        depthTest: false,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    var cursorSelectMaterial = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('/ar/assets/cursor/cursor_select.png'),
        depthTest: false,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    var cursorPlane = new THREE.Mesh(geometry, cursorMaterial);

    var raycaster = new THREE.Raycaster();

    renderFunctions.push(function () {

        raycaster.setFromCamera(mouse, camera);

        var intersection;
        Object.keys(arContent).forEach(function (uuid) {
            intersection = raycaster.intersectObject(markerRoots[uuid], true);
            if (intersection.length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
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

            SmartActionsAR.initModelling(smartActions, markerRoots, socket);
            OfficeCardsAR.initModelling(officeCards, markerRoots, socket);
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

        var intersection;
        Object.keys(arContent).forEach(function (uuid) {
            intersection = raycaster.intersectObject(markerRoots[uuid], true);

            if (intersection.length > 0 && markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0) {
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