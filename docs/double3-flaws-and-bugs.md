# *Double 3* flaws and bugs
## Rationale
External development using the *Double 3* relies entirely on the company's [developer documentation and tools](), as the platform is simply too niche for a wider community to form. 

I am unaware of any third-party software for the robot **at all**, nevermind anything being used regularly. This page therefore documents the problems with *Double 3* development which couldn't be straightforwardly overcome, and were usually worked around, or stopped a feature in its tracks entirely. 

## Camera spawning
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

Whilst this 'works', there are other initial settings despatched when the robot view is first loaded, and I'm concerned that the camera feed issue isn't isolated. More ocassionally **I've noticed the performance mode doesn't change** (despite the attempt to make it *high* in code), which doesn't break the system persay, but slows it down.

> I can only assume there is some kind of internal command queue which is destructive when it gets too long, and/or commands have been there for a while. However, there is no documentation on this.

## Microphone array
The *Double 3* has 6 microphones in its head: 3 front facing, 2 back facing, and 2 on the sides within cupped plastic 'ears'. Despite this, the audio that reaches the stock endpoint appears to be mono at worst and primitively stereo if best, with no attempt to utilise the microphone array to create more directional sound. 

The 6 microphones appear as 3 separate stereo devices in Linux when attempting to spawn a `MediaStream`, grouped into front, back, and sides. It is therefore absolutely possible to process these 3 input devices into binaural directional sound with the right algorithm, *Double robotics* just didn't do it.

The only reasons I can rationalise why they didn't is either a boring development time constraint, or the *Double 3* [simply isn't powerful enough]() to process the streams into one and despatch them with low enough latency for the driver.