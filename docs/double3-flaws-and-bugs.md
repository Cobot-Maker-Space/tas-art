# *Double 3* flaws and bugs
External development using the *Double 3* relies entirely on the company's [developer documentation and tools](https://github.com/doublerobotics), as the platform is simply too niche for a wider community to form. 

I am unaware of any third-party software for the robot **at all**, nevermind anything being used regularly. This page therefore documents the problems with *Double 3* development which couldn't be straightforwardly overcome, and were usually worked around, or stopped a feature in its tracks entirely. 

## Camera spawning and 'dead' commands
The following command despatched to the `DRDoubleSDK` should expose a `v4l2` camera feed, available to the *Electron* browser window to convert to a `MediaStream`. It does do that - but only sometimes - and I haven't been able to distinguish a pattern.

```javascript
DRDoubleSDK.sendCommand('camera.enable', {
        'height': 1080,
        'template': 'v4l2'
    });
```

This is obviously integral to the functionality of the project, but there is no 'camera' event to subscribe to in order to confirm the `v4l2` feed has spawned. Therefore, the only effective workaround is to try and spawn a `MediaStream`, and catch it if (when) it fails. Reloading the page will resend the command to `DRDoubleSDK`, and after 2-4 times the camera eventually spawns.

```javascript
...
}).catch(err => {
    async function reload() {
        await delay(2000);
        location.reload();
    }
    reload();
});
```

Whilst this 'works', there are other initial settings despatched when the robot view is first loaded, and I'm concerned that the camera feed issue isn't isolated. More occasionally **I've noticed the performance mode doesn't change** (despite the attempt to make it *high* in code), which doesn't break the system per se, but slows it down.

As a result, there is also a refresh button on the standby screen of the robot interface, such that local users can manually refresh the page to try and fix any issues which arise. This is all obviously non-optimal.

> I can only assume there is some kind of internal command queue which is destructive when it gets too long, and/or commands have been there for a while. However, there is no documentation on this.

## Microphone array
The *Double 3* has 6 microphones in its head: 3 front facing, 2 back facing, and 2 on the sides within cupped plastic 'ears'. Despite this, the audio that reaches the stock endpoint appears to be mono at worst and primitively stereo if best, with no attempt to utilise the microphone array to create more directional sound. 

The 6 microphones appear as 3 separate stereo devices in Linux when attempting to spawn a `MediaStream`, grouped into front, back, and sides. It is therefore absolutely possible to process these 3 input devices into binaural directional sound with the right algorithm, *Double robotics* just didn't do it.

> The only reasons I can rationalise why they didn't is either a development time constraint, or the *Double 3* [simply isn't powerful enough](limitations-and-trade-offs#double-3-performance-and-network-bandwidth) to process the streams into one and despatch them with low enough latency for the driver.

## 'Highest' performance instability
As explained in the [battery life trade-off](limitations-and-trade-offs#battery-life), the *Double 3* has 4 available performance models. The *highest* of these allows all the CPU cores to hit maximum utilisation, amongst other adjustments.

In this mode, **the *Double 3* will sometimes crash entirely**; that is, the head will stop reporting a heartbeat to the developer interface. Sometimes it recovers from this after a short while (respawning multiple hardware and software elements), and other times a complete reboot will be needed.

The only way this can reasonably be mitigated is to make sure additional features don't (arbitrarily) demand 'too much' of the onboard processing. In the case of the [rear-view camera](system-configuration#rear-view-cameras) feature, this involved reducing the resolution of the streams. Or, optimally, unfortunately, just don't use the *highest* performance mode.

> CPU thermals can reach the low 70s°C when the room is approx. 21°C, and whilst the *NVIDIA Jetson* claims an operating temperature of up to 80°C, it may be programmed to throttle/bail entirely below that temperature. Alternatively, power draw from the USB port for the rear-view camera might be reducing the available power for the CPU. Or, it might be something else; *Double Robotics* self-proclaim that they don't really test these developer-only modes.

## Sensor calibration and spawning
Sometimes when the *Double 3* boots it repeatedly attempts and fails to respawn sensors, seemingly indefinitely. This is usually the front depth (*RealSense*) sensor, but can be the others, too. This is either a soft lock for features (e.g., click-to-drive) or a hard lock because the robot refuses to drive (due to insufficient data for collision avoidance). The *Double 3* needs to be rebooted until it eventually works.

Possibly worse, sometimes the sensors *do* spawn but are seemingly uncalibrated, such as the front depth sensor perceiving the floor as a slope. Sometimes this solves itself after a few reboots, and sometimes it's seemingly permanent, such as the current problem with the central ultrasonic sensor. The robot currently refuses to drive with collision avoidance enabled, as the central ultrasonic sensor reports a non-existent obstacle.

Whilst this only describes **the specific *Double 3* used for development**, it appears indicative of wider instability with the platform, as there were similar problems with the last *Double 3* head used.

> I expect that these problems are inherent, rather than caused by development and/or extended use. However, it is technically possible that the increased internal temperatures due to the higher performance modes used by the project could be the cause, if the internal cooling solution is inadequate. It is undoubtedly passive (no fans), and there isn't much ventilation; the back of the head gets very hot to the touch during operation.

## Dangerous docking
Approximately 10 times in the last year, the *Double 3* has slammed into the dock hard during its automatic docking process, rather than moving in slowly. When this happens, the stabilisation usually overcompensates backwards, then the robot slams forwards into the dock again; this continues with increasing ferocity until someone picks it up, or, presumably, it breaks itself.

This is obviously something going wrong algorithmically in stock software, which is abstracted away by the supplied development interface (and possibly inaccessible entirely; see [dangerous development](#dangerous-development) for why I haven't checked). The point is simply that if this happened in a wider deployment with no one local to save the robot, **this will definitely result in a broken *Double 3* at some point**.

## Dangerous development
The [*Double 3* developer documentation](https://github.com/doublerobotics/d3-sdk) lists a number of ways to deploy custom functionality, one of them being a native application. This is possible as the head is simply a *Ubuntu Linux* machine running on a *NVIDIA Jetson* system-on-module; you can even boot into the desktop GUI.

***However***, there is no inbuilt functionality to factory reset the *Double 3* software, nor the underlying operating system; the only 'supported' way is to send the head back to California. Therefore, developing anything native is very much playing with fire, unless you find a way to back-up the stock software and OS. 

This is unfortunate because native development would also be most powerful, with direct hardware access to the *Intel RealSense* cameras, etcetera. 