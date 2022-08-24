# System configuration
## *Double 3* robots
### 1. Developer mode
All *Double 3* robots must have developer mode enabled to be configured for this project. This requires you to contact *Double Robotics*:

> ([source](https://github.com/doublerobotics/d3-sdk/blob/master/docs/Developer%20Mode.md)) To enter developer mode, you must first link the D3 with your Double account, then email your head serial number to devteam@doublerobotics.com with a request to enable developer mode. After a security authorization, our team will enable developer mode and you will have complete root access.

### 2. Admin interface
Log in to the website using an [admin account]() then navigate through:
```
⚙️ -> 🤖 Robot manager -> ✨ New robot
```

### 3. Follow configuration steps
The information necessary to complete configuration is explained in the multi-page form.

**Troubleshooting**
- If there is an error when entering the display name and/or location, try again with A-Z and spaces only.
- If you cannot find the IP address of your *Double 3* via the default on-robot display, `arp -a` on the windows command line will show everything on the network - try them all :) 
- If you cannot access the Developer Monitor despite finding the IP address, port 8080 may be blocked by your network.
- If the robot will not activate but the display name appears on the robot screen, tap the grey refresh button on the robot display and try again.

*Configuration of the optional features ([rear-view](), [hand-raising]()) is explained below.*

## Rear-view cameras
### 1. Do you really want to?
Whilst included and technically functional, **this feature is currently unstable** for multiple reasons (some outside of a third-party developer's control) as explained [here]() and [here](). It should probably only be used in its current state for monitored use cases, such as trial deployments or studies.

## Physical hand-raising
## *IFTTT* smart actions
## *Microsoft Teams* presence cards