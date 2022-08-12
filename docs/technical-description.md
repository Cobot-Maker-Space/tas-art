# Technical description
## The server
## The database
## Driver-side interface
## Robot-side interface
The *Double 3* frontend, [robot.ejs](views/robot.ejs) and [robot.js](public/robot.js), is served to the robot as a standard webpage via an [*Electron*](https://www.electronjs.org/) browser window. This is described as a [*Standby App*]() in the *Double 3* documentation.

Each *Double 3* is given its identity via the UUID given in the URL, `.../robot/[UUID]`, which is **private** and only visible serverside and [to admins](system-configuration#double-3-robots).

> The driver frontend establishes a relationship with a specific *Double 3* via the MD5 hash of a robot's UUID in the URL, `.../[MD5_OF_UUID]`.

The robot-side interface is **intentionally 'primitive'** due to [hardware limitations](), and meaningfully only does two things: handles its side of the *WebRTC* call, and [interfaces with the *D3 API*](). Most additive functionality, such as [*Microsoft Graph* communication]() and the associated [augmented reality](), are implemented server-side and driver-side respectively.

## Robot-side: the *D3 API*
All access to *Double 3* hardware - for driving, the camera, microphone, retrieving battery percentage, etc. - is managed through the `DRDoubleSDK` library. This is served to the *Electron* browser window, and hence accessible through the *Double 3* frontend.

Broadly speaking, two things can be done through the `DRDoubleSDK`: commands can be sent to the API in JSON format, and API events can be subscribed to. These API events have JSON payloads and fire when the relevant data changes. It's somewhat *ROS*-like in this sense.

> It's important to recognise that the `DRDoubleSDK` is inaccessible from the driver frontend, and always should be, for security reasons. User-triggered commands (e.g., click-to-drive) are emitted to the *Double 3* frontend via the server, using [*SocketIO*](https://socket.io/) (a [*WebSocket*](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) wrapper), which then in turn queries the `DRDoubleSDK` locally.