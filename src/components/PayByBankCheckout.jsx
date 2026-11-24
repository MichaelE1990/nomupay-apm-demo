'use client'

// "Brand customisations" on the Integration page (Server to Server), laid out like the steps: the
// intro and a link to Token.io's files (in a modal) on the left, the code box on the right. The
// code box has Preview and HTML tabs, a theme picker and Customise in its bottom bar, and a tray of
// colour settings. Every option is one Token.io's Pay by Bank design system (Nov 2026) allows.
// The theme mock-ups and bank icons come from Mikey's Canva boards ("Button Mock Ups", "Bank App
// Icons").
import '@fontsource-variable/inter'

import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Radio as HeadlessRadio,
  Popover,
  PopoverButton,
  PopoverPanel,
  RadioGroup,
} from '@headlessui/react'
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


// What Token.io's design system allows on a button. Effects (shadows, glows, gradients) aren't. With bank app icons the background is
// white or #f2f2f2 only, with a black or grey border; the generic icon also takes black or
// one colour of your own. Borders are 2px and go on white backgrounds only.
// The themes, with mock-ups from the "Button Mock Ups" Canva board (public/images/pay-by-bank)
const THEMES = [
  {
    id: 'generic',
    label: 'Generic bank icon',
    text: 'A bank icon and a plus sign. Works in every market.',
    image: '/images/pay-by-bank/theme-generic.png',
  },
  {
    id: 'apps',
    label: 'Bank app icons',
    text: 'Your market’s top three banks’ app icons and a plus sign, so shoppers spot their own bank.',
    warning: 'Token.io’s permission doesn’t cover banks’ app icons. Check with your legal team before you use them.',
    image: '/images/pay-by-bank/theme-apps.png',
  },
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

// The UK's top three banks for the preview, from the "Bank App Icons" Canva board. The HTML keeps
// placeholders: merchants add their own market's banks.
const BANK_ICONS = [
  { name: 'Barclays', src: '/images/pay-by-bank/bank-barclays.png' },
  { name: 'NatWest', src: '/images/pay-by-bank/bank-natwest.png' },
  { name: 'Lloyds', src: '/images/pay-by-bank/bank-lloyds.png' },
]

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
      {BANK_ICONS.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.name} src={b.src} alt="" className="size-[1.15em] rounded-[25%]" />
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

// A colour dot. "None" is a dashed ring; options the rules don't allow are crossed out.
function Dot({ hex, none, off, size = 'size-6' }) {
  return (
    <span className={clsx('relative flex flex-none items-center justify-center', size)}>
      {none ? (
        <span className="size-full rounded-full border border-dashed border-zinc-400 dark:border-zinc-500" />
      ) : (
        <span className={clsx('size-full rounded-full ring-1 ring-zinc-900/15 dark:ring-white/20', off && 'opacity-30')} style={{ background: hex }} />
      )}
      {off && <span className="absolute h-0.5 w-[130%] -rotate-45 rounded-full bg-zinc-500/70" aria-hidden="true" />}
    </span>
  )
}

function TickIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const ROW = 'flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm'

function SwapIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m6 4.5-3.5 3.5L6 11.5M10 4.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GearIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// The theme, as a pill in the code box's bottom bar: its name, and a list of the themes (with
// their mock-ups) to switch to
function ThemePicker({ value, onChange }) {
  let current = THEMES.find((t) => t.id === value)
  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton aria-label={`Theme: ${current.label}`} className="group flex min-w-0 items-center gap-2 rounded-full bg-white/5 py-1 pr-1 pl-1 text-xs min-[420px]:pl-3 ring-1 ring-white/10 transition ring-inset hover:bg-white/10 focus:outline-none data-focus:ring-2 data-focus:ring-emerald-400">
        <span className="hidden text-zinc-400 min-[420px]:inline">Theme</span>
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 py-0.5 pr-1.5 pl-2.5 font-medium text-white">
          <span className="truncate">{current.label}</span>
          <SwapIcon className="size-3.5 flex-none text-zinc-400 transition group-hover:text-white" />
        </span>
      </ListboxButton>
      <ListboxOptions
        anchor={{ to: 'top start', gap: 8 }}
        transition
        className="z-50 w-[min(26rem,calc(100vw-2rem))] space-y-1 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-zinc-900/10 transition duration-150 ease-out focus:outline-none data-closed:translate-y-1 data-closed:opacity-0 dark:bg-zinc-900 dark:ring-white/10"
      >
        {THEMES.map((t) => (
          <ListboxOption
            key={t.id}
            value={t.id}
            className="group flex cursor-pointer items-center gap-4 rounded-lg p-2.5 ring-1 ring-transparent transition data-focus:bg-zinc-50 data-selected:ring-emerald-500/40 dark:data-focus:bg-white/5 dark:data-selected:ring-emerald-400/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                {t.label}
                <TickIcon className="size-4 text-emerald-500 opacity-0 group-data-selected:opacity-100" />
              </div>
              <p className="mt-0.5 text-xs/5 text-zinc-600 dark:text-zinc-400">{t.text}</p>
              {t.warning && <p className="mt-1 text-xs/5 text-amber-700 dark:text-amber-400">{t.warning}</p>}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.image}
              alt={`${t.label}: Pay by Bank in a list of payment options`}
              className="aspect-[8/5] w-28 flex-none rounded-md object-cover ring-1 ring-zinc-900/5 dark:ring-white/10"
            />
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

// A colour setting as one row: its name, then the current colour. Clicking it opens the colours
// the rules allow, with your own colour at the end.
function ColourRow({ label, rule, value, options, onChange, brand, onBrand, disabled }) {
  let current = options.find((o) => o.id === value)
  return (
    <Popover>
      <PopoverButton
        disabled={Boolean(disabled)}
        className={clsx(
          ROW,
          'bg-zinc-100 text-left transition hover:bg-zinc-200/60 focus:outline-none data-disabled:cursor-not-allowed data-disabled:hover:bg-zinc-100 data-focus:ring-2 data-focus:ring-emerald-500 data-open:bg-zinc-200/60 dark:bg-white/5 dark:hover:bg-white/10 dark:data-disabled:hover:bg-white/5 dark:data-open:bg-white/10',
        )}
      >
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
        <span className="flex min-w-0 items-center gap-3">
          <span className={clsx('truncate', disabled ? 'text-xs text-zinc-400 dark:text-zinc-500' : 'font-medium text-zinc-900 dark:text-white')}>
            {disabled || current.label}
          </span>
          <Dot hex={current.hex} none={value === 'none'} size="size-7" />
        </span>
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'bottom end', gap: 8 }}
        transition
        className="z-50 w-72 rounded-xl bg-white p-2 shadow-lg ring-1 ring-zinc-900/10 transition duration-150 ease-out data-closed:-translate-y-1 data-closed:opacity-0 dark:bg-zinc-900 dark:ring-white/10"
      >
        {({ close }) => (
          <>
            <p className="px-2 pt-1 pb-2 text-xs/5 text-zinc-500 dark:text-zinc-400">{rule}</p>
            <RadioGroup
              value={value}
              onChange={(v) => {
                onChange(v)
                if (v !== 'brand') close()
              }}
              aria-label={label}
            >
              {options.map((o) => (
                <HeadlessRadio
                  key={o.id}
                  value={o.id}
                  disabled={Boolean(o.off)}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 focus:outline-none data-disabled:cursor-not-allowed data-disabled:hover:bg-transparent data-focus:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5 dark:data-focus:bg-white/5"
                >
                  <Dot hex={o.hex} none={o.id === 'none'} off={o.off} size="size-5" />
                  <span className="flex-auto group-data-checked:font-medium group-data-checked:text-zinc-900 group-data-disabled:text-zinc-400 group-data-disabled:line-through dark:group-data-checked:text-white dark:group-data-disabled:text-zinc-500">
                    {o.label}
                  </span>
                  {o.off ? (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{o.off}</span>
                  ) : (
                    <TickIcon className="size-4 text-emerald-500 opacity-0 group-data-checked:opacity-100" />
                  )}
                </HeadlessRadio>
              ))}
            </RadioGroup>
            {value === 'brand' && (
              <div className="mt-2 border-t border-zinc-900/7.5 px-2 pt-3 pb-1 dark:border-white/10">
                <ColourInput value={brand} onChange={onBrand} />
              </div>
            )}
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}

// Your colour, typed as a hex value or picked
function ColourInput({ value, onChange }) {
  let [text, setText] = useState(value.slice(1))
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <label className="flex flex-auto items-center rounded-md bg-white px-2 py-1 font-mono text-zinc-900 ring-1 ring-zinc-900/10 focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-white/5 dark:text-white dark:ring-white/10">
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
          className="ml-0.5 w-full bg-transparent uppercase outline-none"
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

// The code box: Preview and HTML tabs, the theme and Customise in the bottom bar, and the
// settings tray that slides out from under it
function Builder() {
  let [icon, setIcon] = useState('generic')
  let [bg, setBg] = useState('white')
  let [border, setBorder] = useState('black')
  let [brand, setBrand] = useState(BRAND_DEFAULT)
  let [settings, setSettings] = useState(false)

  let apps = icon === 'apps'
  let c = settle({ icon, bg, border, brand })
  let code = buttonCode(c)

  // Bank app icons only go on white or light grey, with a black or grey border
  function changeTheme(next) {
    setIcon(next)
    if (next === 'apps') {
      if (bg === 'black' || bg === 'brand') setBg('white')
      if (border === 'brand') setBorder('black')
    }
  }

  let backgrounds = BACKGROUNDS.map((b) => ({
    ...b,
    hex: b.id === 'brand' ? brand : b.hex(icon),
    off: apps && b.generic ? 'Generic icon only' : null,
  }))
  let borders = BORDERS.map((b) => ({
    ...b,
    hex: b.id === 'brand' ? brand : b.hex,
    off: apps && b.generic ? 'Generic icon only' : null,
  }))

  return (
    <div className="not-prose">
      <CodeWindow
        className="relative z-10 my-0!"
        code={code}
        html={highlightHtml(code)}
        codeTab="HTML"
        preview={
          <div className="flex min-h-56 items-center justify-center bg-white bg-[radial-gradient(var(--color-zinc-200)_1px,transparent_1px)] [background-size:12px_12px] p-6">
            <ButtonPreview c={c} />
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <ThemePicker value={icon} onChange={changeTheme} />
            <button
              type="button"
              onClick={() => setSettings((open) => !open)}
              aria-expanded={settings}
              aria-controls="pay-by-bank-settings"
              className={clsx(
                'inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ring-inset',
                settings
                  ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30'
                  : 'bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10 hover:text-white',
              )}
            >
              <GearIcon className={clsx('size-3.5 transition duration-300', settings && 'rotate-90')} />
              Customise
            </button>
          </div>
        }
      />
      <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', settings ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div
            id="pay-by-bank-settings"
            inert={!settings}
            className="mx-2 -mt-4 space-y-2 rounded-b-2xl bg-zinc-50 px-3 pt-7 pb-3 ring-1 ring-zinc-900/7.5 dark:bg-white/2.5 dark:ring-white/10"
          >
            <ColourRow
              label="Background"
              rule={apps ? 'White or light grey with bank app icons.' : 'White, light grey, black or one colour of your own.'}
              value={bg}
              options={backgrounds}
              onChange={setBg}
              brand={brand}
              onBrand={setBrand}
            />
            <ColourRow
              label="Border"
              rule="2px wide, on white backgrounds only."
              value={bg === 'white' ? border : 'none'}
              options={borders}
              onChange={setBorder}
              brand={brand}
              onBrand={setBrand}
              disabled={bg === 'white' ? null : 'White backgrounds only'}
            />
          </div>
        </div>
      </div>
    </div>
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
function Downloads({ className }) {
  return (
    <ul
      role="list"
      className={clsx('not-prose divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-white/5 dark:border-white/10', className)}
    >
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

function XIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AssetsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity duration-200 ease-out data-closed:opacity-0 dark:bg-black/50"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-900/10 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0 dark:bg-zinc-900 dark:ring-white/10"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-white">Reference and assets</DialogTitle>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Token.io’s Pay by Bank files, free to use with Pay by Bank.</p>
            </div>
            <CloseButton
              aria-label="Close"
              className="-mt-1 -mr-1 flex size-8 flex-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <XIcon className="size-5" />
            </CloseButton>
          </div>
          <Downloads className="mt-5" />
        </DialogPanel>
      </div>
    </Dialog>
  )
}

export function PayByBankCheckout() {
  let [assets, setAssets] = useState(false)
  return (
    <>
      <hr />
      <Heading level={2} id={CHECKOUT_SECTION.id}>
        {CHECKOUT_SECTION.title}
      </Heading>
      <Row>
        <Col>
          <p>
            With Server to Server, you add the Pay by Bank button to your own checkout, and the shopper’s click starts step 1. Pick a theme in
            the code box, adjust its colours with Customise, then copy the HTML. Every option follows Token.io’s Pay by Bank design system.
          </p>
          <p>Token.io’s buttons, marks and fonts are free to use with Pay by Bank.</p>
          <div className="not-prose flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setAssets(true)}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-900/5 transition hover:bg-zinc-200 hover:text-zinc-900 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <PaperClipIcon className="size-4 text-emerald-500 dark:text-emerald-400" />
              Reference and assets
            </button>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{DOWNLOADS.length} downloads</span>
          </div>
        </Col>
        <Col sticky>
          <Builder />
        </Col>
      </Row>
      <AssetsDialog open={assets} onClose={() => setAssets(false)} />
    </>
  )
}
