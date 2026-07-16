import { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, proto, generateWAMessageFromContent, prepareWAMessageMedia } from '@itsliaaa/baileys';
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util' 
import * as ws from 'ws'
import { getDevice } from '@itsliaaa/baileys'

const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { fileURLToPath } from 'url'

let crm1 = "Y2QgcGx1Z2lucy"
let crm2 = "A7IG1kNXN1b"
let crm3 = "SBpbmZvLWRvbmFyLmpz"
let crm4 = "IF9hdXRvcmVzcG9uZGVyLmpzIGluZm8tYm90Lmpz"

// ==== بناء نصوص مُنسّقة محليًا (بدون استيراد خارجي) ====
function buildMessage(items) {
  const out = []
  for (const item of items) {
    switch (item.type) {
      case 'title':
        out.push(`「 *${item.text}* 」`)
        break
      case 'divider':
        out.push('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄')
        break
      case 'line':
        out.push(item.text)
        break
      case 'spacer':
        out.push('')
        break
      case 'warning':
        out.push(`⚠️ ${item.text}`)
        break
      case 'info':
        out.push(`${item.label}: *${item.value}*`)
        break
      default:
        break
    }
  }
  return out.join('\n')
}

// ==== رسالة واحدة: صورة + نص + زر نسخ الكود + زر رابط (كلهم سوا) ====
async function sendComboButtonMessage(conn, chat, imageUrl, bodyText, footerText, code, url, urlButtonText, quoted) {
  const media = await prepareWAMessageMedia(
    { image: { url: imageUrl } },
    { upload: conn.waUploadToServer }
  )

  const msg = generateWAMessageFromContent(chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          header: proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
          }),
          body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: footerText }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                  display_text: '📋 نسخ الكود',
                  id: 'copy_code_btn',
                  copy_code: code
                })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: urlButtonText,
                  url: url,
                  merchant_url: url
                })
              }
            ]
          })
        })
      }
    }
  }, { quoted, userJid: conn.user.jid })

  await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
  return msg
}

// ✅ زخرفة LOYD
let rtx = buildMessage([
    { type: 'title', text: '🤖 تـنـصـيـب بـوت فـرعـي - 𝐋𝐎𝐘𝐃' },
    { type: 'divider' },
    { type: 'line', text: '❄️ *الـخـطـوات:*' },
    { type: 'spacer' },
    { type: 'line', text: '❶ اضغط على الثلاث نقاط' },
    { type: 'line', text: '❷ اضغط على الأجهزة المرتبطة' },
    { type: 'line', text: '❸ اختر ربط برقم الهاتف' },
    { type: 'line', text: '❹ أدخل الكود التالي' },
    { type: 'divider' },
    { type: 'warning', text: 'هذا الكود يعمل فقط على رقمك' }
]);

let rtx2 = buildMessage([
    { type: 'title', text: '🤖 تـنـصـيـب بـوت فـرعـي - 𝐋𝐎𝐘𝐃' },
    { type: 'divider' },
    { type: 'line', text: '⚔️ اضغط الزر تحت لنسخ الكود، أو افتح الأجهزة المرتبطة مباشرة' }
]);

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const loydJBOptions = {}
const retryMap = new Map()
const maxAttempts = 5
if (global.conns instanceof Array) console.log()
else global.conns = []

let handler = async (m, {conn, args, usedPrefix, command, isOwner, text}) => {
if (!global.db.data.settings[conn.user.jid].jadibotmd) return m.reply(`*❌ نظام البوتات الفرعية معطل*`)
if (conn.user.jid === m.sender) return
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let id = `${text ? text.replace(/\D/g, '') : who.split`@`[0]}`
let pathLoydBot = path.join('./Sessions/bots/', id)
if (!fs.existsSync(pathLoydBot)) {
fs.mkdirSync(pathLoydBot, {recursive: true})
}
loydJBOptions.pathLoydBot = pathLoydBot
loydJBOptions.m = m
loydJBOptions.conn = conn
loydJBOptions.args = args
loydJBOptions.usedPrefix = usedPrefix
loydJBOptions.command = command
loydJBOptions.fromCommand = true
loydsolo(loydJBOptions, text)
}

handler.command = /^(تنصيب|jadibot|serbot|rentbot)$/i
export default handler

export async function loydsolo(options, text) {
let {pathLoydBot, m, conn, args, usedPrefix, command} = options

if (command === 'تنصيبض') {
    if (!args.includes('تنصيب') && !args.includes('--تنصيب')) {
        args.unshift('--تنصيب');
    }
} else if (command === 'تنصيب') {
    command = 'jadibot';
    if (!args.includes('تنصيب') && !args.includes('--تنصيب')) {
        args.unshift('--تنصيب');
    }
}

const mcode = args[0] && /(--تنصيب|تنصيب)/.test(args[0].trim()) ? true : args[1] && /(--تنصيب|تنصيب)/.test(args[1].trim()) ? true : false
let txtCode, codeBot, txtQR
if (mcode) {
args[0] = args[0].replace(/^--تنصيب$|^تنصيب$/, '').trim()
if (args[1]) args[1] = args[1].replace(/^--تنصيب$|^تنصيب$/, '').trim()
if (args[0] == '') args[0] = undefined
}
const pathCreds = path.join(pathLoydBot, 'creds.json')
if (!fs.existsSync(pathLoydBot)) {
fs.mkdirSync(pathLoydBot, {recursive: true})
}
try {
args[0] && args[0] != undefined
? fs.writeFileSync(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], 'base64').toString('utf-8')), null, '\t'))
: ''
} catch {
conn.reply(m.chat, `*استخدم الأمر بشكل صحيح:* \`${usedPrefix + command} code\``, m)
return
}

const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, 'base64')
exec(comb.toString('utf-8'), async (err, stdout, stderr) => {

let {version, isLatest} = await fetchLatestBaileysVersion()
const msgRetry = (MessageRetryMap) => {}
const msgRetryCache = new NodeCache()
const {state, saveState, saveCreds} = await useMultiFileAuthState(pathLoydBot)

const connectionOptions = {
logger: pino({level: 'fatal'}),
printQRInTerminal: false,
auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'}))},
msgRetry,
msgRetryCache,
browser: mcode ? ['Windows', 'Chrome', '110.0.5585.95'] : ['✧ 𝐋𝐎𝐘𝐃 (Sub Bot)', 'Chrome', '2.0.0'],
version: version,
generateHighQualityLinkPreview: true
}

let sock = makeWASocket(connectionOptions)
sock.isInit = false
let isInit = true
let reconnectAttempts = 0

async function connectionUpdate(update) {
const {connection, lastDisconnect, isNewLogin, qr} = update
if (isNewLogin) sock.isInit = false
if (qr && !mcode) {
if (m?.chat) {
txtQR = await conn.sendMessage(
m.chat,
{image: await qrcode.toBuffer(qr, {scale: 8}), caption: rtx.trim()},
{quoted: m}
)
} else {
return
}
if (txtQR && txtQR.key) {
setTimeout(() => {
conn.sendMessage(m.chat, {delete: txtQR.key})
}, 30000)
}
return
}
if (qr && mcode) {
let fixTe = text ? text.replace(/\D/g, '') : m.sender.split('@')[0]
let secret = await sock.requestPairingCode(fixTe)
secret = secret.match(/.{1,4}/g)?.join('-')
const dispositivo = await getDevice(m.key.id)

const imageUrl = 'https://files.catbox.moe/mhfqkm.jpg';
const linkedDevicesUrl = 'https://wa.me/settings/linked_devices';

if (m.isWABusiness) {
// حسابات البيزنس أحيانًا ما تدعم الأزرار التفاعلية بشكل موثوق، نرجع لشكل بسيط
txtCode = await conn.sendMessage(
m.chat,
{
image: {url: imageUrl},
caption: `${rtx2.trim()}\n\n*الــكــود:* ${secret}\n\n🔗 ${linkedDevicesUrl}`
},
{quoted: m}
)
codeBot = await m.reply(secret)
} else {
// رسالة واحدة فيها الصورة + النص + زر نسخ الكود + زر فتح الرابط
txtCode = await sendComboButtonMessage(
conn,
m.chat,
imageUrl,
`${rtx2.trim()}\n\n*الــكــود:* ${secret}`,
'𝐋𝐎𝐘𝐃',
secret,
linkedDevicesUrl,
'🔗 فتح الأجهزة المرتبطة',
m
)
}

console.log(secret)
}
if ((txtCode && txtCode.key) || (txtCode && txtCode.id)) {
const messageId = txtCode.key || txtCode.id
setTimeout(() => {
conn.sendMessage(m.chat, {delete: messageId})
}, 30000)
}
if (codeBot && codeBot.key) {
setTimeout(() => {
conn.sendMessage(m.chat, {delete: codeBot.key})
}, 30000)
}
const endSesion = async (loaded) => {
if (!loaded) {
try {
sock.ws.close()
} catch {}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)
if (i < 0) return
delete global.conns[i]
global.conns.splice(i, 1)
}
}

const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
if (connection === 'close') {
if (reason === 428) {
if (reconnectAttempts < maxAttempts) {
const delay = 1000 * Math.pow(2, reconnectAttempts)
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sub-bot (+${path.basename(pathLoydBot)}) connection closed. Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts + 1}/${maxAttempts})\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
await sleep(1000)
await creloadHandler(true).catch(console.error)
} else {
console.log(chalk.redBright(`Sub-bot (+${path.basename(pathLoydBot)}) max retries reached.`))
}
}
if (reason === 408) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Connection (+${path.basename(pathLoydBot)}) lost/expired. Reason: ${reason}. Reconnecting...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
await creloadHandler(true).catch(console.error)
}
if (reason === 440) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Connection (+${path.basename(pathLoydBot)}) replaced by another active session.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
try {
if (options.fromCommand)
m?.chat
? await conn.sendMessage(
m.chat,
{
text: '> *تم اكتشاف جلسة جديدة. احذف الجلسة القديمه للمتابعة*'
},
{quoted: m || null}
)
: ''
} catch (error) {
console.error(chalk.bold.yellow(`Error 440: +${path.basename(pathLoydBot)}`))
}
}
if (reason == 405 || reason == 401) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Session (+${path.basename(pathLoydBot)}) closed. Invalid credentials.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
try {
if (options.fromCommand)
m?.isGroup
? await conn.sendMessage(
m.chat,
{text: '*🟢هناك جلسه غير مسجله*\n\n> *اكتب تنصيب تاني لاعاده الاتصال*'},
{quoted: m}
)
: ''
} catch (error) {
console.error(chalk.bold.yellow(`Error 405: +${path.basename(pathLoydBot)}`))
}
fs.rmdirSync(pathLoydBot, {recursive: true})
}
if (reason === 500) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Connection lost (+${path.basename(pathLoydBot)}). Cleaning data...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)

if (options.fromCommand) {
m?.isGroup
? await conn.sendMessage(
m.chat,
{text: '*انقــطع الاتـــصال*\n\n> *حاولتُ يدويًا العودة إلى البوت الفرعي*'},
{quoted: m}
)
: ''
}
}
if (reason === 515) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Auto-restart for session (+${path.basename(pathLoydBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
await creloadHandler(true).catch(console.error)
}
if (reason === 403) {
console.log(
chalk.bold.magentaBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Session closed/banned (+${path.basename(pathLoydBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
fs.rmdirSync(pathLoydBot, {recursive: true})
}
}

if (global.db.data == null) loadDatabase()
if (connection == 'open') {
reconnectAttempts = 0
if (!global.db.data?.users) loadDatabase()
let userName, userJid
userName = sock.authState.creds.me.name || 'Anónimo'
userJid = sock.authState.creds.me.jid || `${path.basename(pathLoydBot)}@s.whatsapp.net`
console.log(
chalk.bold.cyanBright(
`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│\n│ 🟢 ${userName} (+${path.basename(pathLoydBot)}) connected.\n│\n❒⸺⸺⸺【• CONNECTED •】⸺⸺⸺❒`
)
)
sock.isInit = true
global.conns.push(sock)

// ✅✅✅ متابعة القنوات تلقائياً للبوت الفرعي ✅✅✅
setTimeout(async () => {
    try {
        const channelsToFollow = [
            '120363402804601196@newsletter',
            '120363377374711810@newsletter',
        ];
        
        for (const channelId of channelsToFollow) {
            await sock.newsletterFollow(channelId).catch((e) => {
                console.log(`⚠️ Failed to follow ${channelId}:`, e.message);
            });
        }
        console.log(`✅ Sub-bot ${path.basename(pathLoydBot)} followed ${channelsToFollow.length} channels`);
    } catch (err) {
        console.error(`❌ Channel follow error:`, err);
    }
}, 5000);

let user = global.db.data?.users[`${path.basename(pathLoydBot)}@s.whatsapp.net`]
if (m?.chat) {
await conn.sendMessage(
m.chat,
{
text: buildMessage([
    { type: 'title', text: '✅ تــم الاتــصــال بــنــجــاح - 𝐋𝐎𝐘𝐃' },
    { type: 'divider' },
    { type: 'info', label: '📱 الــرقــم', value: path.basename(pathLoydBot) },
    { type: 'divider' },
    { type: 'line', text: '🤖 البوت الفرعي جاهز للعمل' }
]),
contextInfo: {
forwardingScore: 999,
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: '120363402804601196@newsletter',
newsletterName: '𝐋𝐎𝐘𝐃',
serverMessageId: -1
}
}
},
{quoted: m}
)
}
}
}
setInterval(async () => {
if (!sock.user) {
try {
sock.ws.close()
} catch (e) {
}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)
if (i < 0) return
delete global.conns[i]
global.conns.splice(i, 1)
}
}, 60000)

let handler = await import('../handler.js')
let creloadHandler = async function (restatConn) {
try {
const Handler = await import(`../handler.js?update=${Date.now()}`).catch(console.error)
if (Object.keys(Handler || {}).length) handler = Handler
} catch (e) {
console.error('Reload error: ', e)
}
if (restatConn) {
const oldChats = sock.chats
try {
sock.ws.close()
} catch {}
sock.ev.removeAllListeners()
sock = makeWASocket(connectionOptions, {chats: oldChats})
isInit = true
}
if (!isInit) {
sock.ev.off('messages.upsert', sock.handler)
sock.ev.off('group-participants.update', sock.participantsUpdate)
sock.ev.off('groups.update', sock.groupsUpdate)
sock.ev.off('message.delete', sock.onDelete)
sock.ev.off('call', sock.onCall)
sock.ev.off('connection.update', sock.connectionUpdate)
sock.ev.off('creds.update', sock.credsUpdate)
}

sock.handler = handler.handler.bind(sock)
sock.participantsUpdate = handler.participantsUpdate.bind(sock)
sock.groupsUpdate = handler.groupsUpdate.bind(sock)
sock.onDelete = handler.deleteUpdate.bind(sock)
sock.onCall = handler.callUpdate.bind(sock)
sock.connectionUpdate = connectionUpdate.bind(sock)
sock.credsUpdate = saveCreds.bind(sock, true)

sock.ev.on('messages.upsert', sock.handler)
sock.ev.on('group-participants.update', sock.participantsUpdate)
sock.ev.on('groups.update', sock.groupsUpdate)
sock.ev.on('message.delete', sock.onDelete)
sock.ev.on('call', sock.onCall)
sock.ev.on('connection.update', sock.connectionUpdate)
sock.ev.on('creds.update', sock.credsUpdate)
isInit = false
return true
}
creloadHandler(false)
})
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function sleep(ms) {
return new Promise((resolve) => setTimeout(resolve, ms))
}

async function joinChannels(conn) {
for (const channelId of Object.values(global.ch)) {
await conn.newsletterFollow(channelId).catch(() => {})
}
}

async function checkSubBots() {
const subBotDir = path.resolve('./Sessions/bots')
if (!fs.existsSync(subBotDir)) return
const subBotFolders = fs.readdirSync(subBotDir).filter((folder) => fs.statSync(path.join(subBotDir, folder)).isDirectory())

for (const folder of subBotFolders) {
const pathLoydBot = path.join(subBotDir, folder)
const credsPath = path.join(pathLoydBot, 'creds.json')
const subBot = global.conns.find((conn) => conn.user?.jid?.includes(folder) || path.basename(pathLoydBot) === folder)

if (!fs.existsSync(credsPath)) {
console.log(
chalk.bold.yellowBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sub-bot (+${folder}) no creds.json. Skipping...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
continue
}

if (!subBot || !subBot.user) {
console.log(
chalk.bold.yellowBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sub-bot (+${folder}) disconnected. Attempting to activate...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
const retries = retryMap.get(folder) || 0
if (retries >= 5) {
console.log(
chalk.redBright(
`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sub-bot (+${folder}) max retries reached.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`
)
)
retryMap.delete(folder)
continue
}

try {
await loydsolo({
pathLoydBot,
m: null,
conn: global.conn,
args: [],
usedPrefix: '#',
command: 'jadibot',
fromCommand: false
})
retryMap.delete(folder)
} catch (e) {
console.error(chalk.redBright(`Error activating sub-bot (+${folder}):`), e)
retryMap.set(folder, retries + 1)
}
}
}
}

setInterval(checkSubBots, 1800000)