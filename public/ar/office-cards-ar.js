export function initModelling(officeCards, markerRoots, socket) {

    Object.keys(officeCards).forEach(function (uuid) {

        const msPanel = new ThreeMeshUI.Block({
            width: 2,
            height: 1.5,
            padding: 0.2,
            borderRadius: 0.15,
            borderWidth: 0.05,
            borderColor: new THREE.Color(0xFFFFFF),
            borderOpacity: 0.5,
            fontFamily: '/assets/Roboto-msdf.json',
            fontTexture: '/assets/Roboto-msdf.png',
            justifyContent: 'center',
            textAlign: 'left',
        });

        msPanel.rotateX(-1.5708);

        socket.emit("get-office-card", officeCards[uuid].ms_id);

        socket.on("office-card", info => {

            var text;
            var colour;
            var icon;

            switch (info.presence.toLowerCase()) {
                case ("available" || "availableidle"):
                    text = "Available";
                    colour = new THREE.Color(0x93c353);
                    icon = "/ar/assets/presence/ms-available.png";
                    break;
                case ("away" || "berightback"):
                    text = "Away";
                    colour = new THREE.Color(0xfcd116);
                    icon = "/ar/assets/presence/ms-away.png";
                    break;
                case ("busy" || "busyidle"):
                    text = "Busy";
                    colour = new THREE.Color(0xc4314b);
                    icon = "/ar/assets/presence/ms-busy.png";
                    break;
                case ("donotdisturb"):
                    text = "Do not disturb";
                    colour = new THREE.Color(0xc4314b);
                    icon = "/ar/assets/presence/ms-dnd.png";
                    break;
                case ("offline" || "presenceunknown"):
                    text = "Offline";
                    colour = new THREE.Color(0x9c9c9c);
                    icon = "/ar/assets/presence/ms-offline.png";
                    break;
                default:
                    text = "Error";
                    colour = new THREE.Color(0x9c9c9c);
                    icon = "/ar/assets/presence/ms-offline.png";
                    break;
            }

            const loader = new THREE.TextureLoader();
            loader.load(icon, (texture) => {
                console.log(info.displayName);
                const nameText = new ThreeMeshUI.Text({
                    content: info.name + "\n",
                    fontSize: 0.25,
                });
                msPanel.add(nameText);

                const iconBlock = new ThreeMeshUI.InlineBlock({
                    borderRadius: 0,
                    borderWidth: 0,
                    height: 0.15,
                    width: 0.15,
                    backgroundTexture: texture
                });
                msPanel.add(iconBlock);

                const presenceText = new ThreeMeshUI.Text({
                    content: " " + text + "\n",
                    fontColor: colour,
                    fontSize: 0.2,
                });
                msPanel.add(presenceText);

                const buttonText = new ThreeMeshUI.Text({
                    content: "\nClick to knock",
                    fontColor: new THREE.Color(0x87C1FF),
                    fontSize: 0.15,
                });
                msPanel.add(buttonText);
            });
            markerRoots[uuid].add(msPanel);
        });

        markerRoots[uuid].callback = function () {
            socket.emit("chat-msg", officeCards[uuid].chat_id, "Hi, I'm outside your office using a telepresence robot. Could we have a chat?");
        };
    });
}