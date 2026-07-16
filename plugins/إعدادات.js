
import { ButtonV2 } from '../lib/NIXCODE.js'

// تعريف الأعلام القابلة للتبديل: المفتاح، النص المعروض، الوصف، والنطاق (chat/bot)
const CHAT_FLAGS = [
    { key: 'welcome',     label: '👋 رسائل الترحيب',        desc: 'ترحيب وتوديع الأعضاء' },
    { key: 'detect',      label: '🔍 الكشف التلقائي',        desc: 'كشف روابط/محتوى تلقائياً' },
    { key: 'delete',      label: '🗑️ Anti-Delete',           desc: 'إعادة نشر الرسائل المحذوفة' },
    { key: 'stickers',    label: '🖼️ أوامر الملصقات',        desc: 'تفعيل أوامر صنع الملصقات' },
    { key: 'autosticker', label: '✨ ملصق تلقائي',           desc: 'تحويل الصور تلقائياً لملصقات' },
    { key: 'audios',      label: '🔊 ردود صوتية',            desc: 'تفعيل الردود الصوتية' },
    { key: 'reaction',    label: '❤️ تفاعل تلقائي',          desc: 'ردود فعل تلقائية على الرسائل' },
    { key: 'viewonce',    label: '👁️ كشف المشاهدة الواحدة',  desc: 'إظهار محتوى view-once' },
    { key: 'modoadmin',   label: '🛡️ وضع الأدمن فقط',        desc: 'قصر الأوامر على المشرفين' },
    { key: 'autorespond', label: '🤖 الرد التلقائي',          desc: 'ردود تلقائية على رسائل معينة' },
    { key: 'game',        label: '🎮 الألعاب (1)',            desc: 'تفعيل ألعاب المجموعة' },
    { key: 'game2',       label: '🎲 الألعاب (2)',            desc: 'تفعيل ألعاب إضافية' },
    { key: 'simi',        label: '💬 الشات بوت (simi)',       desc: 'محادثة تفاعلية آلية' },
    { key: 'antiLink',    label: '🔗 منع الروابط',            desc: 'حذف رسائل تحتوي روابط' },
    { key: 'nsfw',        label: '🔞 محتوى NSFW',             desc: 'السماح بمحتوى للبالغين' },
    { key: 'economy',     label: '💰 نظام الاقتصاد',          desc: 'عملات/بنك/مستويات' },
    { key: 'gacha',       label: '🎰 نظام الجاشا',            desc: 'سحب الجاشا' },
    { key: 'isMute',      label: '🔇 كتم البوت',              desc: 'إيقاف ردود البوت مؤقتاً' },
    { key: 'isBanned',    label: '🚫 حظر البوت من المجموعة',  desc: 'تعطيل البوت بالكامل هنا' },
]

const BOT_FLAGS = [
    { key: 'self',      label: '👤 وضع Self',           desc: 'الرد على المالك فقط' },
    { key: 'autoread',  label: '📖 القراءة التلقائية',   desc: 'تعليم الرسائل كمقروءة تلقائياً' },
    { key: 'restrict',  label: '🔒 تقييد أوامر الأدمن',  desc: 'قصر أوامر admin-only' },
    { key: 'jadibotmd', label: '🧩 وضع Jadibot',        desc: 'السماح بتوليد بوتات فرعية' },
]

function statusEmoji(val) {
    return val ? '✅' : '❌'
}

const handler = async (m, { conn }) => {
    const chat = global.db.data.chats[m.chat] || {}
    const botSettings = global.db.data.settings[conn.user.jid] || {}

    const chatRows = CHAT_FLAGS.map(f => ({
        title: `${statusEmoji(chat[f.key])} ${f.label}`,
        description: f.desc,
        id: `.toggleflag chat ${f.key}`
    }))

    const botRows = BOT_FLAGS.map(f => ({
        title: `${statusEmoji(botSettings[f.key])} ${f.label}`,
        description: f.desc,
        id: `.toggleflag bot ${f.key}`
    }))

    await new ButtonV2(conn)
        .setBody(
            `⚙️ *لوحة تحكم الإعدادات*\n\n` +
            `اضغط على أي خيار لتفعيله/تعطيله.\n` +
            `✅ = مفعّل   |   ❌ = معطّل\n\n` +
            `القسم الأول: إعدادات المجموعة\n` +
            `القسم الثاني: إعدادات البوت العامة`
        )
        .setFooter('⚙️ SETTINGS PANEL')
        .addRawButton({
            buttonText: { displayText: '⚙️ فتح القائمة' },
            buttonId: 'settings_select',
            type: 1,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: JSON.stringify({
                    title: 'قائمة الإعدادات',
                    sections: [
                        { title: '📂 إعدادات المجموعة', rows: chatRows },
                        { title: '🤖 إعدادات البوت', rows: botRows }
                    ]
                })
            }
        })
        .send(m.chat)
}

// المعالج عند الضغط على أي عنصر من القائمة
handler.before = async (m, { conn, isOwner, isAdmin, isROwner }) => {
    if (!m.text || !m.text.startsWith('.toggleflag')) return false

    const [, scope, flagName] = m.text.trim().split(/\s+/)
    if (!scope || !flagName) return true

    // ✋ صلاحيات: بدّل هذا الشرط حسب سياستك (مثلاً: أدمن المجموعة فقط لـ chat)
    const allowed = isROwner || isOwner || isAdmin
    if (!allowed) {
        await m.reply('⚠️ هذا الخيار يتطلب صلاحية أدمن أو مالك.')
        return true
    }

    try {
        if (scope === 'chat') {
            const valid = CHAT_FLAGS.find(f => f.key === flagName)
            if (!valid) { await m.reply('❌ خيار غير معروف.'); return true }

            const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
            chat[flagName] = !chat[flagName]

            await m.reply(
                `${statusEmoji(chat[flagName])} تم ${chat[flagName] ? 'تفعيل' : 'تعطيل'} *${valid.label}*`
            )
        } else if (scope === 'bot') {
            const valid = BOT_FLAGS.find(f => f.key === flagName)
            if (!valid) { await m.reply('❌ خيار غير معروف.'); return true }

            const botSettings = global.db.data.settings[conn.user.jid] || (global.db.data.settings[conn.user.jid] = {})
            botSettings[flagName] = !botSettings[flagName]

            await m.reply(
                `${statusEmoji(botSettings[flagName])} تم ${botSettings[flagName] ? 'تفعيل' : 'تعطيل'} *${valid.label}*`
            )
        } else {
            await m.reply('❌ نطاق غير معروف.')
        }
    } catch (e) {
        console.error('[settings_menu toggle]', e)
        await m.reply('❌ حدث خطأ أثناء تحديث الإعداد.')
    }

    return true
}

handler.command = ['settings', 'اعدادات', 'الاعدادات', 'setting']
handler.owner = true
export default handler