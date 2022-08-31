import * as SmartActionsAR from './smart-actions-ar.js'
import * as OfficeCardsAR from './office-cards-ar.js'

/**
 * initAR
 * * Initialisation of the AR display and beginning of the render loop
 * @param socket The communication socket with the server
 * @param foreignStream The incoming stream from the robot
 * @param foreignStreamDisplay The video element to display the incoming stream
 */
export function initAR (socket, foreignStream, foreignStreamDisplay) {
  // * THREE.js renderer initialisation
  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setSize(
    foreignStreamDisplay.clientWidth,
    foreignStreamDisplay.clientHeight
  )
  foreignStreamDisplay.appendChild(renderer.domElement)

  // * Scene, camera, and AR.js (THREEx) initialisation
  var renderFunctions = []
  var arToolkitContext, markerControls
  var scene = new THREE.Scene()
  var camera = new THREE.PerspectiveCamera()
  scene.add(camera)

  // Video source for AR
  var arToolkitSource = new THREEx.ArToolkitSource({
    sourceType: 'video',
    sourceWidth: 1920,
    sourceHeight: 1080,
    displayWidth: foreignStreamDisplay.clientWidth,
    displayHeight: foreignStreamDisplay.clientHeight
  })
  arToolkitSource.init(function onReady () {
    foreignStreamDisplay.appendChild(arToolkitSource.domElement)
    triggerARContext()
    onResize()
  })
  arToolkitSource.domElement.srcObject = foreignStream

  // Window resize callback to resize the AR display
  window.addEventListener('resize', function () {
    onResize()
  })
  function onResize () {
    arToolkitSource.onResizeElement()
    arToolkitSource.copyElementSizeTo(renderer.domElement)
    if (arToolkitContext.arController != null) {
      arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
    }
  }

  // * AR content initialisation
  // Object to contain a THREE Group for each instance of AR content
  var markerRoots = {}
  // Expanded list of all AR content
  var arContent = {
    ...smartActions,
    ...officeCards
  }

  // Populates markerRoots, each Group identifiable by a content UUID (see db.json)
  Object.keys(arContent).forEach(function (uuid) {
    markerRoots[uuid] = new THREE.Group()
    markerRoots[uuid].name = uuid
    scene.add(markerRoots[uuid])
  })

  // Calibrates AR marker detection matrices; callable on window resize
  function triggerARContext () {
    // ? Do different parameters here offer better marker detection?
    arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: '/assets/camera-para.dat',
      detectionMode: 'mono',
      canvasWidth: foreignStreamDisplay.clientWidth,
      canvasHeight: foreignStreamDisplay.clientHeight
    })
    arToolkitContext.init(function onCompleted () {
      arToolkitContext.setProj

      // TODO: Calibrate the Double 3 camera to create an accurate .dat file
      // ! Must remain commented until the camera has been calibrated
      // camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix())

      window.arToolkitContext = arToolkitContext
    })

    // Associates AR content with its corresponding fiducial marker
    Object.keys(arContent).forEach(function (uuid) {
      markerControls = new THREEx.ArMarkerControls(
        arToolkitContext,
        markerRoots[uuid],
        {
          type: 'pattern',
          patternUrl: '/ar/assets/fiducial/' + uuid + '.patt'
        }
      )
    })
  }

  // * Dynamic cursor implementation and rendering
  var mouse = new THREE.Vector2()
  var mouseNorm = new THREE.Vector2()
  var cursorActive = false
  var lastTime = 0

  // Cursor materials
  var cursorMaterial = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture('/ar/assets/cursor/cursor.png'),
    depthTest: false,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  })
  var cursorSelectMaterial = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture('/ar/assets/cursor/cursor_select.png'),
    depthTest: false,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide
  })
  // Cursor geometry
  var geometry = new THREE.PlaneGeometry(0.2, 0.2)
  var cursorPlane = new THREE.Mesh(geometry, cursorMaterial)

  // Cursor aesthetics update on render loop, depending on what is under it
  var raycaster = new THREE.Raycaster()
  renderFunctions.push(function () {
    raycaster.setFromCamera(mouse, camera)
    var intersection
    Object.keys(arContent).forEach(function (uuid) {
      intersection = raycaster.intersectObject(markerRoots[uuid], true)
      if (
        intersection.length > 0 &&
        markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0
      ) {
        cursorActive = true
      }
    })

    // Smaller cursor if something is under it
    if (cursorActive) {
      cursorPlane.material = cursorSelectMaterial
      cursorPlane.scale.set(0.466, 0.7)
    } else {
      cursorPlane.material = cursorMaterial
      cursorPlane.scale.set(0.667, 1)
    }

    // Projects 2D cursor position into 3D space for THREE rendering
    var cursorPos = new THREE.Vector3(mouse.x, mouse.y, 0)

    cursorPos.unproject(camera)
    cursorPos.sub(camera.position).normalize()
    var distance = (-3 - camera.position.z) / cursorPos.z

    cursorPlane.position
      .copy(camera.position)
      .add(cursorPos.multiplyScalar(distance))

    if (document.body.style.cursor == 'none') {
      scene.add(cursorPlane)
    } else {
      scene.remove(cursorPlane)
    }
  })

  // * Render AR content
  // Render loop for AR, content groups (markerRoots) are displayed through updating the context with the source
  renderFunctions.push(function () {
    if (!arToolkitContext || !arToolkitSource || !arToolkitSource.ready) {
      return
    }
    arToolkitContext.update(arToolkitSource.domElement)
  })
  // Initialisation for AR content models/displays and triggerable events
  // ! Only called once per page load
  ;(function () {
    SmartActionsAR.initModelling(smartActions, markerRoots, socket)
    OfficeCardsAR.initModelling(officeCards, markerRoots, socket)
  })()

  // Render loop for other necessities
  renderFunctions.push(function () {
    ThreeMeshUI.update()
    renderer.render(scene, camera)
  })

  // Calls each renderFunction per frame
  requestAnimationFrame(function animate () {
    renderFunctions.forEach(function (renderFunction) {
      renderFunction()
    })
    requestAnimationFrame(animate)
  })

  // Displays/hides default cursor depending on if cursor is over AR display
  document
    .getElementById('toolbar')
    .addEventListener('mouseover', function (event) {
      document.body.style.cursor = 'default'
    })
  document
    .getElementById('local-view')
    .addEventListener('mouseover', function (event) {
      document.body.style.cursor = 'default'
    })

  renderer.domElement.addEventListener(
    'mouseover',
    function (event) {
      document.body.style.cursor = 'none'
    },
    false
  )

  // * Click-to-drive & AR interaction implementation
  // Cursor aesthetic update, poll robot with cursor location periodically
  renderer.domElement.addEventListener(
    'mousemove',
    function (event) {
      mouse.x = (event.offsetX / renderer.domElement.clientWidth) * 2 - 1
      mouse.y = -(event.offsetY / renderer.domElement.clientHeight) * 2 + 1
      mouseNorm.x = (mouse.x - -1) / (1 - -1)
      mouseNorm.y = (mouse.y - -1) / (1 - -1)

      if (lastTime < Date.now() - 200) {
        lastTime = Date.now()
        socket.emit(
          'click-to-drive',
          mouseNorm.x,
          1 - mouseNorm.y,
          false,
          ROBOT_ID
        )
      }
    },
    false
  )

  // On-click, raycast to find the closest intersection
  var raycaster = new THREE.Raycaster()
  renderer.domElement.addEventListener(
    'click',
    function (event) {
      // Emit click-to-drive in case the interaction is so
      socket.emit(
        'click-to-drive',
        mouseNorm.x,
        1 - mouseNorm.y,
        true,
        ROBOT_ID
      )

      // Check for markerRoot intersections, i.e., smart actions or presence cards
      raycaster.setFromCamera(mouse, camera)
      var intersection
      Object.keys(arContent).forEach(function (uuid) {
        intersection = raycaster.intersectObject(markerRoots[uuid], true)
        if (
          intersection.length > 0 &&
          markerRoots[uuid].position.x + markerRoots[uuid].position.y != 0
        ) {
          markerRoots[uuid].callback()
        }
      })
    },
    false
  )

  // Update cursor aesthetics if the robot says click-to-drive is possible
  socket.on('health-msg', message => {
    if (message.target == ROBOT_ID && message.type == 'highlight-cursor') {
      cursorActive = message.status
    }
  })
}
