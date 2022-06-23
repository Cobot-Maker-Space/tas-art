// constant for async delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function initAR(socket, foreignStream, foreignStreamDisplay) {

    var mouse = new THREE.Vector2()

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
            cameraParametersUrl: '/camera_para.dat',
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

    var geometry = new THREE.PlaneGeometry(0.2, 0.2)

    var cursorMaterial = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture('/assets/cursor.jpg'),
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    })
    var cursorPlane = new THREE.Mesh(geometry, cursorMaterial)

    renderFunctions.push(function () {
        var cursorActive = false

        var raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mouse, camera)
        var intersects = {}
        Object.keys(smartActions).forEach(function (uuid) {
            intersects[uuid] = raycaster.intersectObjects(markerRoots[uuid].children)

            if (intersects[uuid].length > 0) {
                cursorActive = true
            }
        })

        if (cursorActive) {
            cursorPlane.scale.set(0.5, 0.5)
        } else {
            cursorPlane.scale.set(1, 1)
        }

        var cursorPos = new THREE.Vector3(mouse.x, mouse.y, 0)

        cursorPos.unproject(camera)
        cursorPos.sub(camera.position).normalize()
        var distance = (-3 - camera.position.z) / cursorPos.z

        cursorPlane.position.copy(camera.position).add(cursorPos.multiplyScalar(distance))
        scene.add(cursorPlane)
    })

    // all functions in renderFunctions will run once per frame
    renderFunctions.push(function () {
        // wait for async functions
        if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
            return
        }

        // updates THREEx context
        arToolkitContext.update(arToolkitSource.domElement)
    })
        ; (function () {

            // geometry - single double-sided plane
            var geometry = new THREE.PlaneGeometry(1, 1)

            // defines the AR models which are shown when fiducial markers are 
            // detected. again, unique for each smart action package, as per db contents
            var materials = {}
            var materialsConfirm = {}
            var planes = {}

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
        renderer.render(scene, camera)
    })

    // render loop
    requestAnimationFrame(function animate() {
        renderFunctions.forEach(function (renderFunction) {
            renderFunction()
        })
        requestAnimationFrame(animate)
    })


    renderer.domElement.addEventListener('mousemove', function (event) {
        mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1
        mouse.y = - (event.offsetY / renderer.domElement.clientHeight) * 2 + 1
    }, false)

    // onclick handling for renderer (canvas), both for raytracing 
    // and sending to robot for click-to-drive functionality
    var raycaster = new THREE.Raycaster()

    renderer.domElement.addEventListener('click', function (event) {
        //mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1
        //mouse.y = - (event.offsetY / renderer.domElement.clientHeight) * 2 + 1

        // click-to-drive functionality
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
    }, false)
}