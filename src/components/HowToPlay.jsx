import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Sword, Crown } from 'lucide-react';

const copy = {
  th: {
    topLabel: 'คู่มือเกม',
    title: 'How to play',
    cardTypesTitle: 'คำอธิบายการ์ด',
    stepsTitle: 'วิธีเล่น',
    stepsIntro: 'สรุปลำดับการเล่นแบบเร็ว ๆ ก่อนเริ่มเกมจริง',
    steps: [
      '1. เมื่อเริ่ม Turn ผู้เล่นจะทำการจั่วการ์ด 1 ใบจาก deck',
      '2. เมื่อทำการจั่วการ์ดแล้ว จะทำการลงการ์ดบนสนาม โดยที่ Turn แรกจะไม่สามารถโจมตีหรือกระทำ damage ใดๆ ใส่ผู้เล่นฝั่งตรงข้ามได้',
      '3. การ์ดบนมือสามารถมีได้ 5 ใบ หากเกินกว่านั้นหรือไม่สามารถลงการ์ดในมือบนสนามได้ จำเป็นจะต้องทิ้งการ์ดในมือให้เหลือเพียง 5 ใบ',
      '4. การลงการ์ดบนสนาม',
      '- การ์ด Unit และ Guard สามารถอยู่บนสนามรวมกันได้ไม่เกิน 5 ใบ',
      '- การ์ด Trap และ Spell สามารถอยู่บนสนามรวมกันได้ไม่เกิน 3 ใบ',
      '5. การโจมตี จากที่กล่าวไปข้างต้นใน Turn แรกผู้เล่นทั้ง 2 ฝ่ายจะไม่สามารถโจมตีหรือกระทำ damage ใดๆ ใส่ผู้เล่นฝั่งตรงข้ามได้',
      '6. หากบนสนามมีการ์ด Guard ผู้เล่นจะต้องทำการโจมตีไปที่การ์ด Guard ให้หมดก่อนจึงจะสามารถโจมตีการ์ดอื่นๆ หรือตัวผู้เล่นได้',
      '7. การ์ดที่ถูกทิ้งหรือการ์ดที่ถูกทำลายลงไปแล้ว จะถูกส่งไปอยู่ที่ Grave',
    ],
    cardTypes: [
      {
        title: '1. Unit card',
        text: 'การ์ด Unit เป็นการ์ดที่ใช้ในการต่อสู้ และมีความสามารถและพลังที่แตกต่างกันออกไป',
      },
      {
        title: '2. Trap card',
        text: 'การ์ดประเภทนี้ จะเป็นการ์ดที่ต้องมีการ Set เอาไว้ก่อน และการ์ดจะทำงานก็ต่อเมื่อผู้เล่นฝั่งตรงข้ามทำตามเงื่อนไขของการ์ด',
      },
      {
        title: '3. Guard card',
        text: 'การ์ดประเภท Unit ที่ไม่สามารถโจมตีได้ แต่จะใช้เป็นการ์ดสำหรับการป้องกัน เมื่อมี Guard Unit อยู่บนสนาม คู่แข่งต้องโจมตีไปที่ Guard Unit ก่อน',
      },
      {
        title: '4. Spell card',
        text: 'เป็นการ์ดที่ใช้เพื่อร่ายพลังที่มีผลต่อการ์ดในสนามหรือผู้เล่น เช่น การสร้างความเสียหายใส่พลังชีวิตอีกฝ่าย หรือการทำลายการ์ด Unit ของฝ่ายตรงข้าม',
      },
    ],
    notesTitle: 'Notes for the guide',
    notes: [
      'ใช้ภาพนี้เป็นตัวอธิบายโครงสร้างการ์ดได้เลย',
      'ถ้าจะเพิ่มภาษาอังกฤษ/ไทยสลับได้ ผมจัดให้ได้อีก',
      'ตอนนี้ปุ่ม `?` เปิดหน้านี้ได้แล้ว',
    ],
    footer: 'ถ้าต้องการ ผมสามารถปรับหน้านี้ให้เหมือนรูปตัวอย่างแบบเป๊ะ ๆ ได้ต่ออีกขั้น',
    back: 'กลับไปเกม',
  },
  en: {
    topLabel: 'Game Guide',
    title: 'How to play',
    cardTypesTitle: 'Card guide',
    stepsTitle: 'How to play',
    stepsIntro: 'A quick summary of the turn flow before the match starts.',
    steps: [
      '1. At the start of your turn, draw 1 card from the deck.',
      '2. After drawing, you can play cards on the field. On the first turn, neither player can attack or deal damage to the opponent.',
      '3. Your hand can hold up to 5 cards. If you have more than 5, or you cannot play them, you must discard down to 5 cards.',
      '4. Playing cards on the field',
      '- Unit and Guard cards can stay on the field up to 5 cards total.',
      '- Trap and Spell cards can stay on the field up to 3 cards total.',
      '5. Attacking: as mentioned above, on the first turn both players cannot attack or deal any damage to the opponent.',
      '6. If there is a Guard card on the field, you must attack Guard cards first before you can attack other cards or the player.',
      '7. Cards that are discarded or destroyed are sent to the Grave.',
    ],
    cardTypes: [
      {
        title: '1. Unit card',
        text: 'Unit cards are used for battle and each one has different stats and abilities.',
      },
      {
        title: '2. Trap card',
        text: 'These cards must be Set first, then they activate only when the opponent meets the card condition.',
      },
      {
        title: '3. Guard card',
        text: 'A Unit card that cannot attack, but is used for defense. If a Guard Unit is on the field, the opponent must attack it first.',
      },
      {
        title: '4. Spell card',
        text: 'Spell cards are used to cast effects on the field or players, such as dealing damage or destroying the opponent’s Unit cards.',
      },
    ],
    notesTitle: 'Notes for the guide',
    notes: [
      'You can use this image to explain the card layout.',
      'If you want, I can make the page switch between Thai and English more prominently.',
      'The `?` button already opens this page.',
    ],
    footer: 'If you want, I can make this page match your reference image even more closely.',
    back: 'Back to game',
  },
};

export default function HowToPlay() {
  const [lang, setLang] = useState('th');
  const t = copy[lang];

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <button
            onClick={() => { window.location.hash = '#/game'; }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </button>
          <div className="flex items-center gap-2 text-white/70">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">How to play</span>
          </div>
        </div>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_42%),linear-gradient(180deg,_rgba(15,15,15,0.96),_rgba(0,0,0,1))] px-5 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:px-8 md:py-10">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
          <div className="absolute left-0 bottom-0 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-white/45">{t.topLabel}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">{t.title}</h1>
            </div>

            <div className="flex rounded-full border border-white/10 bg-black/40 p-1">
              <button
                onClick={() => setLang('th')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${lang === 'th' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
              >
                ไทย
              </button>
              <button
                onClick={() => setLang('en')}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${lang === 'en' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-8 space-y-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 md:p-6">
              <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-black shadow-2xl">
                <img
                  src="/help-card-guide.png"
                  alt="Card type explanation guide"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-300" />
                <h2 className="text-xl font-black">{t.cardTypesTitle}</h2>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {t.cardTypes.map((cardType) => (
                  <article key={cardType.title} className="rounded-[1.5rem] bg-[#666666] px-5 py-4 text-white shadow-lg">
                    <h3 className="text-lg font-black">{cardType.title}</h3>
                    <p className="mt-2 text-sm leading-6 font-semibold text-white/95">{cardType.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Sword className="h-5 w-5 text-amber-300" />
                <h2 className="text-xl font-black">{t.stepsTitle}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">{t.stepsIntro}</p>
              <ol className="mt-4 space-y-3">
                {t.steps.map((step) => (
                  <li
                    key={step}
                    className={`flex gap-3 rounded-2xl border px-4 py-3 ${
                      step.startsWith('-')
                        ? 'ml-8 border-white/8 bg-black/20'
                        : 'border-white/10 bg-black/30'
                    }`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-full font-black text-black ${
                        step.startsWith('-')
                          ? 'h-6 w-6 bg-white/80 text-xs'
                          : 'h-8 w-8 bg-white text-sm'
                      }`}
                    >
                      {step.match(/^\d+/)?.[0] ?? '•'}
                    </div>
                    <p className={`text-sm leading-6 text-white/85 ${step.startsWith('-') ? 'pt-0.5' : ''}`}>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
