# Technical description
## The server
## The database
Data is currently stored simply in JSON format, in the [db.json](db/db.json) file. This will be plenty sufficient for all conceivable deployments, as any realistic number of robots, smart actions, etc. will still implicate 100s of entries rather than 100,000s.

Furthermore, user data is only polled from *Microsoft Graph* (stored in volatile memory), so the size of the organization/user-base will not increase the size of [db.json](db/db.json) (although, user profile photos are saved indefinitely on the server, right now). 

## Driver-side interface
### Overview
The driver frontend - [driver.ejs](#views/driver.ejs), [driver.js](#public/driver.js), [ar.js](#public/ar.js), [smart-actions-ar.js](#public/smart-actions-ar.js), and [office-cards-ar.js](#public/office-cards-ar.js) - is where the majority of the project's novel functionality is either implemented or triggered by contacting [the server](). This is primarily due to [performance and bandwith considerations]() in the context of the *Double 3* hardware.

### Augmented reality
The novel augmented reality is implemented using [*AR.js*](https://ar-js-org.github.io/AR.js-Docs/) for fiducial marker recognition and tracking, and [*THREE.js*](https://threejs.org/) for 3D rendering on a [HTML5 canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). [*THREEx.artoolkit*](https://jeromeetienne.github.io/AR.js/three.js/) is used as a middleman between the two libraries to translate the tracking data from *AR.js* into rendering data (e.g., matrices) for *THREE.js*. Finally, [THREEMeshUI](https://github.com/felixmariotto/three-mesh-ui) is used for the [presence cards]() feature to massively simplify rendering dynamic text.

The pre-existing *Double 3* augmented reality is processed internally on-robot, and layered on top of the camera view passed to the browser. It has some aesthetic configuration available via the *D3 API*, but it is fundamentally a black box, and can only be interacted with via [preset `DRDoubleSDK` requests](#the-d3-api). 

### Smart actions
### Presence cards

## Robot-side interface
### Overview
The *Double 3* frontend, [robot.ejs](views/robot.ejs) and [robot.js](public/robot.js), is served to the robot as a standard webpage via an [*Electron*](https://www.electronjs.org/) browser window. This is described as a [*Standby App*]() in the *Double 3* documentation.

Each *Double 3* is given its identity via the UUID given in the URL, `.../robot/[UUID]`, which is **private** and only visible serverside and [to admins](system-configuration#double-3-robots).

> The driver frontend establishes a relationship with a specific *Double 3* via the MD5 hash of a robot's UUID in the URL, `.../[MD5_OF_UUID]`.

The robot-side interface is **intentionally 'primitive'** due to [hardware limitations](), and meaningfully only does two things: handles its side of the *WebRTC* call, and [interfaces with the *D3 API*](). Most additive functionality, such as [*Microsoft Graph* communication]() and the associated [augmented reality](), are implemented server-side and driver-side respectively.

### The *D3 API*
All access to *Double 3* hardware - for driving, the camera, microphone, retrieving battery percentage, etc. - is managed through the `DRDoubleSDK` library. This is served to the *Electron* browser window, and hence accessible through the *Double 3* frontend.

Broadly speaking, two things can be done through the `DRDoubleSDK`: commands can be sent to the API in JSON format, and API events can be subscribed to. These API events have JSON payloads and fire when the relevant data changes. It's somewhat *ROS*-like in this sense.

> It's important to recognise that the `DRDoubleSDK` is inaccessible from the driver frontend, and always should be, for security reasons. User-triggered commands (e.g., click-to-drive) are emitted to the *Double 3* frontend via the server, using [*SocketIO*](https://socket.io/) (a [*WebSocket*](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) wrapper), which then in turn queries the `DRDoubleSDK` locally.