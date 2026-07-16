// plugins/menu2.js

let handler = async (m, { conn, usedPrefix, command }) => {
  // جلب البيانات
  let name = conn.getName(m.sender);
  let user = global.db.data.users[m.sender];
  let level = user ? user.level : '0';
  let uptime = clockString(process.uptime());

  const content = {
    interactiveMessage: {
      body: { text: "" },
      footer: { text: "" },
      nativeFlowMessage: {
        buttons: [
          { name: "", buttonParamsJson: "" },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "أقـسـام الأوامـر",
              icon: "DOCUMENT",
              sections: [
                {
                  title: "📂 الأقـسـام",
                  highlight_label: "",
                  rows: [
                    { header: "", title: "قـسـم الأدمـن", description: "...", id: ".ق1" },
                    { header: "", title: "قـسـم الألـعـاب", description: "...", id: ".ق2" },
                    { header: "", title: "قـسـم الـتـحـمـيـلات", description: "...", id: ".ق3" },
                    { header: "", title: "قـسـم الـذكـاء", description: "...", id: ".ق4" },
                    { header: "", title: "قـسـم الـتـسـلـيـة", description: "...", id: ".ق5" },
                    { header: "", title: "قـسـم الاسـتـيـكـر", description: "...", id: ".ق6" },
                    { header: "", title: "قـسـم الـصـور", description: "...", id: ".ق7" },
                    { header: "", title: "قـسـم الـنـقـابـات", description: "...", id: ".ق8" }
                  ]
                }
              ]
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "كـل الأوامـر",
              id: ".allmenu",
              icon: "REVIEW"
            })
          }
        ],
        messageParamsJson: "{}"
      }
    }
  }

  await conn.sendMessage(m.chat, {
    image: { url: 'https://raw.githubusercontent.com/Loydsumer/uploads1/refs/heads/main/files/Picsart_26-07-16_02-55-17-059.png' },
    caption: content.interactiveMessage.body.text,
    footer: [
      `> ╮━━━━━━━━━━━━━━╭`,
      `        ┃    【 𝑾𝑬𝑳𝑪𝑶𝑴𝑬 】    ┃`,
      `> ╯━━━━━━━━━━━━━━╰`,
      `─────────🌑`,
      `│ اسـم الـمـسـتـخـدم: ${name}`,
      `╰─────────🌑`,
      '┃ ⌞ صفـع ⌝',
      '┃ ⌞ هل ⌝',
      '┃ ⌞ زنجي ⌝',
      '┃ ⌞ جميل ⌝',
      '┃ ⌞ كومنت ⌝',
      '┃ ⌞ تويته ⌝',
      '┃ ⌞ شخصية ⌝',
      '┃ ⌞ حقيقة ⌝',
      '┃ ⌞ أنا ⌝',
      '┃ ⌞ حكمة ⌝',
      '┃ ⌞ بوسـت ⌝',
      '┃ ⌞ ميمز ⌝',
      '┃ ⌞ غزل ⌝',
      '┃ ⌞ صراحة ⌝',
      '┃ ⌞ رابطـي ⌝',
      '╰─────────🌑',
      `> *❑┊•≫ ࢪابــط الـقـنـاة↶*`,
      `> *⌊ https://whatsapp.com/channel/0029Vb6kG3s0AgW2lYD8ad1L ⌉*`,
      `↳ 𝐍𝚵𝐖𝐒𝐋𝚵𝐓𝐓𝚵𝐑 : 120363402804601196@newsletter`,
      `> *❑┊•≫ ࢪابــط قـنـاتـي ثـانـيـة↶*`,
      `> *⌊ https://whatsapp.com/channel/0029VaugXE6J93wQZ0CFeH3Y ⌉*`,
      `↳ 𝐍𝚵𝐖𝐒𝐋𝚵𝐓𝐓𝚵𝐑 : 120363377374711810@newsletter`
    ].join('\n'),
    nativeFlow: content.interactiveMessage.nativeFlowMessage
  }, { quoted: m })
}

function clockString(seconds) {
  seconds = Number(seconds);
  let d = Math.floor(seconds / (3600 * 24));
  let h = Math.floor(seconds % (3600 * 24) / 3600);
  let m = Math.floor(seconds % 3600 / 60);
  let s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

handler.help = ['menu2']
handler.tags = ['owner']
handler.command = /^(ق1)$/i


export default handler
