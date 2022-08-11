// greenlock subscriber
const greenlockSubscriberEmail = "psyip1@nottingham.ac.uk";

// password and uuid utilities
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';

// database and file utilities
import { LowSync, JSONFileSync } from 'lowdb';
import { join, dirname } from 'path';
import cors from 'cors';
import fs from 'fs';

// routing and data abstractions
import express from 'express';
import fetch from 'node-fetch';
import favicon from 'serve-favicon';
import expressFileupload from 'express-fileupload';
import greenlock from 'greenlock-express';
import bodyParser from 'body-parser';

// server utilities
import { createServer, get } from 'https';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// microsoft utility
import * as Queries from './public/ms-queries.js';

// absolute path to dir
const __dirname = dirname(fileURLToPath(import.meta.url));

// server instantiation
const app = express();
// const server = createServer(app);

// server configuration
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(favicon(join(__dirname, 'public', '/assets/favicon.ico')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressFileupload());
app.use(cookieParser());
app.use(cors({ origin: '*' }));

// database configuration
const file = join(__dirname, 'db/db.json');
const adapter = new JSONFileSync(file);
const db = new LowSync(adapter);
db.read();

// utility functions
function hashedPwd(pwd) {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(pwd).digest('base64');
    return hash;
};
function newAuthToken() {
    return crypto.randomBytes(36).toString('hex');
}
function deleteElement(array, value) {
    return array.filter(function (x) {
        return x != value;
    });
};

var activeRobots = {};

// volatile record of logged in users
var adminAuthTokens = {};
var driverAuthTokens = {};

// volatile data of logged in users
var activeUsers = {};
var connectedUsers = {};

greenlock.init({
    packageRoot: __dirname,
    configDir: "./greenlock.d",
    maintainerEmail: greenlockSubscriberEmail,
    cluster: false
}).ready(socketWorker);

function socketWorker(glx) {
    var server = glx.httpsServer();
    const io = new Server(server);

    // socket communication (incl. webRTC)
    io.on('connection', socket => {
        socket.on('robot-alive', robotId => {
            activeRobots[socket.id] = robotId;
        });
        // webRTC establishment
        socket.on('join-robot', (robotId, userId) => {
            socket.join(robotId);
            socket.broadcast.emit('user-connected', userId);
            socket.on('disconnect', () => {
                socket.broadcast.emit('user-disconnected', userId);
            });
        });
        // driver -> robot control message
        socket.on('control-msg', (msg, robotId) => {
            var message = {
                target: robotId,
                content: msg
            };
            io.emit('control-msg', message);
        });
        // driver -> robot click-to-drive message
        socket.on('click-to-drive', (x, y, att, robotId) => {
            var message = {
                target: robotId,
                attempt: att,
                xCoord: x,
                yCoord: y
            };
            io.emit('click-to-drive', message);
        });
        // robot -> driver health message (e.g., battery)
        socket.on('health-msg', (flavour, filling, robotId) => {
            var message = {
                target: robotId,
                type: flavour,
                status: filling,
            };
            io.emit('health-msg', message);
        });
        // ifttt event trigger
        socket.on('ifttt-event', (url) => {
            get(url);
        });
        // microsoft options
        socket.on('get-office-card', (robotId, msUserId) => {
            async function fetchOfficeCard() {
                const otherUserData = await fetch(
                    Queries.getOtherUserDataURL(msUserId),
                    Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)).then(response => response.json());
                const otherUserPhoto = await fetch(
                    Queries.getOtherUserPhotoURL(msUserId),
                    Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)).then(response => response.body);
                const otherUserPresence = await fetch(
                    Queries.getUserPresenceURL(msUserId),
                    Queries.getDataBody(activeUsers[connectedUsers[robotId]].access_token)).then(response => response.json());
                otherUserPhoto.pipe(fs.createWriteStream(join(__dirname, "public", "/photos/" + msUserId + ".png")));
                io.emit("office-card", { "robotId": robotId, "name": otherUserData.displayName, "presence": otherUserPresence.availability });
            }
            fetchOfficeCard();
        });
        socket.on('chat-msg', (robotId, chat, msg) => {
            fetch(Queries.sendChatURL(chat), Queries.sendChatBody(activeUsers[connectedUsers[robotId]].access_token, msg));
        });
        // disconnect
        socket.on('disconnect', reason => {
            io.emit('robot-disconnected', activeRobots[socket.id]);
            delete connectedUsers[activeRobots[socket.id]];
            delete activeRobots[socket.id];
        });
    });

    glx.serveApp(app);
};

// route precedent to collect cookie(s) from browser for auth
app.use((req, res, next) => {
    const authToken = req.cookies['AuthToken'];
    if (driverAuthTokens[authToken]) {
        req.driverId = driverAuthTokens[authToken];
        if (adminAuthTokens[authToken]) {
            req.adminId = adminAuthTokens[authToken];
        }
    };
    next();
});

app.get('/', (req, res) => {
    if (req.driverId) {
        res.redirect('/select');
    };
    db.read();
    res.render('login', {
        inst: db.data.organization.displayName,
        error: req.query.error
    });
});


// ms login and logout handling
app.get('/ms-login', (req, res) => {
    db.read();
    res.redirect(Queries.login(db.data.organization.id));
});

app.get('/ms-logout', (req, res) => {
    db.read();

    delete adminAuthTokens[req.cookies['AuthToken']];
    delete driverAuthTokens[req.cookies['AuthToken']];
    delete activeUsers[req.driverId];

    res.redirect(Queries.logout(db.data.organization.id));
});

app.get('/ms-socket', (req, res) => {
    db.read();
    async function fetchUserData() {
        const loginData = await fetch(
            Queries.requestTokenURL(db.data.organization.id),
            Queries.requestTokenBody(req.query.code)).then(response => response.json());
        if (loginData.error != undefined) {
            res.redirect('/?error=user');
            return;
        }

        const userData = await fetch(
            Queries.getUserDataURL,
            Queries.getDataBody(loginData.access_token)).then(response => response.json());
        const photoData = await fetch(
            Queries.getUserPhotoURL,
            Queries.getDataBody(loginData.access_token)).then(response => response.body);

        photoData.pipe(fs.createWriteStream(join(__dirname, "public", "/photos/" + userData.id + ".png")));
        db.read();
        var authToken = newAuthToken();
        activeUsers[userData.id] = {
            access_token: loginData.access_token,
            refresh_token: loginData.refresh_token,
            name: userData.displayName,
            email: userData.mail
        }
        driverAuthTokens[authToken] = userData.id;
        if (db.data.admins.length < 1) {
            db.data.admins.push(userData.id);
            db.write();
        }
        if (db.data.admins.includes(userData.id)) {
            adminAuthTokens[authToken] = userData.id;
        }
        res.cookie('AuthToken', authToken);
        res.redirect('/select');
    }
    fetchUserData();
});

// robot selection
app.get('/select', (req, res) => {
    if (req.driverId) {
        db.read();
        res.render('select', {
            id: req.driverId,
            name: activeUsers[req.driverId].name,
            inst: db.data.organization.displayName,
            admin: req.adminId ? "true" : "false",
            robots: db.data.robots,
            activeRobots: Object.values(activeRobots),
            error: req.query.error
        });
    } else {
        res.redirect('/');
    };
});

// admin landing page
app.get('/admin-dashboard', (req, res) => {
    if (req.adminId) {
        db.read();
        res.render('admin-dashboard', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName
        });
    } else {
        res.redirect('/');
    };
});

// admin manage drivers
app.get('/manage-drivers', (req, res) => {
    if (req.adminId) {
        db.read();
        res.render('manage-drivers', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName,
            activeInvites: db.data.active_invites,
            activeDrivers: db.data.drivers
        });
    } else {
        res.redirect('/');
    };
});
app.post('/generate-invite', (req, res) => {
    db.data.active_invites.push(uuidv4());
    db.write();
    res.redirect('/manage-drivers');
});
app.post('/delete-invite/:invite', (req, res) => {
    db.data.active_invites = deleteElement(db.data.active_invites, req.params.invite);
    db.write();
    res.redirect('/manage-drivers');
});
app.post('/delete-driver/:email', (req, res) => {
    delete db.data.drivers[req.params.email];
    db.write();
    res.redirect('/manage-drivers');
});

// admin manage robots
app.get('/manage-robots', (req, res) => {
    if (req.adminId) {
        db.read();
        res.render('manage-robots', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName,
            activeRobots: db.data.robots
        });
    } else {
        res.redirect('/');
    };
});
app.post('/delete-robot/:uuid', (req, res) => {
    delete db.data.robots[req.params.uuid];
    db.write();
    res.redirect('/manage-robots');
});

app.get('/new-robot-details', (req, res) => {
    if (req.adminId) {
        res.render('new-robot-details', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName
        });
    } else {
        res.redirect('/');
    };
});
app.post('/submit-robot-details', (req, res) => {
    const { name, location } = req.body;
    var uuid = uuidv4();

    // db.data.robots[hashedPwd(uuid)] = {
    //     "private": uuid,
    //     "name": name,
    //     "location": location
    // };
    // db.write();

    res.redirect('/new-robot-activate?uuid=' + uuid + '&name=' + name + '&location=' + location);
});

app.get('/new-robot-activate', (req, res) => {
    if (req.adminId) {
        res.render('new-robot-activate', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName,
            baseURL: "https://" + req.get('host') + "/",
            robotUuid: req.query.uuid,
            robotName: req.query.name,
            robotLocation: req.query.location
        });
    } else {
        res.redirect('/');
    };
});

app.get('/new-robot-optional', (req, res) => {
    if (req.adminId) {
        res.render('new-robot-optional', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName,
            robotUuid: req.query.uuid,
            robotName: req.query.name,
            robotLocation: req.query.location
        });
    } else {
        res.redirect('/');
    };
});

// admin manage smart actions
app.get('/smart-actions', (req, res) => {
    if (req.adminId) {
        db.read();
        res.render('smart-actions', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName,
            smartActions: db.data.smart_actions
        });
    } else {
        res.redirect('/');
    };
});
app.post('/delete-smart-action/:uuid', (req, res) => {
    fs.unlinkSync('public/ar/assets/fiducial/' + req.params.uuid + '.patt');
    fs.unlinkSync('public/ar/assets/ar-icon/' + req.params.uuid + '.png');
    fs.unlinkSync('public/ar/assets/ar-icon-confirm/' + req.params.uuid + '.png');

    db.read();
    delete db.data.smart_actions[req.params.uuid];
    db.write();

    res.redirect('/smart-actions');
});
app.get('/smart-action', (req, res) => {
    if (req.adminId) {
        res.render('smart-action', {
            id: req.adminId,
            name: activeUsers[req.adminId].name,
            inst: db.data.organization.displayName
        });
    } else {
        res.redirect('/');
    };
});
app.post('/new-smart-action', (req, res) => {
    const { name, webhook } = req.body;
    const fiducial = req.files.fiducial;
    const arIcon = req.files.arIcon;
    const arIconC = req.files.arIconConfirm;

    const uuid = uuidv4();
    fiducial.mv('public/ar/assets/fiducial/' + uuid + '.patt');
    arIcon.mv('public/ar/assets/ar-icon/' + uuid + '.png');
    arIconC.mv('public/ar/assets/ar-icon-confirm/' + uuid + '.png');

    db.read();
    db.data.smart_actions[uuid] = {
        "name": name,
        "webhook": webhook
    };
    db.write();

    res.redirect('/smart-actions');
});

// robot-side interface and controller
app.get('/robot/:uuid', (req, res) => {
    db.read();
    if (db.data.robots[hashedPwd(req.params.uuid)] != null) {
        res.render('robot', {
            robotId: hashedPwd(req.params.uuid),
            robotName: db.data.robots[hashedPwd(req.params.uuid)].name
        });
    } else {
        res.redirect('/');
    };
});

// driver interface and controller
app.get('/:uuid', (req, res) => {
    if (req.driverId) {
        db.read();
        connectedUsers[req.params.uuid] = req.driverId;
        res.render('driver', {
            robotId: req.params.uuid,
            robotName: db.data.robots[req.params.uuid].name,
            robotLocation: db.data.robots[req.params.uuid].location,
            smartActionsData: JSON.stringify(db.data.smart_actions),
            officeCardsData: JSON.stringify(db.data.ms_office_cards)
        });
    } else {
        res.redirect('/');
    };
});
