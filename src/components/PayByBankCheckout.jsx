'use client'

// "Brand customisations" on the Integration page (Server to Server): Token.io's assets, then a
// builder for the Pay by Bank button whose options are only what Token.io's Pay by Bank design
// system (Nov 2026) allows; fixed parts are locked and effects are crossed out. The preview uses
// placeholder tiles for bank app icons: Token.io's permission doesn't cover real ones.
import '@fontsource-variable/inter'

import { Radio as HeadlessRadio, RadioGroup } from '@headlessui/react'
import clsx from 'clsx'
import { useState } from 'react'

import { CodeWindow } from '@/components/CodeWindow'
import { Col, Row } from '@/components/content'
import { Heading } from '@/components/Heading'
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


// What Token.io's design system allows on a button. With bank app icons the background is
// white or #f2f2f2 only, with a black or grey border; the generic icon also takes black or
// one colour of your own. Borders are 2px and go on white backgrounds only.
const ICONS = [
  { id: 'generic', label: 'Generic bank icon', text: 'Works in every market.' },
  { id: 'apps', label: 'Bank app icons', text: 'Your market’s top three banks.' },
]
const BACKGROUNDS = [
  { id: 'white', label: 'White', hex: () => '#ffffff' },
  { id: 'grey', label: 'Light grey', hex: (icon) => (icon === 'apps' ? '#f2f2f2' : '#f7f7f7') },
  { id: 'black', label: 'Black', hex: () => '#000000', generic: true },
  { id: 'brand', label: 'Your colour', generic: true },
]
const BORDERS = [
  { id: 'none', label: 'None' },
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'grey', label: 'Grey', hex: '#b4b4b4' },
  { id: 'brand', label: 'Your colour', generic: true },
]
const EFFECTS = ['Shadow', 'Glow', 'Reflection', 'Gradient']

// Placeholder colours for the bank app icons in the preview (not real banks)
const APP_TILES = ['#2563eb', '#be123c', '#059669']

function settle({ icon, bg, border, brand }) {
  let fill = bg === 'brand' ? brand : BACKGROUNDS.find((b) => b.id === bg).hex(icon)
  let line = bg !== 'white' || border === 'none' ? null : border === 'brand' ? brand : BORDERS.find((b) => b.id === border).hex
  return { icon, bg: fill, border: line, text: textOn(fill) }
}

function buttonCode(c) {
  let apps = c.icon === 'apps'
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
    ...(apps
      ? [
          '  .pay-by-bank-icons { display: inline-flex; gap: 0.17em; }',
          '  .pay-by-bank-icons img,',
          '  .pay-by-bank-more { width: 1.15em; height: 1.15em; border-radius: 25%; }',
          '  /* Give icons with a white background a 2px #b4b4b4 border */',
          '  .pay-by-bank-more {',
          '    display: inline-flex;',
          '    align-items: center;',
          '    justify-content: center;',
          '    color: #ffffff;',
          '    background: #b4b4b4;',
          '  }',
        ]
      : ['  .pay-by-bank svg { height: 1em; flex: none; }']),
    '</style>',
    '',
    '<button type="submit" class="pay-by-bank">',
    '  <span>Pay by <strong>Bank</strong></span>',
    ...(apps
      ? [
          '  <span class="pay-by-bank-icons" aria-hidden="true">',
          '    <!-- Your market’s top three banks’ app icons, from the App Store -->',
          '    <img src="bank-app-icon-1.png" alt="">',
          '    <img src="bank-app-icon-2.png" alt="">',
          '    <img src="bank-app-icon-3.png" alt="">',
          '    <span class="pay-by-bank-more">+</span>',
          '  </span>',
        ]
      : [`  ${ICON_SVG}`]),
    '</button>',
  ].join('\n')
}

function AppIcons() {
  return (
    <span className="inline-flex gap-[0.17em]" aria-hidden="true">
      {APP_TILES.map((t) => (
        <span key={t} className="size-[1.15em] rounded-[25%]" style={{ background: t }} />
      ))}
      <span className="inline-flex size-[1.15em] items-center justify-center rounded-[25%] bg-[#b4b4b4] text-white">
        <svg viewBox="0 0 10 10" className="size-[0.6em]" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </span>
    </span>
  )
}

function ButtonPreview({ c, size = 18, pad = '1.75em' }) {
  return (
    <span
      className="inline-flex items-center justify-center gap-[0.5em] rounded-md leading-none whitespace-nowrap"
      style={{
        paddingInline: pad,
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
      {c.icon === 'apps' ? <AppIcons /> : <BankIconMark style={{ height: '1em' }} />}
    </span>
  )
}

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
    </svg>
  )
}

// One setting: its name and rule on the left, the control on the right (stacked on small screens)
function Setting({ label, rule, children }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-zinc-900/7.5 py-5 first:border-t-0 first:pt-0 sm:grid-cols-[9.5rem_1fr] dark:border-white/10">
      <div>
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</div>
        <p className="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">{rule}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// The icon as picture cards, with a check on the chosen one
function IconCards({ value, onChange }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label="Icon" className="grid grid-cols-2 gap-3">
      {ICONS.map((o) => (
        <HeadlessRadio key={o.id} value={o.id} className="group cursor-pointer focus:outline-none">
          <div className="relative flex h-20 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 ring-1 ring-zinc-900/10 transition group-hover:bg-zinc-100 group-data-checked:ring-2 group-data-checked:ring-emerald-500 group-data-focus:ring-2 group-data-focus:ring-emerald-500 dark:bg-white/5 dark:ring-white/10 dark:group-data-checked:ring-emerald-400">
            <ButtonPreview c={settle({ icon: o.id, bg: 'white', border: 'black', brand: BRAND_DEFAULT })} size={10} pad="1em" />
            <CheckIcon className="absolute bottom-1.5 left-1.5 size-5 text-emerald-500 opacity-0 transition group-data-checked:opacity-100" />
          </div>
          <div className="mt-2 text-xs font-medium text-zinc-900 dark:text-white">{o.label}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{o.text}</div>
        </HeadlessRadio>
      ))}
    </RadioGroup>
  )
}

// Colour dots in a pill track. Options the rules don't allow are crossed out.
function Dots({ label, value, onChange, options, disabled }) {
  let current = options.find((o) => o.id === value)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <RadioGroup value={value} onChange={onChange} aria-label={label} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 p-1.5 dark:bg-white/5">
        {options.map((o) => (
          <HeadlessRadio
            key={o.id}
            value={o.id}
            disabled={Boolean(o.off || disabled)}
            title={o.off ? `${o.label}: ${o.off}` : o.label}
            className={clsx(
              'group relative flex h-7 cursor-pointer items-center justify-center rounded-full focus:outline-none data-checked:ring-2 data-checked:ring-emerald-500 data-checked:ring-offset-2 data-checked:ring-offset-zinc-100 data-disabled:cursor-not-allowed data-focus:ring-2 data-focus:ring-emerald-500 dark:data-checked:ring-emerald-400 dark:data-checked:ring-offset-zinc-900',
              !o.text && 'w-7',
            )}
          >
            {!o.text && <span className="sr-only">{o.label}</span>}
            {o.text ? (
              <span className="flex h-7 items-center rounded-full bg-white px-2.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-900/10 group-data-disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10">{o.text}</span>
            ) : (
              <span className="size-6 rounded-full ring-1 ring-zinc-900/15 group-data-disabled:opacity-30 dark:ring-white/20" style={{ background: o.hex }} />
            )}
            {o.off && <span className="absolute h-0.5 w-8 -rotate-45 rounded-full bg-zinc-500/70" aria-hidden="true" />}
          </HeadlessRadio>
        ))}
      </RadioGroup>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{disabled ? disabled : current?.label}</span>
    </div>
  )
}

// Your colour, typed as a hex value or picked
function ColourInput({ value, onChange }) {
  let [text, setText] = useState(value.slice(1))
  return (
    <div className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <label className="flex items-center rounded-md bg-white px-2 py-1 font-mono text-zinc-900 ring-1 ring-zinc-900/10 focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-white/5 dark:text-white dark:ring-white/10">
        <span className="text-zinc-400">#</span>
        <input
          value={text}
          maxLength={6}
          spellCheck={false}
          aria-label="Your colour, as a hex value"
          onChange={(e) => {
            let v = e.target.value.replace(/[^0-9a-f]/gi, '')
            setText(v)
            if (v.length === 6) onChange(`#${v.toLowerCase()}`)
          }}
          className="ml-0.5 w-16 bg-transparent uppercase outline-none"
        />
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setText(e.target.value.slice(1))
        }}
        aria-label="Pick your colour"
        className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full"
      />
    </div>
  )
}

// A fixed part of the button: shown, but not changeable
function Locked({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
      <LockIcon className="size-3.5 flex-none text-zinc-400" />
      {children}
    </span>
  )
}

function Builder() {
  let [icon, setIcon] = useState('generic')
  let [bg, setBg] = useState('white')
  let [border, setBorder] = useState('black')
  let [brand, setBrand] = useState(BRAND_DEFAULT)

  let apps = icon === 'apps'
  let c = settle({ icon, bg, border, brand })
  let code = buttonCode(c)

  // Bank app icons only go on white or light grey, with a black or grey border
  function changeIcon(next) {
    setIcon(next)
    if (next === 'apps') {
      if (bg === 'black' || bg === 'brand') setBg('white')
      if (border === 'brand') setBorder('black')
    }
  }

  let backgrounds = BACKGROUNDS.map((b) => ({
    ...b,
    hex: b.id === 'brand' ? brand : b.hex(icon),
    off: apps && b.generic ? 'not with bank app icons' : null,
  }))
  let borders = BORDERS.map((b) => ({
    ...b,
    text: b.id === 'none' ? 'None' : null,
    hex: b.id === 'brand' ? brand : b.hex,
    off: apps && b.generic ? 'not with bank app icons' : null,
  }))
  let showColour = bg === 'brand' || (bg === 'white' && border === 'brand')

  return (
    <Row>
      <Col>
        <div className="not-prose">
          <Setting label="Icon" rule="What sits next to the text.">
            <IconCards value={icon} onChange={changeIcon} />
            {apps && (
              <p className="mt-3 text-xs/5 text-amber-700 dark:text-amber-400">
                Token.io’s permission doesn’t cover banks’ app icons. Check with your legal team before you use them.
              </p>
            )}
          </Setting>
          <Setting label="Background" rule={apps ? 'White or light grey.' : 'White, light grey, black or one colour of your own.'}>
            <Dots label="Background" value={bg} onChange={setBg} options={backgrounds} />
            {showColour && <ColourInput value={brand} onChange={setBrand} />}
          </Setting>
          <Setting label="Border" rule="2px, on white backgrounds only.">
            <Dots
              label="Border"
              value={bg === 'white' ? border : 'none'}
              onChange={setBorder}
              options={borders}
              disabled={bg === 'white' ? null : 'Only on a white background'}
            />
          </Setting>
          <Setting label="Text" rule="Must be displayed as “Pay by Bank”, in Inter, with “Bank” bold.">
            <Locked>
              <span style={{ fontFamily: INTER, letterSpacing: '-0.03em' }} className="text-zinc-900 dark:text-white">
                Pay by <strong className="font-bold">Bank</strong>
              </span>
              <span className="text-xs text-zinc-400">Inter, −3% spacing</span>
            </Locked>
          </Setting>
          <Setting label="Effects" rule="Not allowed. Pay by Bank buttons are flat.">
            <div className="flex flex-wrap gap-2">
              {EFFECTS.map((e) => (
                <span key={e} className="rounded-full px-3 py-1 text-xs text-zinc-400 line-through ring-1 ring-zinc-900/10 dark:text-zinc-500 dark:ring-white/10">
                  {e}
                </span>
              ))}
            </div>
          </Setting>
        </div>
      </Col>
      <Col sticky>
        <CodeWindow
          title="Pay by Bank button"
          label="Your checkout page"
          code={code}
          html={highlightHtml(code)}
          codeTab="HTML"
          preview={
            <div className="flex min-h-56 items-center justify-center bg-white bg-[radial-gradient(var(--color-zinc-200)_1px,transparent_1px)] [background-size:12px_12px] p-6">
              <ButtonPreview c={c} />
            </div>
          }
        />
      </Col>
    </Row>
  )
}

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
        With Server to Server, you add the Pay by Bank button to your own checkout, and the shopper’s click starts step 1. Token.io’s Pay by
        Bank design system sets how it looks, so shoppers recognise it wherever they see it. Get the assets below, then build your button: the
        builder only offers what the design system allows.
      </p>

      <h3>Reference and assets</h3>
      <Downloads />

      <h3>Build your Pay by Bank button</h3>
      <Builder />
    </>
  )
}
