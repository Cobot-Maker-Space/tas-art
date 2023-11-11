import config from "config";
import util from "util";

// password and uuid utilities
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";

// database and file utilities
import { LowSync, JSONFileSync } from "lowdb";
import { join, dirname } from "path";
import cors from "cors";
import fs from "fs";

// routing and data abstractions
import express from "express";
import http from "http";
import https from "https";
import fetch from "node-fetch";
import favicon from "serve-favicon";
import expressFileupload from "express-fileupload";
import greenlock from "greenlock-express";
import bodyParser from "body-parser";

// server utilities
import { get } from "https";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

// microsoft utility
import * as Queries from "./public/ms-queries.js";

// absolute path to dir
const __dirname = dirname(fileURLToPath(import.meta.url));

// server instantiation
const app = express();

// server configuration
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(favicon(join(__dirname, "public", "/assets/favicon.ico")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressFileupload());
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// database configuration
const file = join(__dirname, "db/db.json");
if (!fs.existsSync(file)) {
  fs.appendFileSync(file, JSON.stringify({
    admins: [],
    robots: [],
    smart_actions: [],
  }));
}
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();

// utility functions
function hashedPwd(pwd) {
  const sha256 = crypto.createHash("sha256");
  const hash = sha256.update(pwd).digest("base64");
  return hash;
}
function newAuthToken() {
  return crypto.randomBytes(36).toString("hex");
}
function getBaseUrl(req) {
  return util.format("%s://%s", req.protocol, req.hostname);
}

var activeRobots = {};

// volatile record of logged in users
var adminAuthTokens = {};
var driverAuthTokens = {};

// volatile data of logged in users
var activeUsers = {};
var connectedUsers = {};

function socketWorker(server, listen_callback) {
  const io = new Server(server);

  // socket communication (incl. webRTC)
  io.on("connection", (socket) => {
    socket.on("robot-alive", (robotId) => {
      activeRobots[socket.id] = robotId;
    });
    // webRTC establishment
    socket.on("join-robot", (robotId, userId) => {
      socket.join(robotId);
      socket.broadcast.emit("user-connected", userId);
      socket.on("disconnect", () => {
        socket.broadcast.emit("user-disconnected", userId);
      });
    });
    // driver -> robot control message
    socket.on("control-msg", (msg, robotId) => {
      var message = {
        target: robotId,
        content: msg,
      };
      io.emit("control-msg", message);
    });
    // driver -> robot click-to-drive message
    socket.on("click-to-drive", (x, y, att, robotId) => {
      var message = {
        target: robotId,
        attempt: att,
        xCoord: x,
        yCoord: y,
      };
      io.emit("click-to-drive", message);
    });
    // robot -> driver health message (e.g., battery)
    socket.on("health-msg", (flavour, filling, robotId) => {
      var message = {
        target: robotId,
        type: flavour,
        status: filling,
      };
      io.emit("health-msg", message);
    });
    // ifttt event trigger
    socket.on("ifttt-event", (url) => {
      get(url);
    });
    // microsoft options
    socket.on("get-office-card", (robotId, msUserId) => {
      async function fetchOfficeCard() {
        const otherUserData = await fetch(
          Queries.getOtherUserDataURL(msUserId),
          Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)
        ).then((response) => response.json());
        const otherUserPhoto = await fetch(
          Queries.getOtherUserPhotoURL(msUserId),
          Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)
        ).then((response) => response.body);
        const otherUserPresence = await fetch(
          Queries.getUserPresenceURL(msUserId),
          Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)
        ).then((response) => response.json());
        otherUserPhoto.pipe(
          fs.createWriteStream(
            join(__dirname, "public", "/photos/" + msUserId + ".png")
          )
        );
        io.emit("office-card", {
          robotId: robotId,
          name: otherUserData.displayName,
          presence: otherUserPresence.availability,
        });
      }
      fetchOfficeCard();
    });
    socket.on("chat-msg", (robotId, chat, msg) => {
      fetch(
        Queries.sendChatURL(chat),
        Queries.sendChatBody(
          activeUsers[connectedUsers[robotId]].access_token,
          msg
        )
      );
    });

    // robot set-up
    socket.on("get-media-devices", (robotId) => {
      console.log("Getting media devices from: " + robotId);
      io.emit("get-media-devices", robotId);
    });
    socket.on("media-devices", (devices) => {
      console.log("Emitting media devices: " + devices);
      io.emit("media-devices", devices);
    });

    socket.on("check-robot-life", (robotId) => {
      console.log(Object.values(activeRobots));
      console.log(decodeURIComponent(robotId));
      if (
        Object.values(activeRobots).includes(
          decodeURIComponent(robotId).replace(/ /g, "+")
        )
      ) {
        socket.emit("robot-alive", robotId);
      } else {
        socket.emit("robot-dead", robotId);
      }
    });

    // disconnect
    socket.on("disconnect", (reason) => {
      io.emit("robot-disconnected", activeRobots[socket.id]);
      delete connectedUsers[activeRobots[socket.id]];
      delete activeRobots[socket.id];
    });
  });

  listen_callback(server);
}

/*greenlock
  .init({
    packageRoot: __dirname,
    configDir: "./greenlock.d",
    maintainerEmail: config.get("tls.greenlock.subscriber_email"),
    cluster: false,
  })
  .ready((glx) => {
    socketWorker(glx.httpsServer(), () => { glx.serveApp(app); })
  });*/
var httpServer = http.createServer(app);
socketWorker(httpServer, (server) => {
  server.listen(80);
});

// route precedent to collect cookie(s) from browser for auth
app.use((req, res, next) => {
  const authToken = req.cookies["AuthToken"];
  if (driverAuthTokens[authToken]) {
    req.driverId = driverAuthTokens[authToken];
    if (adminAuthTokens[authToken]) {
      req.adminId = adminAuthTokens[authToken];
    }
  }
  next();
});

app.get("/", (req, res) => {
  if (req.driverId) {
    res.redirect("/select");
  }
  res.render("login", {
    inst: config.get("organization.display_name"),
    error: req.query.error,
  });
});

// ms login and logout handling
app.get("/ms-login", (req, res) => {
  res.redirect(Queries.login(getBaseUrl(req)));
});

app.get("/ms-logout", (req, res) => {
  delete adminAuthTokens[req.cookies["AuthToken"]];
  delete driverAuthTokens[req.cookies["AuthToken"]];
  delete activeUsers[req.driverId];
  res.redirect(Queries.logout(getBaseUrl(req)));
});

app.get("/ms-socket", (req, res) => {
  async function fetchUserData() {
    const loginData = await fetch(
      Queries.requestTokenURL(),
      Queries.requestTokenBody(req.query.code, getBaseUrl(req))
    ).then((response) => response.json());
    if (loginData.error != undefined) {
      res.redirect("/?error=user");
      return;
    }

    const userData = await fetch(
      Queries.getUserDataURL(),
      Queries.getDataBody(loginData.access_token)
    ).then((response) => response.json());
    const photoData = await fetch(
      Queries.getUserPhotoURL(),
      Queries.getDataBody(loginData.access_token)
    ).then((response) => response.body);

    photoData.pipe(
      fs.createWriteStream(
        join(__dirname, "public", "/photos/" + userData.id + ".png")
      )
    );
    db.read();
    var authToken = newAuthToken();
    activeUsers[userData.id] = {
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token,
      name: userData.displayName,
      email: userData.mail,
    };
    driverAuthTokens[authToken] = userData.id;
    if (db.data.admins.length < 1) {
      db.data.admins.push(userData.id);
      db.write();
    }
    if (db.data.admins.includes(userData.id)) {
      adminAuthTokens[authToken] = userData.id;
    }
    res.cookie("AuthToken", authToken);
    res.redirect("/select");
  }
  fetchUserData();
});

// robot selection
app.get("/select", (req, res) => {
  if (req.driverId) {
    db.read();
    res.render("select", {
      id: req.driverId,
      name: activeUsers[req.driverId].name,
      inst: config.get("organization.display_name"),
      admin: req.adminId ? "true" : "false",
      robots: db.data.robots,
      activeRobots: Object.values(activeRobots),
      error: req.query.error,
    });
  } else {
    res.redirect("/");
  }
});

// admin landing page
app.get("/admin-dashboard", (req, res) => {
  if (req.adminId) {
    db.read();
    res.render("admin-dashboard", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
    });
  } else {
    res.redirect("/");
  }
});

// admin manage robots
app.get("/manage-robots", (req, res) => {
  if (req.adminId) {
    db.read();
    res.render("manage-robots", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      activeRobots: db.data.robots,
      baseURL: "https://" + req.get("host") + "/",
    });
  } else {
    res.redirect("/");
  }
});
app.post("/delete-robot/:uuid", (req, res) => {
  delete db.data.robots[decodeURIComponent(req.params.uuid)];
  db.write();
  res.redirect("/manage-robots");
});

app.get("/new-robot-details", (req, res) => {
  if (req.adminId) {
    res.render("new-robot-details", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
    });
  } else {
    res.redirect("/");
  }
});
app.post("/submit-robot-details", (req, res) => {
  const { name, location } = req.body;
  var uuid = uuidv4();
  var publicid = hashedPwd(uuid);

  db.data.robots[hashedPwd(uuid)] = {
    private: uuid,
    name: name,
    location: location,
    reverseCamLabel: null,
    handRaiseWebhook: null,
  };
  db.write();

  res.redirect(
    "/new-robot-activate?publicid=" +
      publicid +
      "&uuid=" +
      uuid +
      "&name=" +
      name +
      "&location=" +
      location
  );
});

app.get("/new-robot-activate", (req, res) => {
  if (req.adminId) {
    res.render("new-robot-activate", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      baseURL: "https://" + req.get("host") + "/",
      robotPublicId: req.query.publicid,
      robotUuid: req.query.uuid,
      robotName: req.query.name,
      robotLocation: req.query.location,
    });
  } else {
    res.redirect("/");
  }
});

app.get("/new-robot-optional", (req, res) => {
  if (req.adminId) {
    res.render("new-robot-optional", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      robotPublicId: req.query.publicid,
      robotUuid: req.query.uuid,
      robotName: req.query.name,
      robotLocation: req.query.location,
    });
  } else {
    res.redirect("/");
  }
});
app.post("/submit-robot-optional", (req, res) => {
  db.read();
  var publicid = decodeURIComponent(req.body.publicid).replace(/ /g, "+");
  if (req.body.selectDevice != undefined) {
    db.data.robots[publicid].reverseCamLabel = req.body.selectDevice;
  }
  if (req.body.webhook != undefined) {
    db.data.robots[publicid].handRaiseWebhook = req.body.webhook;
  }
  db.write();
  res.redirect("/manage-robots");
});

// admin manage smart actions
app.get("/smart-actions", (req, res) => {
  if (req.adminId) {
    db.read();
    res.render("smart-actions", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      smartActions: db.data.smart_actions,
    });
  } else {
    res.redirect("/");
  }
});
app.post("/delete-smart-action/:uuid", (req, res) => {
  fs.unlinkSync("public/ar/assets/fiducial/" + req.params.uuid + ".patt");
  fs.unlinkSync("public/ar/assets/ar-icon/" + req.params.uuid + ".png");
  fs.unlinkSync("public/ar/assets/ar-icon-confirm/" + req.params.uuid + ".png");
  fs.unlinkSync("public/ar/assets/marker/" + req.params.uuid + ".pdf");

  db.read();
  delete db.data.smart_actions[req.params.uuid];
  db.write();

  res.redirect("/smart-actions");
});
app.get("/smart-action-upload", (req, res) => {
  if (req.adminId) {
    res.render("smart-action-upload", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
    });
  } else {
    res.redirect("/");
  }
});
app.post("/smart-action-upload", (req, res) => {
  const name = req.body.name;
  const pattern = req.files.patternFile;
  const print = req.files.markerPrint;
  const arIcon = req.files.arIcon;
  const arIconC = req.files.arIconConfirm;

  const uuid = uuidv4();
  pattern.mv("public/ar/assets/fiducial/" + uuid + ".patt");
  print.mv("public/ar/assets/marker/" + uuid + ".pdf");
  arIcon.mv("public/ar/assets/ar-icon/" + uuid + ".png");
  arIconC.mv("public/ar/assets/ar-icon-confirm/" + uuid + ".png");

  db.read();
  db.data.smart_actions[uuid] = {
    name: name,
    webhook: null,
  };
  db.write();

  res.end();
});

app.get("/smart-action-ifttt", (req, res) => {
  if (req.adminId) {
    db.read();
    res.render("smart-action-ifttt", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      actionUuid: Object.keys(db.data.smart_actions).at(-1),
      actionName:
        db.data.smart_actions[Object.keys(db.data.smart_actions).at(-1)].name,
      instKey: db.data.organization.webhookKey,
    });
  } else {
    res.redirect("/");
  }
});
app.post("/smart-action-ifttt", (req, res) => {
  const actionUuid = req.body.actionUuid;
  const actionName = req.body.actionName;
  const webhookKey = req.body.key;
  const eventName = req.body.eventName;

  db.read();
  if (req.body.remember != undefined) {
    db.data.organization.webhookKey = webhookKey;
  }
  console.log(actionUuid);
  db.data.smart_actions[actionUuid].webhook =
    "https://maker.ifttt.com/trigger/" + eventName + "/with/key/" + webhookKey;

  db.write();

  res.redirect(
    "/smart-action-print?uuid=" + actionUuid + "&name=" + actionName
  );
});

app.get("/smart-action-print", (req, res) => {
  if (req.adminId) {
    res.render("smart-action-print", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
      actionUuid: req.query.uuid,
      actionName: req.query.name,
    });
  } else {
    res.redirect("/");
  }
});

app.get("/presence-cards", (req, res) => {
  if (req.adminId) {
    res.render("presence-cards", {
      id: req.adminId,
      name: activeUsers[req.adminId].name,
      inst: config.get("organization.display_name"),
    });
  } else {
    res.redirect("/");
  }
});

app.get("/robot/:uuid", (req, res) => {
  db.read();
  if (db.data.robots[hashedPwd(req.params.uuid)] != null) {
    res.render("robot", {
      robotId: hashedPwd(req.params.uuid),
      reverseCamLabel:
        db.data.robots[hashedPwd(req.params.uuid)].reverseCamLabel,
      robotName: db.data.robots[hashedPwd(req.params.uuid)].name,
      config: config,
    });
  } else {
    res.redirect("/");
  }
});

app.get("/:uuid", (req, res) => {
  if (req.driverId) {
    db.read();
    connectedUsers[req.params.uuid] = req.driverId;
    res.render("driver", {
      robotId: req.params.uuid,
      robotName: db.data.robots[req.params.uuid].name,
      handRaiseWebhook: db.data.robots[req.params.uuid].handRaiseWebhook,
      robotLocation: db.data.robots[req.params.uuid].location,
      smartActionsData: JSON.stringify(db.data.smart_actions),
      officeCardsData: JSON.stringify(db.data.ms_office_cards),
      config: config,
    });
  } else {
    res.redirect("/");
  }
});
