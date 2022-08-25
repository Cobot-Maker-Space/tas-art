# System configuration
## *Double 3* robots
### 1. Developer mode
All *Double 3* robots must have developer mode enabled to be configured for this project. This requires you to contact *Double Robotics*.

> *"To enter developer mode, you must first link the D3 with your Double account, then email your head serial number to devteam@doublerobotics.com with a request to enable developer mode. After a security authorization, our team will enable developer mode and you will have complete root access."* ([source](https://github.com/doublerobotics/d3-sdk/blob/master/docs/Developer%20Mode.md))

### 2. Navigate to the settings
Log in to the website using an [admin account]() then navigate through:
```
⚙️ -> 🤖 Robot manager -> ✨ New robot
```

### 3. Follow configuration steps
The basic information necessary to complete configuration is explained in the multi-page form.

**Troubleshooting**
- If there is an error when entering the display name and/or location, try again with A-Z and spaces only.
- If you cannot find the IP address of your *Double 3* via the default on-robot display, `arp -a` on the windows command line will show everything on the network - try them all :) 
- If you cannot access the Developer Monitor despite finding the IP address, port 8080 may be blocked by your network.
- If the robot will not activate but the display name appears on the robot screen, tap the grey refresh button on the robot display and try again.

*Configuration of the optional features ([rear-view](), [hand-raising]()) is explained below.*

## Rear-view cameras
### 1. Do you really want to?
Whilst included and technically functional, **this feature is currently unstable** for multiple reasons (some outside of a third-party developer's control) as explained [here]() and [here](). It should probably only be used in its current state for monitored use cases, such as trial deployments or studies.

### 2. Prepare the camera
The camera you use must be **plug-and-play via USB** in *Ubuntu* Linux. That is, it must not require manual driver or software installation in order to function.

Almost anything which is called a webcam by an established manufacturer will fall under this bracket; the USB ports on the robot are *3.1 SuperSpeed*, if this is a prerequisite of your camera.

It is highly recommended that you test the camera is, in fact, plug and play on another *Ubuntu* device before attempting to deploy to your *Double 3*.

> A camera with a fisheye lens is recommended to get the widest field-of-view behind the robot, but by no means the only option!

### 3. Prepare the mounting solution
There are 3 pre-existing mounting points on the *Double 3*; 2 on top of the head under the rubber bumper, and 1 behind the port cover on the back of the head. These support **❗INSERT SCREW HERE❗** screws.

Your exact mounting solution will depend on the camera you use, but a 3D printable, multi-purpose bracket for the top of the *Double 3* is [**✨available here✨**](). This attaches to the 2 top-most mounting points, and should allow most devices to be attached top, front, or back facing with additional parts/brackets/screws suitable for the hardware. 

However, you might want to use the rear mount point if possible, as this will allow you to keep the rubber bumper attached - which is useful in crashes!

>❗ Whilst going on this journey, consider the [extremely important weight limitations]() for mounted devices. 

Remove the plastic cover on the back of the *Double 3* to find the USB ports, mount the camera facing backwards, and plug it in.

The mounting solution for a fisheye USB camera module, using the aforementioned multi-purpose bracket, is shown for inspiration below.

![Placeholder image](img/placeholder.jpg)

### 4. Configure the robot
On the optional features page in the [new robot workflow](), refresh the device list and select the name of the plugged in camera. 

**Troubleshooting**
- If no devices appear when you refresh the list, ensure the camera is plugged in and refresh the robot interface using the grey refresh button on-screen. If this still doesn't work:
    - Try the other USB port on the back of the *Double 3*.
    - Ensure the camera does not require manual driver installation by testing it on another *Ubuntu* device.
- If both USB ports are occupied and you're unsure which is the camera due to unclear labels, either unplug the other device temporarily and refresh the list, or refer to the device documentation to find the name of the camera.

## Physical hand-raising
### 1. Prepare the actuation device
### 2. Prepare the mounting solution
The same advice applies as for [mounting the rear-view camera](), although you'll inevitably need to make some changes for this feature. A mounting method for the aforementioned *SwitchBot* is show below.

![Placeholder image](img/placeholder.jpg)

### 3. Configure the action in *IFTTT*
### 4. Configure the robot

## *IFTTT* smart actions
## *Microsoft Teams* presence cards