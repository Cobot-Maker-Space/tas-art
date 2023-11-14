# System configuration
## *Double 3* robots
### Description
Instructions for integration of actual *Double 3* robots into the system, such that users who log in can select from a list of robots to take control of and drive.
### 1. Developer mode
All *Double 3* robots must have developer mode enabled to be configured for this project. This requires you to contact *Double Robotics*.

> *"To enter developer mode, you must first link the D3 with your Double account, then email your head serial number to devteam@doublerobotics.com with a request to enable developer mode. After a security authorization, our team will enable developer mode and you will have complete root access."* ([source](https://github.com/doublerobotics/d3-sdk/blob/master/docs/Developer%20Mode.md))

### 1.5. Self-Signed Certificates (Optional)
If you wish to use a self signed TLS certificate to deploy the server-side software, then you will need to modify the on-board application. SSH into the robot and copy over the [main.js.patch file](assets/main.js.patch) to */usr/local/d3/gui* and then run patch: *patch -u -b main.js -i main.js.patch*.

### 2. Navigate to the settings
Log in to the website using an [admin account](deploying-the-project.md#admin-accounts) then navigate through:
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

*Configuration of the optional features ([rear-view](#rear-view-cameras), [hand-raising](#physical-hand-raising)) is explained below.*

## Rear-view cameras
### Description
With additional camera hardware, a rear-view can be given to drivers, which increases their spatial awareness and makes the driving experience a little smoother.

### 1. Do you really want to?
Whilst included and technically functional, **this feature is currently unstable** for multiple reasons (some outside of a third-party developer's control) as explained [here](limitations-and-trade-offs.md#double-3-performance-and-network-bandwidth) and [here](double3-flaws-and-bugs.md#highest-performance-instability). It should probably only be used in its current state for monitored use cases, such as trial deployments or studies.

### 2. Prepare the camera
The camera you use must be **plug-and-play via USB** in *Ubuntu* Linux. That is, it must not require manual driver or software installation in order to function.

Almost anything which is called a webcam by an established manufacturer will fall under this bracket; the USB ports on the robot are *3.1 SuperSpeed*, if this is a prerequisite of your camera.

It is highly recommended that you test the camera is, in fact, plug and play on another *Ubuntu* device before attempting to deploy to your *Double 3*.

> A camera with a fisheye lens is recommended to get the widest field-of-view behind the robot, but by no means the only option!

### 3. Prepare the mounting solution
There are 3 pre-existing mounting points on the *Double 3*; 2 on top of the head under the rubber bumper, and 1 behind the port cover on the back of the head.

Your exact mounting solution will depend on the camera you use, but a 3D printable, multi-purpose bracket for the top of the *Double 3* is [**✨available here✨**](assets). This attaches to the 2 top-most mounting points, and should allow most devices to be attached top, front, or back facing with additional parts/brackets/screws suitable for the hardware. 

However, you might want to use the rear mount point if possible, as this will allow you to keep the rubber bumper attached - which is useful in crashes!

>❗ Whilst going on this journey, consider the [extremely important weight limitations](limitations-and-trade-offs.md#accessory-weight-limitations) for mounted devices. 

Remove the plastic cover on the back of the *Double 3* to find the USB ports, mount the camera facing backwards, and plug it in.

### 4. Configure the robot
On the optional features page in the [new robot workflow](#double-3-robots), refresh the device list and select the name of the plugged in camera. 

**Troubleshooting**
- If no devices appear when you refresh the list, ensure the camera is plugged in and refresh the robot interface using the grey refresh button on-screen. If this still doesn't work:
    - Try the other USB port on the back of the *Double 3*.
    - Ensure the camera does not require manual driver installation by testing it on another *Ubuntu* device.
- If both USB ports are occupied and you're unsure which is the camera due to unclear labels, either unplug the other device temporarily and refresh the list, or refer to the device documentation to find the name of the camera.

## Physical hand-raising
### Description
A 'hand raise' button can be used in the driver interface to trigger an *IFTTT* event, intended to actuate something physical attached to the robot which will draw attention to the remote user in meetings, busy spaces, etcetera. 

### 1. Prepare the actuation device
There are multiple hardware paths you can take here, but the method of triggering the actuation must be the same: it must be the 'then' (action) of an *IFTTT* applet. Therefore, the configuration workflow is similar to [smart actions](#ifttt-smart-actions).

There are multiple off-the-shelf *IoT* solutions with *IFTTT* integration which would 'do the job' of physically attracting attention to the robot. A versatile option is a [*SwitchBot* and hub](https://uk.switch-bot.com/), or similar, as this allows you to attach something to the actuator which will move when triggered. Alternatively, you might consider an *IoT* light controller with your chosen low-power LEDs.

> Remember, even with a rear-view camera, there is a powered USB port on the back of the robot you could use for this feature.

If you want a truly custom solution, you could use a *Raspberry Pi* - powered by the *Double 3*! - and attach whatever you like for actuation to the GPIO connectors. A *Raspberry Pi* can receive *IFTTT* actions in a few ways, with *Webhook*s being the most popular. There are endless tutorials on this. 

### 2. Prepare the mounting solution
The same advice applies as for [mounting the rear-view camera](#rear-view-cameras), although you'll inevitably need to make some changes for this feature. A mounting method for the aforementioned *SwitchBot* is show below, but your methodology will be unique if you use different hardware.

### 3. Configure the action in *IFTTT*
Follow the instructions for [smart actions](#ifttt-smart-actions) to create an *IFTTT* account and configure an applet. The trigger will be a *Webhook*, as explained in the article, and the action will by whatever actuates your hand-raising hardware.

### 4. Configure the robot
Enter the *IFTTT* webhook URL in the [new robot workflow](#double-3-robots), on the last page. This is slightly less streamlined than the smart actions workflow, but the full link can easily be deciphered via the [documentation page](https://ifttt.com/maker_webhooks) on the *IFTTT* website.

## *IFTTT* smart actions
### Description
A smart action, in the context of this project, is an AR interaction facilitated by a fiducial marker and made by a driver which triggers *IoT* service(s) and/or device(s) via [*IFTTT*](https://ifttt.com/) middleware. For example, a driver may turn on a smart lightbulb by interacting with a marker next to a light switch. 

### 1. Solve your problem with *IFTTT*-compatible *IoT*
Before beginning the workflow, analyse the problem (e.g., closed doors) and confirm an *IFTTT*-compatible solution (e.g., internet-connected door openers). 

Set up the hardware and/or services and confirm they work via the supplied proprietary communication (such as the *TpLink Kasa* app, for smart bulbs), **before** attempting to configure the *IFTTT* applet.

### 2. Navigate to the settings
Log in to the website using an [admin account](deploying-the-project.md#admin-accounts) then navigate through:
```
⚙️ -> 🎬 Smart actions -> ✨ New smart action
```

### 3. Prepare and configure graphics
Name the smart action something meaningful; this will never be driver-facing, but allows you to organise your smart actions in the admin interface properly.

Prepare and upload the driver-facing graphics. The **fiducial marker center** should ideally be related to the action (e.g., a light bulb for a light switch), but is not a requirement by any means. The inner image **must be as high contrast and unique as possible**, ideally black and white, and *simple*; we're talking about an abstract icon of a light bulb, not an actual picture of a real light bulb. 

The **interactive icon and confirmation icon** can utilise transparency, and should clearly convey the functionality of the interaction to the driver; they should be as intuitive as possible. The confirmation icon may be as simple as a colour change, or could be more tightly integrated with the action, such as a transition from a static bell to a 'ringing' bell.  

### 4. Configure the *IFTTT* applet
Follow the instructions in the multi-page form to configure your *IFTTT* account and applet. It's a good idea to save your *Webhook* key so you don't have to find it again, and **this must be kept private** to prevent malicious parties triggering your *IoT* events!

## *Microsoft Teams* presence cards
### Description
Presence cards allow the user to see who an office/desk belongs to, their profile picture, their *Teams* activity, and to send them a message seamlessly in-interface. This operates within the organization the project is set up with; [see here](deploying-the-project.md#organization-assignment) for more details.

### Custom configuration
> ❗ UI-only presence card configuration has not been implemented in the admin interface yet, though it is [wholly possible](#advice-for-admin-interface-implementation). These are the steps to configure presence cards manually.

**UUIDv4**: Generate a fiducial marker to the `.patt` requirements of *AR.js*, which can be easily done on [this website](https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html), and place it on the server at `ar -> assets -> fiducial` with [a Version 4 UUID](https://www.uuidgenerator.net/) as the filename. Print out the associated fiducial marker and use as normal.

**msID**: The *Microsoft Teams* ID of the user associated with the new presence card. The easiest way to find this manually is to log in to the [*Microsoft Graph* Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) and query the `/users` endpoint with the [$filter](https://docs.microsoft.com/en-us/graph/query-parameters) modifier to select by `displayName`.

**chatID**: The *Microsoft Teams* [chat ID](https://docs.microsoft.com/en-us/graph/api/resources/chatmessage?view=graph-rest-1.0) which the message should be sent to, presumably the `oneOnOne` chat the user has with the user defined above, but it could be a group channel too. The easiest way to find this is also the [*Microsoft Graph* Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer), but via the `/chats` endpoint, and using `$expand=members` so you can `$filter` effectively. ❗ **Note!** The messages sent via the AR interface will come from whichever account is used to search *Microsoft Graph*.

Add a new entry to `ms_office_cards` in db.js with the following structure.
```json
"[UUIDv4]": {
      "ms_id": "[msID]",
      "chat_id": "[chatID]"
    }
```

### Advice for admin interface implementation
This is mostly complexified by the way *Microsoft Graph* works; particularly, you cannot simply message a user in the organization by their ID, but rather you must message an actual [chat](https://docs.microsoft.com/en-us/graph/api/resources/chatmessage?view=graph-rest-1.0) by *its* ID.

As the chat ID is unique for each user/user combo, there is no such thing as a 'global' chat ID, in the way that the aforementioned section implies. As such, there are two directions you could take.

- *Make* the chat ID 'unique' de facto, by sending all AR messages from one account; either a specific account set-up for this which people will recognise, or the *Azure* app itself.
- For each user who logs in and attempts to send a message to a user via a presence card, query their `oneOnOne` chat data to attempt to find their chat with the user, or create a new one if it doesn't exist. This would negate the need for the field in the database and require more development.

Despite this complexity, the name, picture, and presence status within this feature is associated with an actual in-organization user. As such, this needs to be defined in the admin workflow. I suggest the following (approximate) approach.

1. Ask the admin to search for a user by name or email, then select the correct user from the list.
2. *Handle definition of the chat ID per your chosen approach; if you're going the 'global' route, it can be automatically found at this stage, or it will be founnd during runtime later for the 'local' route.*
3. Automatically generate a fiducial marker for the presence card, and allow the admin to print it out.
4. Provide a list of all 'active' presence cards, for the admin to delete, and edit, per their requirements.
