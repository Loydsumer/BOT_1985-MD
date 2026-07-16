const IMG = 'https://raw.githubusercontent.com/Loydsumer/uploads1/refs/heads/main/files/Picsart_26-07-16_02-55-17-059.png'

const FUN_CONTENT = {
  نكتة: [
    '🤣 قال الطالب للمعلم: أستاذ، البيت مشتعل!\nقال المعلم: وش عندك من واجب؟\nقال: كل شيء! 😂',
    '🤣 دخل رجل للطبيب وقال: دكتور، أنا أنسى كل شيء!\nقال الطبيب: متى بدأ هذا؟\nقال الرجل: بدأ إيش؟ 😂',
    '🤣 سأل الأب ابنه: كيف كانت مدرستك اليوم؟\nقال الابن: مغلقة يا بابا.\nقال الأب: إذاً كيف رجعت؟ 😂',
    '🤣 قال المدرس: من يكتب جملة بها كلمة "نادر"؟\nقال الطالب: "نادر أذاكر" 😂'
  ],
  حكمة: [
    '💎 "إذا كانت الحياة درساً، فكن طالباً نهماً لا متأخراً."',
    '💎 "القلب الذي يعطي يجمع، والقلب الذي يمسك يفقد."',
    '💎 "لا تخبر أحداً بمشاكلك؛ 20% لن يهتموا، و80% سيفرحون."',
    '💎 "النجاح ليس نهاية الطريق، والفشل ليس نهاية المسير."',
    '💎 "التعلم هو الكنز الوحيد الذي يتبعك أينما ذهبت."',
    '💎 "من لم يشكر الناس لم يشكر الله."'
  ],
  معلومة: [
    '🧠 عين النحلة ترى أشعة فوق البنفسجية، وهو ما لا يستطيع البشر رؤيته!',
    '🧠 القلب يضخ أكثر من 7500 لتر من الدم يومياً!',
    '🧠 الأخطبوط يمتلك 3 قلوب و9 أدمغة!',
    '🧠 الماء يمكن أن يكون في حالاته الثلاث في نفس الوقت عند درجة حرارة معينة.',
    '🧠 الصعق البرقي أشد حرارة 5 مرات من سطح الشمس!',
    '🧠 النوم أقل من 6 ساعات يضاعف خطر الإصابة بالأمراض القلبية.'
  ],
  اقتباس: [
    '✨ "أعظم مجد في الحياة لا يكمن في عدم السقوط، بل في الوقوف في كل مرة نسقط فيها." - نيلسون مانديلا',
    '✨ "التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم." - نيلسون مانديلا',
    '✨ "الفرصة لا تأتي إليك، أنت من يخلقها." - كريس غروسر',
    '✨ "لا تقل لا تستطيع قبل أن تجرب." - مجهول',
    '✨ "الوقت أثمن من الذهب، لذا استثمره بحكمة." - مجهول'
  ]
}

let handler = async (m, { conn, command, text }) => {
  const cmd = command.toLowerCase()

  const key = {
    نكتة: 'نكتة', نكت: 'نكتة',
    حكمة: 'حكمة', حكم: 'حكمة',
    معلومة: 'معلومة', معلومات: 'معلومة',
    اقتباس: 'اقتباس', اقتباسات: 'اقتباس'
  }[cmd]

  if (key && FUN_CONTENT[key]) {
    const items = FUN_CONTENT[key]
    const item = items[Math.floor(Math.random() * items.length)]
    const icons = { نكتة: '🤣', حكمة: '💎', معلومة: '🧠', اقتباس: '✨' }
    const icon = icons[key]

    const nativeFlow = {
      buttons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: `${icon} ${key} أخرى`, id: `.${cmd}` }) },
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📋 قسم التسلية', id: '.ق5' }) }
      ],
      messageParamsJson: '{}'
    }

    return await conn.sendMessage(m.chat, {
      image: { url: IMG },
      caption: `> ${icon} *${key}*`,
      footer: [
        `> ╭━━━━━━━━━━━━━━╮`,
        `> ┃   【 ${icon} ${key} 】`,
        `> ╰━━━━━━━━━━━━━━╯`,
        ``,
        `> ${item}`,
        ``,
        `> ╰─────────────🌑`
      ].join('\n'),
      nativeFlow
    }, { quoted: m })
  }

  // قائمة قسم التسلية
  const name = conn.getName(m.sender) || 'المستخدم'

  const nativeFlow = {
    buttons: [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: '🎉 قـسـم الـتـسـلـيـة',
          sections: [{
            title: '🎪 اختر نوع الترفيه',
            highlight_label: '',
            rows: [
              { header: '', title: '🤣 نكتة', description: 'نكتة مضحكة', id: '.نكتة' },
              { header: '', title: '💎 حكمة', description: 'حكمة يومية', id: '.حكمة' },
              { header: '', title: '🧠 معلومة', description: 'معلومة مثيرة', id: '.معلومة' },
              { header: '', title: '✨ اقتباس', description: 'اقتباس ملهم', id: '.اقتباس' }
            ]
          }]
        })
      },
      { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🏠 القائمة الرئيسية', id: '.menu2' }) }
    ],
    messageParamsJson: '{}'
  }

  await conn.sendMessage(m.chat, {
    image: { url: IMG },
    caption: `> 🎪 *قـسـم الـتـسـلـيـة*`,
    footer: [
      `> ╮━━━━━━━━━━━━━━╭`,
      `        ┃    【 𝑾𝑬𝑳𝑪𝑶𝑴𝑬 】    ┃`,
      `> ╯━━━━━━━━━━━━━━╰`,
      `─────────🌑`,
      `│ اسـم الـمـسـتـخـدم: ${name}`,
      `╰─────────🌑`,
      '┃ ⌞ نـكـتـة ⌝',
      '┃ ⌞ حـكـمـة ⌝',
      '┃ ⌞ مـعـلـومـة ⌝',
      '┃ ⌞ اقـتـبـاس ⌝',
      `╰─────────🌑`,
      `> *❑┊•≫ ࢪابــط الـقـنـاة↶*`,
      `> *⌊ https://whatsapp.com/channel/0029Vb6kG3s0AgW2lYD8ad1L ⌉*`,
      `↳ 𝐍𝚵𝐖𝐒𝐋𝚵𝐓𝐓𝚵𝐑 : 120363402804601196@newsletter`
    ].join('\n'),
    nativeFlow
  }, { quoted: m })
}

handler.command = /^(ق5|نكتة|نكت|حكمة|حكم|معلومة|معلومات|اقتباس|اقتباسات)$/i
handler.tags = ['fun']

export default handler
