# Limitations and trade-offs
This documents the limitations and trade-offs of the project, either as a result of the implementation itself or the limitations of the *Double 3* hardware and software. This may inform any decision(s) regarding continued development, and where expansion might be best.

## Battery life
The *Double 3* can deploy 1 of 4 performance models, ranging from **lowest** to **highest**. To the best of my knowledge, this effects the number of active CPU cores, and the clock speeds of the CPU cores and the GPU. Both the CPU and GPU are in the so-called *head*, and this setting does not effect the *base* in any way.

The [stock *Double 3* endpoint](https://drive.doublerobotics.com/) is optimised to work with the **lowest** performance model.

With the added functionality in this project, the processing load is higher than the stock *Double 3* endpoint. As such, **high** performance is enabled for single-camera operation, and the **highest** performance is enabled with the addition of a [rear-view camera]().

This measurably reduces battery life. The **average time** taken to drain the battery from **100%** to **90%** across 3 scenarios is listed below. Each scenario was tested 3 times; the *Double 3* was left parked during a call (i.e., not driven) during each test.

| Endpoint | Performance mode | 100%-90% drain time |
| -------- | ---------------- | ------------------- |
| *Stock*  | *Lowest*         | *17m 14s*           |
| ART      | High (1 cam)     | 14m 32s             |
| ART      | Highest (2 cams) | 13m 45s             |

## *Double 3* performance and network bandwith
It's worth explicating that the reason the *Double 3*'s CPU and GPU performance becomes a problem is that normal internet connections can only reasonably be expected to maintain one stable, full HD (1920x1080), two-way *WebRTC* connection at a time. 

For example, the [rear-view feature]() combines the two webcam views into one `MediaStream` onboard the robot, as the alternative would be increasing the bandwidth requirements (i.e., two `MediaStream`s) for both the drivers and collaborative spaces using the system. But, as aforementioned, this brings the CPU usage to a point where further feature expansion would be challenging.

## Accessory weight limitations
The *Double 3* has three mounting screw holes in its *head*, two on the very top under the rubber guard, and one behind the port cover on the back.

The [mounting bracket]() supplied in this documentation attaches to the two upmost screw holes.

Objects rigidly attached this bracket, seemingly regardless of placement in reference to the centre of gravity, risk making the *Double 3* **dangerously unstable** if they weigh in excess of approximately **0.6kg** (excluding the bracket). This was tested in 0.1kg increments.

The 'point-of-failure' is the stability of the *head* itself, which starts violently vibrating when tolerances are exceeded, seemingly to the point of structural damage were it be allowed to continue.

> A possible solution for greater weights might be to attach accessories to the pole connecting the *head* and *base* via a clamp, whereby the lower they are, the more stable the robot will be. 