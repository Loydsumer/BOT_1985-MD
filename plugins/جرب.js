import { proto, generateMessageIDV2, encodeNewsletterMessage } from '@itsliaaa/baileys'

const CHANNEL_ID = '120363425876654790@newsletter'

// ─── دالة الإرسال المباشر للقناة (تتجاوز sendMessage تماماً) ─────────────
async function sendToNewsletter(conn, channelId, message) {
    const msgId = generateMessageIDV2(conn.user.id)
    const isMedia = !!(message.imageMessage || message.videoMessage ||
                       message.audioMessage || message.documentMessage ||
                       message.stickerMessage)

    const bytes = encodeNewsletterMessage(message)

    await conn.sendNode({
        tag: 'message',
        attrs: {
            to:   channelId,
            id:   msgId,
            type: isMedia ? 'media' : 'text',
            ...(isMedia ? { mediatype: isMedia } : {})
        },
        content: [{
            tag:     'plaintext',
            attrs:   isMedia ? { mediatype: getMediaType(message) } : {},
            content: bytes
        }]
    })

    return msgId
}

function getMediaType(msg) {
    if (msg.imageMessage)    return 'image'
    if (msg.videoMessage)    return msg.videoMessage.gifPlayback ? 'gif' : 'video'
    if (msg.audioMessage)    return msg.audioMessage.ptt ? 'ptt' : 'audio'
    if (msg.documentMessage) return 'document'
    return ''
}

// ─── هاندلر رئيسي ─────────────────────────────────────────────────────────
let handler = async (m, { conn, text, usedPrefix, command }) => {

    // أمر التشخيص: .نشر تشخيص — يعرض قنوات البوت
    if (text?.trim() === 'تشخيص') {
        await m.reply('⏳ جاري جلب قنوات البوت...')
        try {
            const subs = await conn.newsletterSubscribed()
            if (!subs || !Array.isArray(subs) || subs.length === 0) {
                return m.reply('❌ البوت لا يملك أي قنوات.\nتأكد أن البوت هو نفسه صاحب القناة.')
            }
            const list = subs.map((n, i) =>
                `*${i+1}.* ${n.name || n.thread_metadata?.name?.text || 'بدون اسم'}\n🆔 \`${n.id}\``
            ).join('\n\n')
            return m.reply(`*📢 قنوات البوت:*\n\n${list}`)
        } catch (e) {
            return m.reply(`❌ فشل جلب القنوات: ${e.message || e}`)
        }
    }

    // ─── الحالة 1: نص ─────────────────────────────────────────────────────
    const q        = m.quoted ? m.quoted : m
    const mime     = (q.msg || q).mimetype || q.mediaType || ''
    const hasMedia = /image|video|audio|document/.test(mime)

    if (!hasMedia) {
        const content = text?.trim()
        if (!content) {
            return m.reply(
                `*📢 طريقة الاستخدام:*\n` +
                `• *${usedPrefix+command} [نص]* — نشر نص\n` +
                `• رد على صورة/فيديو ← *${usedPrefix+command}* — نشر ميديا\n` +
                `• *${usedPrefix+command} تشخيص* — عرض قنوات البوت`
            )
        }

        try {
            await m.reply('⏳ جاري النشر...')
            // إرسال مباشر عبر sendNode (يتجاوز sendMessage)
            const msg = proto.Message.create({ conversation: content })
            await sendToNewsletter(conn, CHANNEL_ID, msg)
            console.log('[نشر] تم إرسال نص للقناة:', CHANNEL_ID)
            return m.reply('✅ تم نشر النص في القناة!')
        } catch (e) {
            console.error('[نشر] خطأ في إرسال النص:', e)
            return m.reply(`❌ فشل النشر:\n${e.message || e}`)
        }
    }

    // ─── الحالة 2: ميديا ──────────────────────────────────────────────────
    await m.reply('⏳ جاري تحميل الميديا ورفعها للقناة...')

    // تنزيل الميديا
    let media
    try {
        media = await q.download()
    } catch (e) {
        return m.reply(`❌ فشل تنزيل الملف: ${e.message || e}`)
    }

    if (!media || media.length === 0) {
        return m.reply('❌ الملف فارغ أو منتهي الصلاحية.')
    }

    const caption = text || q.text || ''

    try {
        // للميديا نستخدم sendMessage لأنه يتولى الرفع لمسار القناة تلقائياً
        // (NEWSLETTER_MEDIA_PATH_MAP) وهو مدعوم في هذا الإصدار من baileys
        if (/image/.test(mime)) {
            await conn.sendMessage(CHANNEL_ID, { image: media, caption })
        } else if (/video/.test(mime)) {
            await conn.sendMessage(CHANNEL_ID, { video: media, caption })
        } else if (/audio/.test(mime)) {
            await conn.sendMessage(CHANNEL_ID, { audio: media, mimetype: 'audio/mpeg', ptt: false })
        } else {
            const fileName = q.msg?.fileName || `File_${Date.now()}`
            await conn.sendMessage(CHANNEL_ID, {
                document: media,
                mimetype: mime.split(';')[0].trim() || 'application/octet-stream',
                fileName
            })
        }

        console.log('[نشر] تم إرسال ميديا للقناة:', CHANNEL_ID, '| النوع:', mime)
        await m.reply('✅ تم النشر في القناة بنجاح!')

    } catch (e) {
        console.error('[نشر] خطأ في إرسال الميديا:', e)
        m.reply(`❌ فشل النشر:\n${e.message || e}`)
    }
}

handler.help    = ['نشر [نص أو رد على ميديا]']
handler.tags    = ['owner']
handler.command = /^(نشر|ارسل|ptvch)$/i
handler.owner   = true

export default handler
