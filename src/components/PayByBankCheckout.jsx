'use client'

// "Brand customisations" on the Integration page (Server to Server): the design rules, Token.io's
// downloads, which element to use, and a builder for the button and the mark. Everything
// follows Token.io's Pay by Bank design system (Nov 2026). The previews use the generic bank icon
// only: Token.io's permission doesn't cover banks' app icons.
import '@fontsource-variable/inter'

import { Radio as HeadlessRadio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import { useState } from 'react'

import { CodeWindow } from '@/components/CodeWindow'
import { Col, Row } from '@/components/content'
import { Heading } from '@/components/Heading'
import { Callout, SpecGrid } from '@/components/openBanking'
import { highlightHtml } from '@/lib/highlight'

export const CHECKOUT_SECTION = { id: 'brand-customisations', title: 'Brand customisations' }

const INTER = "'Inter Variable', Inter, system-ui, sans-serif"

// Token.io's downloads (Google Drive), from the design system's Basics page
const DOWNLOADS = [
  { label: 'Pay by Bank buttons', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/13SWDc_5MLZIN_UAZ-K7xcwynLV44eOJc' },
  { label: 'Bank icon mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/1HgPiyaoa-iQXfKYiHknFQWQcmHSbZEIt' },
  { label: 'App icon mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/1qaNAt-rUemcl0J2MsJPIBbPe_kCy24in' },
  { label: 'Word mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/13iIvewb8WG4bW18fxF-Bz2L-PlccVRWG' },
  { label: 'Inter font', meta: 'Google Fonts', href: 'https://fonts.google.com/specimen/Inter' },
]

// The generic bank icon (a temple) and the plus sign that means "and many more banks"
const TEMPLE = 'M12 1.5 1.5 7v2.5h21V7L12 1.5ZM3.25 11h2.5v8h-2.5zM8.25 11h2.5v8h-2.5zM13.25 11h2.5v8h-2.5zM18.25 11h2.5v8h-2.5zM1.5 20h21v2.5h-21z'
const PLUS = 'M33 6.5v11M27.5 12h11'
const ICON_SVG = `<svg viewBox="0 0 40 24" aria-hidden="true"><path fill="currentColor" d="${TEMPLE}"/><path fill="none" stroke="currentColor" stroke-width="1.75" d="${PLUS}"/></svg>`

function BankIconMark({ className, style }) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" className={clsx('flex-none', className)} style={style}>
      <path fill="currentColor" d={TEMPLE} />
      <path fill="none" stroke="currentColor" strokeWidth="1.75" d={PLUS} />
    </svg>
  )
}

const BRAND_DEFAULT = '#0190f7'

// Readable text on a custom colour: black on light colours, white on dark ones
function textOn(hex) {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#000000' : '#ffffff'
}

// Token.io's colours for the generic bank icon. Light grey is #f7f7f7 (#f2f2f2 with app icons).
// Marks take white, black or your colour. Borders are 2px and go on white backgrounds only.
const BACKGROUNDS = [
  { id: 'white', label: 'White', hex: '#ffffff' },
  { id: 'grey', label: 'Light grey', hex: '#f7f7f7', button: true },
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'brand', label: 'Your colour' },
]
const BORDERS = [
  { id: 'none', label: 'None' },
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'grey', label: 'Grey', hex: '#b4b4b4' },
  { id: 'brand', label: 'Your colour', button: true },
]

function colours({ bg, border, brand }) {
  let fill = bg === 'brand' ? brand : BACKGROUNDS.find((b) => b.id === bg).hex
  let line = bg !== 'white' || border === 'none' ? null : border === 'brand' ? brand : BORDERS.find((b) => b.id === border).hex
  return { bg: fill, border: line, text: textOn(fill) }
}

function buttonCode(c) {
  return [
    '<!-- Inter, from Google Fonts -->',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">',
    '',
    '<style>',
    '  .pay-by-bank {',
    '    display: inline-flex;',
    '    min-height: 48px;',
    '    padding: 0 32px;',
    '    align-items: center;',
    '    justify-content: center;',
    '    gap: 0.5em;',
    '    font: 400 18px/1 Inter, system-ui, sans-serif;',
    '    letter-spacing: -0.03em;',
    `    color: ${c.text};`,
    `    background: ${c.bg};`,
    `    border: ${c.border ? `2px solid ${c.border}` : '0'};`,
    '    border-radius: 6px;',
    '    cursor: pointer;',
    '  }',
    '  .pay-by-bank strong { font-weight: 700; }',
    '  .pay-by-bank svg { height: 1em; flex: none; }',
    '</style>',
    '',
    '<button type="submit" class="pay-by-bank">',
    '  <span>Pay by <strong>Bank</strong></span>',
    `  ${ICON_SVG}`,
    '</button>',
  ].join('\n')
}

function markCode(c) {
  return [
    '<style>',
    '  .payment-option {',
    '    display: flex;',
    '    align-items: center;',
    '    gap: 12px;',
    '    padding: 16px;',
    '    cursor: pointer;',
    '  }',
    '  .pay-by-bank-mark {',
    '    display: inline-flex;',
    '    margin-left: auto;',
    '    height: 40px;',
    '    padding: 0 10px;',
    '    align-items: center;',
    `    color: ${c.text};`,
    `    background: ${c.bg};`,
    `    border: ${c.border ? `2px solid ${c.border}` : '0'};`,
    '    border-radius: 6px;',
    '  }',
    '  .pay-by-bank-mark svg { height: 22px; }',
    '</style>',
    '',
    '<label class="payment-option">',
    '  <input type="radio" name="payment-method" value="pay-by-bank">',
    '  Pay by Bank',
    `  <span class="pay-by-bank-mark">${ICON_SVG}</span>`,
    '</label>',
  ].join('\n')
}

// The previews: Token.io's button, the mark in a payment list, and the word mark
function ButtonPreview({ c, size = 18 }) {
  return (
    <span
      className="inline-flex items-center justify-center gap-[0.5em] rounded-md px-8 leading-none"
      style={{
        fontFamily: INTER,
        fontSize: size,
        letterSpacing: '-0.03em',
        minHeight: size * 2.67,
        color: c.text,
        background: c.bg,
        border: c.border ? `2px solid ${c.border}` : 0,
      }}
    >
      <span>
        Pay by <strong className="font-bold">Bank</strong>
      </span>
      <BankIconMark style={{ height: '1em' }} />
    </span>
  )
}

function Mark({ c, height = 40 }) {
  return (
    <span
      className="inline-flex flex-none items-center rounded-md"
      style={{ height, padding: `0 ${height / 4}px`, color: c.text, background: c.bg, border: c.border ? `2px solid ${c.border}` : 0 }}
    >
      <BankIconMark style={{ height: height * 0.55 }} />
    </span>
  )
}

function PaymentList({ c, compact }) {
  let rows = [
    { label: 'Pay by Bank', mark: <Mark c={c} height={compact ? 28 : 40} />, on: true },
    { label: 'Card', mark: <span className={clsx('flex-none rounded-md bg-zinc-200', compact ? 'h-7 w-11' : 'h-10 w-16')} /> },
    { label: 'Buy now, pay later', mark: <span className={clsx('flex-none rounded-md bg-zinc-200', compact ? 'h-7 w-11' : 'h-10 w-16')} /> },
  ].slice(0, compact ? 2 : 3)
  return (
    <div className="w-full divide-y divide-zinc-200 overflow-hidden rounded-lg bg-white text-left text-zinc-900 ring-1 ring-zinc-200">
      {rows.map((r) => (
        <div key={r.label} className={clsx('flex items-center gap-3', compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm')}>
          <span className={clsx('flex-none rounded-full ring-1', compact ? 'size-3' : 'size-4', r.on ? 'bg-white ring-[5px] ring-zinc-900' : 'ring-zinc-300')} />
          <span className="flex-auto">{r.label}</span>
          {r.mark}
        </div>
      ))}
    </div>
  )
}

function WordMark({ size = 20 }) {
  return (
    <span
      className="inline-flex flex-col rounded-md border-2 border-black bg-white px-[0.45em] py-[0.3em] text-black"
      style={{ fontFamily: INTER, fontSize: size, lineHeight: 0.95, letterSpacing: '-0.03em' }}
    >
      <span>Pay by</span>
      <strong className="font-bold" style={{ fontSize: '1.35em' }}>
        Bank
      </strong>
    </span>
  )
}

const WHITE = { bg: '#ffffff', border: '#000000', text: '#000000' }

const ELEMENTS = [
  {
    title: 'Button',
    text: 'Where one click starts the payment, such as the basket or a top-up.',
    preview: <ButtonPreview c={WHITE} size={14} />,
  },
  {
    title: 'Mark',
    text: 'In a list of payment options, next to the words “Pay by Bank”. It’s what most shoppers see.',
    preview: <PaymentList c={WHITE} compact />,
  },
  {
    title: 'Word mark',
    text: 'To show you accept Pay by Bank, in a footer or on a product page. It never starts a payment.',
    preview: <WordMark size={15} />,
  },
]

function ElementCards() {
  return (
    <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:max-w-none">
      {ELEMENTS.map((e) => (
        <div key={e.title} className="overflow-hidden rounded-2xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
          <div className="flex h-32 items-center justify-center bg-zinc-50 px-4 dark:bg-white/2.5">{e.preview}</div>
          <div className="p-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{e.title}</h4>
            <p className="mt-1 text-sm/6 text-zinc-600 dark:text-zinc-400">{e.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function Segmented({ label, value, onChange, options }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label={label} className="inline-flex rounded-lg bg-zinc-900/5 p-0.5 dark:bg-white/5">
      {options.map((o) => (
        <HeadlessRadio
          key={o.value}
          value={o.value}
          className="cursor-pointer rounded-md px-3 py-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 focus:outline-none data-checked:bg-white data-checked:text-zinc-900 data-checked:shadow-sm data-checked:ring-1 data-checked:ring-zinc-900/5 data-focus:ring-2 data-focus:ring-emerald-500 dark:text-zinc-400 dark:hover:text-white dark:data-checked:bg-zinc-800 dark:data-checked:text-white dark:data-checked:ring-white/10"
        >
          {o.label}
        </HeadlessRadio>
      ))}
    </RadioGroup>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="mt-6 first:mt-0">
      <div className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">{label}</div>
      {children}
      {hint && <p className="mt-2 text-xs/5 text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  )
}

function Swatch({ hex, none }) {
  return (
    <span
      className={clsx('relative size-4 flex-none overflow-hidden rounded-full ring-1 ring-zinc-900/15 dark:ring-white/20', none && 'bg-white')}
      style={hex ? { background: hex } : undefined}
    >
      {none && <span className="absolute top-1/2 left-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-zinc-400" />}
    </span>
  )
}

// A row of options, each with a colour swatch
function SwatchChoice({ label, value, onChange, options, disabled }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label={label} disabled={disabled} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <HeadlessRadio
          key={o.id}
          value={o.id}
          className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-900/10 transition hover:bg-zinc-50 focus:outline-none data-checked:ring-2 data-checked:ring-emerald-500 data-disabled:cursor-not-allowed data-disabled:opacity-40 data-disabled:hover:bg-transparent data-focus:ring-2 data-focus:ring-emerald-500 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/5 dark:data-checked:ring-emerald-400"
        >
          <Swatch hex={o.swatch} none={o.id === 'none'} />
          {o.label}
        </HeadlessRadio>
      ))}
    </RadioGroup>
  )
}

function Builder() {
  let [element, setElement] = useState('button')
  let [bg, setBg] = useState('white')
  let [border, setBorder] = useState('black')
  let [brand, setBrand] = useState(BRAND_DEFAULT)

  let button = element === 'button'
  let backgrounds = BACKGROUNDS.filter((b) => button || !b.button).map((b) => ({ ...b, swatch: b.hex || brand }))
  let borders = BORDERS.filter((b) => button || !b.button).map((b) => ({ ...b, swatch: b.id === 'brand' ? brand : b.hex }))
  let c = colours({ bg, border, brand })
  let code = button ? buttonCode(c) : markCode(c)

  // Marks don't come in light grey or with a border in your colour
  function changeElement(next) {
    setElement(next)
    if (next === 'mark') {
      if (bg === 'grey') setBg('white')
      if (border === 'brand') setBorder('black')
    }
  }

  return (
    <Row>
      <Col>
        <div className="not-prose">
          <Field label="Element">
            <Segmented
              label="Element"
              value={element}
              onChange={changeElement}
              options={[
                { value: 'button', label: 'Button' },
                { value: 'mark', label: 'Mark' },
              ]}
            />
          </Field>
          <Field label="Background" hint="The text and icon turn black or white to suit it.">
            <SwatchChoice label="Background" value={bg} onChange={setBg} options={backgrounds} />
          </Field>
          <Field label="Border" hint={bg === 'white' ? '2px wide.' : 'Borders go on white backgrounds only.'}>
            <SwatchChoice label="Border" value={bg === 'white' ? border : 'none'} onChange={setBorder} options={borders} disabled={bg !== 'white'} />
          </Field>
          {(bg === 'brand' || (bg === 'white' && border === 'brand')) && (
            <Field label="Your colour" hint="One colour only, never a gradient.">
              <label className="inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 ring-1 ring-zinc-900/10 dark:text-zinc-300 dark:ring-white/10">
                <input
                  type="color"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Your colour"
                />
                <code className="font-mono text-[0.8125rem]">{brand}</code>
              </label>
            </Field>
          )}
        </div>
      </Col>
      <Col sticky>
        <CodeWindow
          title={button ? 'Pay by Bank button' : 'Pay by Bank mark'}
          label="Your checkout page"
          code={code}
          html={highlightHtml(code)}
          codeTab="HTML"
          preview={
            <div className="flex min-h-56 items-center justify-center bg-white bg-[radial-gradient(var(--color-zinc-200)_1px,transparent_1px)] [background-size:12px_12px] p-6">
              {button ? <ButtonPreview c={c} /> : <div className="w-full max-w-sm"><PaymentList c={c} /></div>}
            </div>
          }
        />
      </Col>
    </Row>
  )
}

const RULES = [
  { term: 'Name', details: '“Pay by Bank”, with a capital P and B. Never hyphenated, and never “Pay By Bank”, “Open Banking” or “bank transfer”.' },
  { term: 'Font', details: 'Inter. “Pay by” regular and “Bank” bold, with −3% letter spacing.' },
  { term: 'Background', details: 'White or light grey. Black, or one colour of your own, with the generic bank icon only.' },
  { term: 'Border', details: '2px, black (#000000) or grey (#b4b4b4), on white backgrounds.' },
  { term: 'Effects', details: 'None: no shadows, glows, reflections or gradients.' },
  { term: 'Size', details: 'Text and icons the same height, half an icon’s width apart, and centred. Marks at least 40px tall.' },
]

function PaperClipIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// Token.io's files as an attachments list (Tailwind Plus description list attachments)
function Downloads() {
  return (
    <ul role="list" className="not-prose my-6 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-white/5 dark:border-white/10">
      {DOWNLOADS.map((d) => (
        <li key={d.label} className="flex items-center justify-between py-4 pr-5 pl-4 text-sm/6">
          <div className="flex w-0 flex-1 items-center">
            <PaperClipIcon className="size-5 flex-none text-zinc-400 dark:text-zinc-500" />
            <div className="ml-4 flex min-w-0 flex-1 flex-col sm:flex-row sm:gap-2">
              <span className="truncate font-medium text-zinc-900 dark:text-white">{d.label}</span>
              <span className="flex-none text-zinc-400 dark:text-zinc-500">{d.meta}</span>
            </div>
          </div>
          <a
            href={d.href}
            target="_blank"
            rel="noreferrer"
            className="ml-4 flex-none font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Download<span className="sr-only"> {d.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function PayByBankCheckout() {
  return (
    <>
      <hr />
      <Heading level={2} id={CHECKOUT_SECTION.id}>
        {CHECKOUT_SECTION.title}
      </Heading>
      <p>
        With Server to Server, you add Pay by Bank to your own checkout, and the shopper’s click starts step 1. Token.io’s Pay by Bank design
        system sets how it looks, so shoppers recognise it wherever they see it.
      </p>

      <h3>Design rules</h3>
      <p>Keep to these whether you use the builder below or design your own.</p>
      <SpecGrid items={RULES} />

      <h3>Downloads</h3>
      <p>Token.io’s buttons and marks, free to use with Pay by Bank.</p>
      <Downloads />

      <h3>Choose what to show</h3>
      <ElementCards />
      <p>
        Buttons and marks show either your market’s top three bank app icons with a plus sign, or a generic bank icon that works in every
        market.
      </p>
      <Callout type="warning" title="Bank app icons">
        Token.io’s permission doesn’t cover banks’ app icons, so you use them at your own risk. Check with your legal team first, or use the
        generic bank icon.
      </Callout>

      <h3>Build your button or mark</h3>
      <p>Choose the element, background and border, then copy the HTML into your checkout page. The builder uses the generic bank icon.</p>
      <Builder />
    </>
  )
}
