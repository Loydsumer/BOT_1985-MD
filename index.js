process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';
import './settings.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, {
    watchFile,
    unwatchFile,
    readdirSync,
    existsSync,
    readFileSync,
    watch,
    mkdirSync
} from 'fs'
import * as fsPromises from 'fs/promises'
import { readdir, stat, unlink } from 'fs/promises'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { format } from 'util'
import pino from 'pino'
import Pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import PQueue from 'p-queue'
import Datastore from '@seald-io/nedb'
import readline from 'readline'
import NodeCache from 'node-cache'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    jidNormalizedUser
} = await import('@itsliaaa/baileys')
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

if (typeof global.atob !== 'function') {
    global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary')
}

protoType()
serialize()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
    return rmPrefix ? (/file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL) : pathToFileURL(pathURL).toString()
}
global.__dirname = function dirname(pathURL) {
    return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
    return createRequire(dir)
}

global.timestamp = { start: new Date() }
const __dirname = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

const dbPath = path.join(__dirname, 'database')
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath)

const collections = {
    users:    new Datastore({ filename: path.join(dbPath, 'users.db'),    autoload: true }),
    chats:    new Datastore({ filename: path.join(dbPath, 'chats.db'),    autoload: true }),
    settings: new Datastore({ filename: path.join(dbPath, 'settings.db'), autoload: true }),
    msgs:     new Datastore({ filename: path.join(dbPath, 'msgs.db'),     autoload: true }),
    sticker:  new Datastore({ filename: path.join(dbPath, 'sticker.db'),  autoload: true }),
    stats:    new Datastore({ filename: path.join(dbPath, 'stats.db'),    autoload: true })
}
Object.values(collections).forEach((db) => db.setAutocompactionInterval(300000))

global.db = {
    data: {
        users: {},
        chats: {},
        settings: {},
        msgs: {},
        sticker: {},
        stats: {}
    }
}

function sanitizeId(id) { return id.replace(/\./g, '_') }
function unsanitizeId(id) { return id.replace(/_/g, '.') }
function sanitizeObject(obj) {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
        out[k.replace(/\./g, '_')] = typeof v === 'object' && v !== null ? sanitizeObject(v) : v
    }
    return out
}
function unsanitizeObject(obj) {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
        out[k.replace(/_/g, '.')] = typeof v === 'object' && v !== null ? unsanitizeObject(v) : v
    }
    return out
}

global.db.readData = async function (category, id) {
    if (!global.db.data[category][id]) {
        const data = await new Promise((resolve, reject) => {
            collections[category].findOne({ _id: sanitizeId(id) }, (err, doc) => {
                if (err) return reject(err)
                resolve(doc ? unsanitizeObject(doc.data) : {})
            })
        })
        global.db.data[category][id] = data
    }
    return global.db.data[category][id]
}

global.db.writeData = async function (category, id, data) {
    global.db.data[category][id] = { ...global.db.data[category][id], ...data }
    await new Promise((resolve, reject) => {
        collections[category].update(
            { _id: sanitizeId(id) },
            { $set: { data: sanitizeObject(global.db.data[category][id]) } },
            { upsert: true },
            (err) => (err ? reject(err) : resolve())
        )
    })
}

global.db.loadDatabase = async function () {
    const loadPromises = Object.keys(collections).map(async (category) => {
        const docs = await new Promise((resolve, reject) => {
            collections[category].find({}, (err, docs) => {
                if (err) return reject(err)
                resolve(docs)
            })
        })
        const seenIds = new Set()
        for (const doc of docs) {
            const originalId = unsanitizeId(doc._id)
            if (seenIds.has(originalId)) {
                await new Promise((resolve, reject) => {
                    collections[category].remove({ _id: doc._id }, {}, (err) => (err ? reject(err) : resolve()))
                })
            } else {
                seenIds.add(originalId)
                if (category === 'users' && (originalId.includes('@newsletter') || originalId.includes('lid'))) continue
                if (category === 'chats' && originalId.includes('@newsletter')) continue
                global.db.data[category][originalId] = unsanitizeObject(doc.data)
            }
        }
    })
    await Promise.all(loadPromises)
}

global.db.save = async function () {
    const savePromises = []
    for (const category of Object.keys(global.db.data)) {
        for (const [id, data] of Object.entries(global.db.data[category])) {
            if (Object.keys(data).length === 0) continue
            if (category === 'users' && (id.includes('@newsletter') || id.includes('lid'))) continue
            if (category === 'chats' && id.includes('@newsletter')) continue
            savePromises.push(
                new Promise((resolve, reject) => {
                    collections[category].update(
                        { _id: sanitizeId(id) },
                        { $set: { data: sanitizeObject(data) } },
                        { upsert: true },
                        (err) => (err ? reject(err) : resolve())
                    )
                })
            )
        }
    }
    await Promise.all(savePromises)
}

global.loadDatabase = async function () {
    if (global.db.data !== null) return
    await global.db.loadDatabase()
}

global.db.loadDatabase().then(() => {
    console.log(chalk.green('✅ قاعدة البيانات محملة'))
}).catch((err) => {
    console.error('خطأ في تحميل قاعدة البيانات:', err)
})

async function gracefulShutdown() {
    await global.db.save()
    process.exit(0)
}
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

const sessionPath = global.sessions || 'Sessions/sos'
const botsPath    = global.bots    || 'Sessions/bots'
global.rutaBot    = join(__dirname, sessionPath)
global.rutaLoydBot = join(__dirname, botsPath)
const respaldoDir = join(__dirname, 'BackupSession')
const credsFile   = join(global.rutaBot, 'creds.json')

if (!fs.existsSync(global.rutaLoydBot)) fs.mkdirSync(global.rutaLoydBot, { recursive: true })
if (!fs.existsSync(respaldoDir))        fs.mkdirSync(respaldoDir,        { recursive: true })

const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache     = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const { version }          = await fetchLatestBaileysVersion()

let phoneNumber   = global.botNumberCode
const MethodMobile = process.argv.includes('mobile')


let opcion = '2'

const filterStrings = [
    'Q2xvc2luZyBzdGFsZSBvcGVu',
    'Q2xvc2luZyBvcGVuIHNlc3Npb24=',
    'RmFpbGVkIHRvIGRlY3J5cHQ=',
    'U2Vzc2lvbiBlcnJvcg==',
    'RXJyb3I6IEJhZCBNQUM=',
    'RGVjcnlwdGVkIG1lc3NhZ2U='
]
function redefineConsoleMethod(methodName, filterStrings) {
    const orig = console[methodName]
    console[methodName] = function () {
        const message = arguments[0]
        if (typeof message === 'string' && filterStrings.some((f) => message.includes(atob(f)))) return
        return orig.apply(console, arguments)
    }
}
;['log', 'warn', 'error'].forEach((m) => redefineConsoleMethod(m, filterStrings))

const connectionOptions = {
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Windows', 'Chrome', '120.0.0.0'],
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    },
    version
}

global.conn = makeWASocket(connectionOptions)


global.conn.ev.on('creds.update', saveCreds)

let pairingCodeRequested = false

conn.isInit = false
conn.well = false

if (!opts['test']) {
    if (global.db) setInterval(async () => {
        if (global.db.data) await global.db.save()
    }, 30 * 1000)
}

if (opts['server']) (await import('./server.js')).default(global.conn, PORT)

const backupCreds = async () => {
    if (!fs.existsSync(credsFile)) return
    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-')
    const newBackup  = join(respaldoDir, `creds-${timestamp}.json`)
    fs.copyFileSync(credsFile, newBackup)
    const backups = fs.readdirSync(respaldoDir)
        .filter((f) => f.startsWith('creds-') && f.endsWith('.json'))
        .sort((a, b) => fs.statSync(join(respaldoDir, a)).mtimeMs - fs.statSync(join(respaldoDir, b)).mtimeMs)
    while (backups.length > 3) {
        const oldest = backups.shift()
        fs.unlinkSync(join(respaldoDir, oldest))
    }
}

const restoreCreds = async () => {
    const backups = fs.readdirSync(respaldoDir)
        .filter((f) => f.startsWith('creds-') && f.endsWith('.json'))
        .sort((a, b) => fs.statSync(join(respaldoDir, b)).mtimeMs - fs.statSync(join(respaldoDir, a)).mtimeMs)
    if (backups.length === 0) return
    fs.copyFileSync(join(respaldoDir, backups[0]), credsFile)
}

setInterval(async () => { await backupCreds() }, 5 * 60 * 1000)

let printingNoConn = false
async function connectionUpdate(update) {
    const { connection, lastDisconnect, isNewLogin, qr } = update
    global.stopped = connection
    if (isNewLogin) conn.isInit = true

    // لما السيرفر يبعث QR = الوقت الصح لطلب الكود
    if (qr && !pairingCodeRequested && !conn.authState.creds.registered) {
        pairingCodeRequested = true
        const addNumber = phoneNumber.replace(/[^0-9]/g, '')
        console.log(chalk.bold.cyanBright(`⏳ جاري طلب كود الربط للرقم: +${addNumber}`))
        try {
            let codeBot = await conn.requestPairingCode(addNumber)
            codeBot = codeBot?.match(/.{1,4}/g)?.join('-') || codeBot
            console.log(chalk.bold.white(chalk.bgMagenta(' PAIRING CODE: ')), chalk.bold.yellowBright(codeBot))
        } catch (e) {
            pairingCodeRequested = false
            console.error(chalk.bold.red('فشل طلب كود الربط:'), e.message)
        }
    }

    if (connection === 'close' && !existsSync(`./${sessionPath}/creds.json`)) {
        if (!printingNoConn) {
            printingNoConn = true
            process.stdout.write(chalk.bold.redBright('⚠️ لا يوجد اتصال، احذف مجلد الجلسة وأعد الاتصال\n'))
            setTimeout(() => { printingNoConn = false }, 1500)
        }
    }

    const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
    if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
        await global.reloadHandler(true).catch(console.error)
        global.timestamp.connect = new Date()
    }

    if (global.db.data == null) await global.db.loadDatabase()

    if (connection == 'open') {
        console.log(chalk.bold.greenBright('✅ تم الاتصال بنجاح'))
        await joinChannels(conn)
    }

    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
    if (connection === 'close') {
        if (reason === DisconnectReason.badSession) {
            console.log(chalk.bold.cyanBright('جلسة تالفة، جاري إعادة التشغيل...'))
        } else if (reason === DisconnectReason.connectionClosed) {
            await restoreCreds()
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.connectionLost) {
            await restoreCreds()
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(chalk.bold.yellowBright('تم استبدال الاتصال'))
        } else if (reason === DisconnectReason.loggedOut) {
            console.log(chalk.bold.redBright('تم تسجيل الخروج — احذف الجلسة وأعد التشغيل'))
            pairingCodeRequested = false
        } else if (reason === DisconnectReason.restartRequired) {
            await global.reloadHandler(true).catch(console.error)
        } else if (reason === DisconnectReason.timedOut) {
            await global.reloadHandler(true).catch(console.error)
        } else {
            console.log(chalk.bold.redBright(`انقطع الاتصال: ${reason}`))
        }
    }
}

process.on('uncaughtException', console.error)

let isInit = true
let handler = await import('./handler.js')
const safeOff = (ev, fn) => { if (fn && typeof fn === 'function') conn.ev.off(ev, fn) }
const safeOn  = (ev, fn) => { if (fn && typeof fn === 'function') conn.ev.on(ev, fn) }

global.reloadHandler = async function (restatConn) {
    try {
        const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
        if (Handler && Object.keys(Handler).length) handler = Handler
    } catch (e) {
        console.error(e)
    }
    if (restatConn) {
        const oldChats = global.conn.chats
        try { global.conn.ws.close() } catch {}
        conn.ev.removeAllListeners?.()
        global.conn = makeWASocket(connectionOptions, { chats: oldChats })
        isInit = true
    }
    if (!isInit) {
        safeOff('messages.upsert',           conn.handler)
        safeOff('group-participants.update', conn.participantsUpdate)
        safeOff('groups.update',             conn.groupsUpdate)
        safeOff('message.delete',            conn.onDelete)
        safeOff('call',                      conn.onCall)
        safeOff('connection.update',         conn.connectionUpdate)
        safeOff('creds.update',              conn.credsUpdate)
    }
    conn.handler           = handler.handler.bind(global.conn)
    conn.participantsUpdate = handler.participantsUpdate?.bind(global.conn)
    conn.groupsUpdate      = handler.groupsUpdate?.bind(global.conn)
    conn.onDelete          = handler.deleteUpdate?.bind(global.conn)
    conn.onCall            = handler.callUpdate?.bind(global.conn)
    conn.connectionUpdate  = connectionUpdate.bind(global.conn)
    conn.credsUpdate       = saveCreds.bind(global.conn, true)
    safeOn('messages.upsert',           conn.handler)
    safeOn('group-participants.update', conn.participantsUpdate)
    safeOn('groups.update',             conn.groupsUpdate)
    safeOn('message.delete',            conn.onDelete)
    safeOn('call',                      conn.onCall)
    safeOn('connection.update',         conn.connectionUpdate)
    safeOn('creds.update',              conn.credsUpdate)
    isInit = false
    return true
}

const pluginFolder = join(__dirname, './plugins')
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}

async function filesInit() {
    for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
        try {
            const file   = global.__filename(join(pluginFolder, filename))
            const module = await import(file)
            global.plugins[filename] = module.default || module
        } catch (e) {
            console.error(`[plugin error] ${filename}: ${e.message}`)
            delete global.plugins[filename]
        }
    }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error)

global.reload = async (_ev, filename) => {
    if (!pluginFilter(filename)) return
    const dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
        if (existsSync(dir)) console.log(chalk.cyan(`[🔄] تحديث: ${filename}`))
        else {
            console.log(chalk.yellow(`[🗑️] حذف: ${filename}`))
            return delete global.plugins[filename]
        }
    } else {
        console.log(chalk.green(`[✅] إضافة جديدة: ${filename}`))
    }
    const err = syntaxerror(readFileSync(dir), filename, { sourceType: 'module', allowAwaitOutsideFunction: true })
    if (err) {
        console.error(`خطأ في ${filename}\n${format(err)}`)
    } else {
        try {
            const module = await import(`${global.__filename(dir)}?update=${Date.now()}`)
            global.plugins[filename] = module.default || module
        } catch (e) {
            console.error(`خطأ تحميل ${filename}\n${format(e)}`)
        } finally {
            global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
        }
    }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

async function _quickTest() {
    const procs = [
        spawn('ffmpeg'),
        spawn('ffprobe'),
        spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
        spawn('convert'),
        spawn('magick'),
        spawn('gm'),
        spawn('find', ['--version'])
    ]
    const test = await Promise.all(
        procs.map((p) => Promise.race([
            new Promise((resolve) => p.on('close', (code) => resolve(code !== 127))),
            new Promise((resolve) => p.on('error', () => resolve(false)))
        ]))
    )
    const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
    global.support = Object.freeze({ ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find })
}

function clearTmp() {
    const tmpDir = join(__dirname, 'tmp')
    if (!existsSync(tmpDir)) return
    readdirSync(tmpDir).forEach((file) => {
        try { fs.unlinkSync(join(tmpDir, file)) } catch {}
    })
}

async function purgeSession() {
    try {
        if (!existsSync(sessionPath)) return
        const files    = await readdir(sessionPath)
        const preKeys  = files.filter((f) => f.startsWith('pre-key-'))
        const cutoff   = Date.now() - 24 * 60 * 60 * 1000
        for (const file of preKeys) {
            const filePath = join(sessionPath, file)
            const fileStats = await stat(filePath)
            if (fileStats.mtimeMs < cutoff) {
                try { await unlink(filePath) } catch {}
            }
        }
    } catch {}
}

setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    clearTmp()
}, 1000 * 60 * 3)

setInterval(async () => {
    if (global.stopped === 'close' || !conn || !conn.user) return
    await purgeSession()
}, 1000 * 60 * 10)

_quickTest().then(() => {
    const art = [
        '▒▒▒▒▒▒▒▒▒▒▒░░░▒░▒▓████▒▓▓▒▒▓█▓▓▓▓▓▓▓',
        '▒░▒▒▒▒▒▒▒▒▒░░░░▓███████▒█▓░▒▓▓▓▓▓▓▓▓',
        '░▒▒▒▒▒▒▒▒░░░░░▓████████▓▒█▒░▓▓▓▒▒▒▓▓',
        '░▒▒▒▒▒▒▒░░░░▒███████████▒█▓░▓▓▒▓▓▒▒▓',
        '░░▒▒▒▒▒▒░▒▒▓▒███████████▓▒▒░▓▓▒▒▒▓▓▒',
        '▒▒▒▒▒▒▒▒▒▓██▒▓████████▓▒▓░░▒▓▓▒▓▒▒▓▓',
        '▒▒▒▒▒▒▒▒▒▓██▓░█▓▓▒▒▒▒░▒▓█▓▓▓▓█▓▒▓▒▒▓',
        '▒▒░▒▒▒▒▒░▓███▒▒███▓░░▒▓███▓█▓██▓▒▓▒▒',
        '▒▒░▒▒▒▒░░▓████▒▒██▒▓█▓████▓█▓███▓▒▓▒',
        '▒░░▒▒▒▒▒▒▒████▓▒▒░▓███████▓█▓████▓▒▓',
        '▒░░▒▒▒▒░▒▒▓▓▒░▓▒░▒▒█████▓▓██▒█████▒▒',
        '░░░░▒▒▒░▒▒░░░░█▓▓█▓▒██▓▓▓███▒██████▒',
        '░░░░▒░░░░▒▒▓▒▓██▒███▓▓██████▒███████',
        '░░░░░░▒░░▓▒█████▒███████████▒▓██████',
        '░░░░░░░░░▓█▓███▒▒▓██████████▓▓██████',
        '░░░░░░░░░░██▓▓▓▓▒▓██████████▓▓██████',
        '░░░░░░░░░░▒▓▒▓███▓▓████▓▓███▓▓██████',
        '░░░░░░░▒░░░▓██████████▓███▓█▓▒██████',
    ].join('\n')
    console.log(chalk.green(art))
    console.log(chalk.bold.yellow(`𝐌𝐨𝐧𝐞𝐲 𝐝𝐨𝐞𝐬𝐧'𝐭 𝐛𝐞𝐭𝐫𝐚𝐲 𝐲𝐨𝐮. 𝐇𝐚𝐫𝐝 𝐰𝐨𝐫𝐤 𝐝𝐨𝐞𝐬𝐧'𝐭 𝐛𝐞𝐭𝐫𝐚𝐲 𝐲𝐨𝐮. 𝐁𝐮𝐭 𝐋𝐥𝐨𝐲𝐝? 𝐇𝐞 𝐦𝐢𝐠𝐡𝐭-𝐮𝐧𝐥𝐞𝐬𝐬 𝐲𝐨𝐮 𝐡𝐚𝐯𝐞 𝐚 𝐜𝐨𝐧𝐭𝐫𝐚𝐜𝐭.`))
    console.log(chalk.bold.red(`𝐖𝐀𝐓𝐄𝐑 𝐈𝐒 𝐆𝐎𝐎𝐃. 𝐁𝐔𝐓 𝐌𝐎𝐍𝐄𝐘 𝐈𝐒 𝐁𝐄𝐓𝐓𝐄𝐑.`))
    console.log(chalk.bold('[🚀] البوت يعمل...'))
}).catch(console.error)

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log(chalk.bold.greenBright('[🔄] تحديث الملف الرئيسي، جاري إعادة التحميل...'))
    import(`${file}?update=${Date.now()}`)
})

async function isValidPhoneNumber(number) {
    try {
        number = number.replace(/\s+/g, '')
        if (number.startsWith('+521')) number = number.replace('+521', '+52')
        else if (number.startsWith('+52') && number[4] === '1') number = number.replace('+52 1', '+52')
        const parsed = phoneUtil.parseAndKeepRawInput(number)
        return phoneUtil.isValidNumber(parsed)
    } catch {
        return false
    }
}

async function joinChannels(conn) {
    for (const channelId of Object.values(global.ch || {})) {
        await conn.newsletterFollow(channelId).catch(() => {})
    }
}
