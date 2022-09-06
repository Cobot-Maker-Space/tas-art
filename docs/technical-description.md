# Technical description
## The server
The server is a [Node.js](https://nodejs.org/) application. It uses [Express](https://expressjs.com/) as a web framework and [Socket.io](https://socket.io/) for real-time communication. It operates exclusively via the `server.js` file, and follows the routing/configuration advice of *Express* and *Socket.io*, so it is fairly boilerplate.

In addition to normal web server stuff, it executes all *Microsoft Graph* communication using the queries in `ms-queries.js`, and also sends web requests to *IFTTT* for smart actions. It also facilitates broader *Socket.io* communication than just *WebRTC* establishment; all of the robot control and status messaging passes through the server to either the driver or robot in question.

## The database
Data is currently stored simply in JSON format, in the `db.json` file. This will be plenty sufficient for all conceivable deployments, as any realistic number of robots, smart actions, etc. will still implicate 100s of entries rather than 100,000s.

Furthermore, user data is only polled from *Microsoft Graph* (stored in volatile memory), so the size of the organization/user-base will not increase the size of `db.json` (although, user profile photos are saved indefinitely on the server, right now). 

## Driver-side interface
### Overview
The driver frontend is where the majority of the project's novel functionality is either implemented or triggered by contacting [the server](#the-server). This is primarily due to [performance and bandwidth considerations](limitations-and-trade-offs.md#double-3-performance-and-network-bandwidth) in the context of the *Double 3* hardware.

### Augmented reality
The novel augmented reality is implemented using [*AR.js*](https://ar-js-org.github.io/AR.js-Docs/) for fiducial marker recognition and tracking, and [*THREE.js*](https://threejs.org/) for 3D rendering on a [HTML5 canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API). [*THREEx.artoolkit*](https://jeromeetienne.github.io/AR.js/three.js/) is used as a middleman between the two libraries to translate the tracking data from *AR.js* into rendering data (e.g., matrices) for *THREE.js*. Finally, [THREEMeshUI](https://github.com/felixmariotto/three-mesh-ui) is used for the [presence cards](system-configuration.md#microsoft-teams-presence-cards) feature to massively simplify rendering dynamic text.

The pre-existing *Double 3* augmented reality is processed internally on-robot, and layered on top of the camera view passed to the browser. It has some aesthetic configuration available via the *D3 API*, but it is fundamentally a black box, and can only be interacted with via [preset `DRDoubleSDK` requests](#the-d3-api). 

### Smart actions
Within this application, smart actions are actually implemented incredibly simply, using the *Webhook* trigger offered by [*IFTTT*](https://www.ifttt.com/). *IFTTT* is a service that allows users to create 'applets' that trigger when certain triggers occur, and then perform a series of actions involved *IoT* services and hardware.

Via the aforementioned AR framework, admin-defined elements will appear in the driver interface when a certain fiducial marker is detected, and interacting with it will despatch a message to the server. The server will then poll the *IFTTT Webhook* service via a normal `GET` web request to trigger an applet. A description of configuration of smart actions can be found in the [relevant section](system-configuration.md#ifttt-smart-actions).

### Presence cards
Microsoft presence cards allow drivers to see who an office/desk belongs to, their activity status on *Microsoft Teams*, and allows them to seamlessly send a *Teams* message to that person (as if to 'knock on the door', for example).

Currently, when a driver initiates a connection with a robot, the driver interface polls the server to poll *Microsoft Graph* for each active presence card. The server then responds with the name, profile picture, and activity of each of these users which is built into a 'card' using [THREEMeshUI](https://github.com/felixmariotto/three-mesh-ui) in `smart-actions-ar.js`.

> ❗ This is sufficient for the current implementation, but is obviously in $O(n)$ time and will make the initial driver connection slower if there are lots of active cards. Also, the presence doesn't update periodically, although this would be easy to implement.

Just like the initial polling, sending a message also despatches a *Socket.io* command to the server, which in turn `POST`s data to *Microsoft Graph*.

## Robot-side interface
### Overview
The *Double 3* frontend is served to the robot as a standard webpage via an [*Electron*](https://www.electronjs.org/) browser window. This is described as a [*Standby App*](https://github.com/doublerobotics/d3-sdk/tree/master/examples/standby-basic) in the *Double 3* documentation.

Each *Double 3* is given its identity via the UUID given in the URL, `.../robot/[UUID]`, which is **private** and only visible serverside and [to admins](system-configuration#double-3-robots).

> The driver frontend establishes a relationship with a specific *Double 3* via the MD5 hash of a robot's UUID in the URL, `.../[MD5_OF_UUID]`.

The robot-side interface is **intentionally 'primitive'** due to [hardware limitations](limitations-and-trade-offs.md#double-3-performance-and-network-bandwidth), and meaningfully only does two things: handles its side of the *WebRTC* call, and interfaces with the *D3 API*. Most additive functionality, such as *Microsoft Graph* communication and the associated augmented reality, are implemented server-side and driver-side respectively.

### The *D3 API*
All access to *Double 3* hardware - for driving, the camera, microphone, retrieving battery percentage, etc. - is managed through the `DRDoubleSDK` library. This is served to the *Electron* browser window, and hence accessible through the *Double 3* frontend.

Broadly speaking, two things can be done through the `DRDoubleSDK`: commands can be sent to the API in JSON format, and API events can be subscribed to. These API events have JSON payloads and fire when the relevant data changes. It's somewhat *ROS*-like in this sense.

> It's important to recognise that the `DRDoubleSDK` is inaccessible from the driver frontend, and always should be, for security reasons. User-triggered commands (e.g., click-to-drive) are emitted to the *Double 3* frontend via the server, using [*SocketIO*](https://socket.io/) (a [*WebSocket*](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) wrapper), which then in turn queries the `DRDoubleSDK` locally.