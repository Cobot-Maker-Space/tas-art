// IMPORTS

// password and uuid utilities
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import cookieParser from 'cookie-parser'

// database and file utilities
import { LowSync, JSONFileSync } from 'lowdb'
import { join, dirname } from 'path'
import cors from 'cors'
import fs from 'fs'

// routing and data abstractions
import express from 'express'
import favicon from 'serve-favicon'
import expressFileupload from 'express-fileupload'
import greenlock from 'greenlock-express'
import bodyParser from 'body-parser'

// server utilities
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

// CONSTANTS 

// absolute path to dir
const __dirname = dirname(fileURLToPath(import.meta.url))

// server instantiation
const app = express()
const server = createServer(app)

// server configuration
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(favicon(join(__dirname, 'public', 'favicon.ico')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(expressFileupload())
app.use(cookieParser())
app.use(cors())

// database configuration
const file = join(__dirname, 'db/db.json')
const adapter = new JSONFileSync(file)
const db = new LowSync(adapter)
db.read()

// UTILITY FUNCTIONS

function hashedPwd(pwd) {
    const sha256 = crypto.createHash('sha256')
    const hash = sha256.update(pwd).digest('base64')
    return hash
}
function newAuthToken() {
    return crypto.randomBytes(36).toString('hex')
}
function deleteElement(array, value) {
    return array.filter(function (x) {
        return x != value;
    });
}

// HTTPS

greenlock.init({
    packageRoot: __dirname,
    configDir: "./greenlock.d",
    maintainerEmail: "psyip1@nottingham.ac.uk",
    cluster: false
}).ready(socketWorker)

function socketWorker(glx) {
    var server = glx.httpsServer()
    const io = new Server(server)

    // SOCKET COMMUNICATION (including webRTC)

    io.on('connection', socket => {
        // webRTC establishment
        socket.on('join-robot', (robotId, userId) => {
            socket.join(robotId)
            socket.broadcast.emit('user-connected', userId)
            socket.on('disconnect', () => {
                socket.broadcast.emit('user-disconnected', userId)
            })
        })
        // driver -> robot control message
        socket.on('control-msg', (msg, robotId) => {
            var message = {
                target: robotId,
                content: msg
            }
            io.emit('control-msg', message)
        })
        // driver -> robot click-to-drive message
        socket.on('click-to-drive', (x, y, robotId) => {
            var message = {
                target: robotId,
                xCoord: x,
                yCoord: y
            }
            io.emit('click-to-drive', message)
        })
        // robot -> driver health message (e.g., battery)
        socket.on('health-msg', (flavour, filling, robotId) => {
            var message = {
                target: robotId,
                type: flavour,
                status: filling,
            }
            io.emit('health-msg', message)
        })
    })

    glx.serveApp(app)
}

// ROUTING

// volatile record of logged in users
const adminAuthTokens = {}
const driverAuthTokens = {}

//app.use('/favicon.ico', (req, res, next) => {
//    res.sendStatus(200)
//});

// route precedent to collect cookie(s) from browser for auth
app.use((req, res, next) => {
    const authToken = req.cookies['AuthToken']
    if (adminAuthTokens[authToken]) {
        req.adminEmail = adminAuthTokens[authToken]
    } else if (driverAuthTokens[authToken]) {
        req.driverEmail = driverAuthTokens[authToken]
    }
    next()
})

// login and logout handling
app.get('/', (req, res) => {
    res.render('login', {
        error: false
    })
})
app.post('/login', (req, res) => {
    const { email, password } = req.body
    const pwdHash = hashedPwd(password)
    db.read()
    if (email == db.data.admin.email && pwdHash == db.data.admin.pwd_hash) {
        const authToken = newAuthToken()
        adminAuthTokens[authToken] = email
        res.cookie('AuthToken', authToken)
        res.redirect('/admin-dashboard')
    } else if (pwdHash == db.data.drivers[email]) {
        const authToken = newAuthToken()
        driverAuthTokens[authToken] = email
        res.cookie('AuthToken', authToken)
        res.redirect('/select')
    } else {
        res.render('login', {
            error: true
        })
    }
})
app.post('/logout', (req, res) => {
    delete adminAuthTokens[req.cookies['AuthToken']]
    delete driverAuthTokens[req.cookies['AuthToken']]
    res.redirect('/')
})

// registration handling
app.get('/register/:invite/:err?', (req, res) => {
    db.read()
    if (db.data.active_invites.includes(req.params.invite)) {
        if (req.params.err) {
            res.render('register', {
                error: true,
                invite: req.params.invite
            })
        } else {
            res.render('register', {
                error: false,
                invite: req.params.invite
            })
        }
    } else {
        res.redirect('/')
    }
})
app.post('/submit-register/:invite', (req, res) => {
    const { email, password, passwordConfirm } = req.body
    db.read()
    if (db.data.active_invites.includes(req.params.invite)) {
        if (password == passwordConfirm) {
            db.data.drivers[email] = hashedPwd(password)
            db.data.active_invites = deleteElement(db.data.active_invites, req.params.invite)
            db.write()
            res.redirect('/')
        } else {
            res.redirect('/register/' + req.params.invite + '/err')
        }
    }
})

// admin landing page
app.get('/admin-dashboard', (req, res) => {
    if (req.adminEmail) {
        res.render('admin-dashboard', {
            email: req.adminEmail
        })
    } else {
        res.redirect('/')
    }
})

// admin manage drivers
app.get('/manage-drivers', (req, res) => {
    if (req.adminEmail) {
        db.read()
        res.render('manage-drivers', {
            email: req.adminEmail,
            activeInvites: db.data.active_invites,
            activeDrivers: db.data.drivers
        })
    } else {
        res.redirect('/')
    }
})
app.post('/generate-invite', (req, res) => {
    db.data.active_invites.push(uuidv4())
    db.write()
    res.redirect('/manage-drivers')
})
app.post('/delete-invite/:invite', (req, res) => {
    db.data.active_invites = deleteElement(db.data.active_invites, req.params.invite)
    db.write()
    res.redirect('/manage-drivers')
})
app.post('/delete-driver/:email', (req, res) => {
    delete db.data.drivers[req.params.email]
    db.write()
    res.redirect('/manage-drivers')
})

// admin manage robots
app.get('/manage-robots', (req, res) => {
    if (req.adminEmail) {
        db.read()
        res.render('manage-robots', {
            email: req.adminEmail,
            activeRobots: db.data.robots
        })
    } else {
        res.redirect('/')
    }
})
app.post('/delete-robot/:uuid', (req, res) => {
    delete db.data.robots[req.params.uuid]
    db.write()
    res.redirect('/manage-robots')
})
app.post('/add-robot', (req, res) => {
    const { name, location } = req.body
    db.data.robots[uuidv4()] = { "name": name, "location": location }
    db.write()
    res.redirect('/manage-robots')
})

// admin manage smart actions
app.get('/smart-actions', (req, res) => {
    if (req.adminEmail) {
        db.read()
        res.render('smart-actions', {
            email: req.adminEmail,
            smartActions: db.data.smart_actions
        })
    } else {
        res.redirect('/')
    }
})
app.post('/delete-smart-action/:uuid', (req, res) => {
    fs.unlinkSync('public/assets/fiducial/' + req.params.uuid + '.patt')
    fs.unlinkSync('public/assets/ar-icon/' + req.params.uuid + '.png')
    fs.unlinkSync('public/assets/ar-icon-confirm/' + req.params.uuid + '.png')

    db.read()
    delete db.data.smart_actions[req.params.uuid]
    db.write()

    res.redirect('/smart-actions')
})
app.get('/smart-action', (req, res) => {
    if (req.adminEmail) {
        res.render('smart-action', {
            email: req.adminEmail
        }
        )
    } else {
        res.redirect('/')
    }
})
app.post('/new-smart-action', (req, res) => {
    const { name, webhook } = req.body
    const fiducial = req.files.fiducial
    const arIcon = req.files.arIcon
    const arIconC = req.files.arIconConfirm

    const uuid = uuidv4()
    fiducial.mv('public/assets/fiducial/' + uuid + '.patt')
    arIcon.mv('public/assets/ar-icon/' + uuid + '.png')
    arIconC.mv('public/assets/ar-icon-confirm/' + uuid + '.png')

    db.read()
    db.data.smart_actions[uuid] = {
        "name": name,
        "webhook": webhook
    }
    db.write()

    res.redirect('/smart-actions')
})


// robot selection for drivers
app.get('/select', (req, res) => {
    if (req.driverEmail) {
        db.read()
        res.render('select', {
            email: req.driverEmail,
            activeRobots: db.data.robots
        })
    } else {
        res.redirect('/')
    }
})

// robot-side interface and controller
// will crash if requested on alternative hardware
app.get('/robot/:uuid', (req, res) => {
    db.read()
    res.render('robot', {
        robotId: req.params.uuid,
        robotName: db.data.robots[req.params.uuid].name
    })
})

// driver interface and controller
app.get('/:uuid', (req, res) => {
    if (req.driverEmail) {
        db.read()
        res.render('driver', {
            robotId: req.params.uuid,
            robotName: db.data.robots[req.params.uuid].name,
            robotLocation: db.data.robots[req.params.uuid].location,
            smartActionsData: JSON.stringify(db.data.smart_actions)
        })
    } else {
        res.redirect('/')
    }
})
