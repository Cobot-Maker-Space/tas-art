# Technical description
## Missing header
The *Double 3* frontend, [robot.ejs](views/robot.ejs), is served to the robot as a standard webpage via an [*Electron*](https://www.electronjs.org/) browser window. Each *Double 3* is given its identity via its UUID being given in the URL, `.../robot/[UUID]`, which is **private** and only visible serverside and [to admins](#double-3-robots).

> The driver frontend establishes a relationship with a specific *Double 3* via the MD5 hash of a robot's UUID in the URL, `.../[MD5_OF_UUID]`.