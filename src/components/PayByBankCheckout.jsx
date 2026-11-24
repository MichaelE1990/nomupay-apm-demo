'use client'

// "Brand customisations" on the Integration page (Server to Server), laid out like the steps: the
// intro and a link to Token.io's files (in a modal) on the left, the code box on the right. The
// code box builds the Pay by Bank option for a checkout's list of payment options: Preview and
// HTML tabs, then a bottom bar with the theme (Token.io's bank icon mark or app icon mark) and
// Customise, which opens a row for icon placement, a badge and a line of context (Token.io's tips
// for driving adoption, each with one example). Colours are left to Token.io's files. The theme
// mock-ups and bank icons come from Mikey's Canva boards ("Button Mock Ups", "Bank App Icons").
import {
  CloseButton,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Radio as HeadlessRadio,
  RadioGroup,
  Switch,
} from '@headlessui/react'
import clsx from 'clsx'
import { useState } from 'react'

import { CodeWindow } from '@/components/CodeWindow'
import { Col, Row } from '@/components/content'
import { Heading } from '@/components/Heading'
import { highlightHtml } from '@/lib/highlight'

export const CHECKOUT_SECTION = { id: 'brand-customisations', title: 'Brand customisations' }

// Token.io's downloads (Google Drive), from the design system's Basics page
const DOWNLOADS = [
  { label: 'Bank icon mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/1HgPiyaoa-iQXfKYiHknFQWQcmHSbZEIt' },
  { label: 'App icon mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/1qaNAt-rUemcl0J2MsJPIBbPe_kCy24in' },
  { label: 'Pay by Bank buttons', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/13SWDc_5MLZIN_UAZ-K7xcwynLV44eOJc' },
  { label: 'Word mark', meta: 'PNG, SVG', href: 'https://drive.google.com/drive/folders/13iIvewb8WG4bW18fxF-Bz2L-PlccVRWG' },
  { label: 'Inter font', meta: 'Google Fonts', href: 'https://fonts.google.com/specimen/Inter' },
]

const escape = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The bank icon and the plus sign from Token.io's bank icon mark SVG files
const MARK_TEMPLE = 'M 97.98 49.19 C 99.55 49.19 100.83 47.91 100.83 46.33 L 100.83 38.07 C 100.83 37 100.24 36.03 99.29 35.54 L 68.8 19.73 C 67.41 19.02 65.76 19.02 64.38 19.73 L 33.88 35.54 C 32.93 36.02 32.34 37 32.34 38.07 L 32.34 46.33 C 32.34 47.91 33.62 49.19 35.19 49.19 L 36.62 49.19 L 36.62 82.04 L 35.19 82.04 C 33.62 82.04 32.34 83.32 32.34 84.89 L 32.34 90.61 C 32.34 92.18 33.62 93.46 35.19 93.46 L 97.98 93.46 C 99.55 93.46 100.83 92.18 100.83 90.61 L 100.83 84.89 C 100.83 83.32 99.55 82.04 97.98 82.04 L 96.55 82.04 L 96.55 49.19 Z M 70.87 49.19 L 70.87 82.04 L 62.3 82.04 L 62.3 49.19 Z M 45.18 49.19 L 53.74 49.19 L 53.74 82.04 L 45.18 82.04 Z M 87.99 82.04 L 79.43 82.04 L 79.43 49.19 L 87.99 49.19 Z M 87.99 82.04'
const MARK_PLUS = 'M 153.11 56.95 L 139.38 56.95 C 138.29 56.95 137.41 56.07 137.41 54.98 L 137.41 41.24 C 137.41 40.16 136.53 39.28 135.45 39.28 C 134.36 39.28 133.48 40.16 133.48 41.24 L 133.48 54.98 C 133.48 56.07 132.61 56.95 131.52 56.95 L 117.78 56.95 C 116.7 56.95 115.82 57.82 115.82 58.91 C 115.82 59.99 116.7 60.87 117.78 60.87 L 131.52 60.87 C 132.61 60.87 133.48 61.75 133.48 62.83 L 133.48 76.57 C 133.48 77.66 134.36 78.54 135.45 78.54 C 136.53 78.54 137.41 77.66 137.41 76.57 L 137.41 62.83 C 137.41 61.75 138.29 60.87 139.38 60.87 L 153.11 60.87 C 154.2 60.87 155.08 59.99 155.08 58.91 C 155.08 57.82 154.2 56.95 153.11 56.95 Z M 153.11 56.95'

// Token.io's bank icon mark (its black outline version), rebuilt from its SVG files: a box with an
// outline 3.7 units wide in a 187 × 116 mark, the bank icon and the plus sign. Its other colours
// are in Token.io's files (Reference and assets).
const MARK = { bg: '#ffffff', line: '#000000', icon: '#000000' }

function markSvg() {
  return [
    '<svg class="pay-by-bank-mark" viewBox="0 0 187 116" aria-hidden="true">',
    `    <rect x="2.5" y="1.85" width="182.1" height="111.7" rx="7" fill="${MARK.bg}" stroke="${MARK.line}" stroke-width="3.7"/>`,
    `    <path fill="${MARK.icon}" d="${MARK_TEMPLE}"/>`,
    `    <path fill="${MARK.icon}" d="${MARK_PLUS}"/>`,
    '  </svg>',
  ].join('\n')
}

function BankIconMark({ className }) {
  return (
    <svg viewBox="0 0 187 116" aria-hidden="true" className={clsx('flex-none', className)}>
      <rect x="2.5" y="1.85" width="182.1" height="111.7" rx="7" fill={MARK.bg} stroke={MARK.line} strokeWidth="3.7" />
      <path fill={MARK.icon} d={MARK_TEMPLE} />
      <path fill={MARK.icon} d={MARK_PLUS} />
    </svg>
  )
}

// The UK's top three banks for the preview, from the "Bank App Icons" Canva board. The HTML keeps
// placeholders: merchants add their own market's banks.
const BANK_ICONS = [
  { name: 'Barclays', src: '/images/pay-by-bank/bank-barclays.png' },
  { name: 'NatWest', src: '/images/pay-by-bank/bank-natwest.png' },
  { name: 'Lloyds', src: '/images/pay-by-bank/bank-lloyds.png' },
]

function AppIconMark({ size = 24 }) {
  return (
    <span className="inline-flex flex-none" style={{ gap: Math.round(size * 0.15) }} aria-hidden="true">
      {BANK_ICONS.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.name} src={b.src} alt="" className="rounded-[25%]" style={{ width: size, height: size }} />
      ))}
      <span className="inline-flex items-center justify-center rounded-[25%] bg-[#b4b4b4] text-white" style={{ width: size, height: size }}>
        <svg viewBox="0 0 10 10" className="size-[55%]" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </span>
    </span>
  )
}

// The themes are Token.io's two payment marks, with mock-ups from the "Button Mock Ups" Canva board
const THEMES = [
  {
    id: 'icon',
    label: 'Bank icon mark',
    text: 'A bank icon and a plus sign beside the words “Pay by Bank”. Works in every market.',
    image: '/images/pay-by-bank/theme-generic.png',
  },
  {
    id: 'apps',
    label: 'App icon mark',
    text: 'Your market’s top three banks’ app icons and a plus sign, so shoppers spot their own bank.',
    warning: 'Token.io’s permission doesn’t cover banks’ app icons. Check with your legal team before you use them.',
    image: '/images/pay-by-bank/theme-apps.png',
  },
]

// Token.io's tips for driving adoption, each shown with one example the merchant can reword:
// flag Pay by Bank as popular (or offer an incentive), and add context under its name
const BADGE = { text: 'Popular', bg: '#d4f3ff', color: '#075985' }
const CONTEXT = 'Easy & secure. No card details required.'

// The HTML for the Pay by Bank option, as one row of a checkout's payment options
function optionCode(s) {
  let apps = s.theme === 'apps'
  let mark = apps
    ? [
        '<span class="pay-by-bank-mark" aria-hidden="true">',
        '    <!-- Your market’s top three banks’ app icons, from the App Store -->',
        '    <img src="bank-app-icon-1.png" alt="">',
        '    <img src="bank-app-icon-2.png" alt="">',
        '    <img src="bank-app-icon-3.png" alt="">',
        '    <span class="pay-by-bank-more">+</span>',
        '  </span>',
      ].join('\n')
    : markSvg()
  let radio = '<input type="radio" name="payment-method" value="pay-by-bank">'
  let label = [
    '<span class="pay-by-bank-label">',
    '    <span class="pay-by-bank-name">Pay by Bank</span>',
    ...(s.badge ? [`    <span class="pay-by-bank-badge">${BADGE.text}</span>`] : []),
    ...(s.context ? [`    <span class="pay-by-bank-context">${escape(CONTEXT)}</span>`] : []),
    '  </span>',
  ].join('\n')
  let order = s.placement === 'left' ? [radio, mark, label] : [radio, label, mark]

  return [
    '<style>',
    '  .pay-by-bank-option {',
    '    display: flex;',
    '    align-items: center;',
    '    gap: 12px;',
    '    padding: 14px 16px;',
    '    border: 1px solid #d4d4d8;',
    '    border-radius: 8px;',
    '    cursor: pointer;',
    '  }',
    '  .pay-by-bank-option:has(input:checked) { border-color: #000000; }',
    '  .pay-by-bank-label { flex: 1; min-width: 0; }',
    '  .pay-by-bank-name { font-weight: 600; }',
    ...(s.badge
      ? [
          '  .pay-by-bank-badge {',
          '    margin-left: 8px;',
          '    padding: 2px 8px;',
          '    border-radius: 999px;',
          '    font-size: 12px;',
          `    color: ${BADGE.color};`,
          `    background: ${BADGE.bg};`,
          '  }',
        ]
      : []),
    ...(s.context ? ['  .pay-by-bank-context { display: block; margin-top: 2px; font-size: 13px; color: #6b7280; }'] : []),
    ...(apps
      ? [
          '  .pay-by-bank-mark { display: inline-flex; flex: none; gap: 4px; }',
          '  .pay-by-bank-mark img,',
          '  .pay-by-bank-more { width: 24px; height: 24px; border-radius: 25%; }',
          '  /* Give icons with a white background a 2px #b4b4b4 border */',
          '  .pay-by-bank-more {',
          '    display: inline-flex;',
          '    align-items: center;',
          '    justify-content: center;',
          '    color: #ffffff;',
          '    background: #b4b4b4;',
          '  }',
        ]
      : ['  .pay-by-bank-mark { flex: none; height: 32px; }']),
    '</style>',
    '',
    '<label class="pay-by-bank-option">',
    ...order.map((part) => `  ${part}`),
    '</label>',
  ].join('\n')
}

// The preview: the option in a list of payment options, as in Token.io's examples
function OptionPreview({ s }) {
  let mark = s.theme === 'apps' ? <AppIconMark size={22} /> : <BankIconMark className="h-7 w-auto" />
  let radio = (
    <span className="flex size-4 flex-none items-center justify-center rounded-full ring-1 ring-zinc-900">
      <span className="size-2 rounded-full bg-zinc-900" />
    </span>
  )
  let label = (
    <span className="min-w-0 flex-1">
      <span className="font-semibold">Pay by Bank</span>
      {s.badge && (
        <span className="ml-2 rounded-full px-2 py-0.5 text-xs whitespace-nowrap" style={{ background: BADGE.bg, color: BADGE.color }}>
          {BADGE.text}
        </span>
      )}
      {s.context && <span className="mt-0.5 block text-[0.8125rem] text-zinc-500">{CONTEXT}</span>}
    </span>
  )
  let order = s.placement === 'left' ? [radio, mark, label] : [radio, label, mark]
  return (
    <div className="w-full max-w-md rounded-xl bg-white p-4 text-left text-sm text-zinc-900 shadow-sm ring-1 ring-zinc-900/5" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="mb-2.5 text-xs text-zinc-400">Payment options</div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-4 py-3.5 ring-1 ring-zinc-900">
          {order.map((part, i) => (
            <span key={i} className={clsx('flex items-center', part === label && 'min-w-0 flex-1')}>
              {part}
            </span>
          ))}
        </div>
        {['Card', 'PayPal'].map((name) => (
          <div key={name} className={clsx('flex items-center gap-3 rounded-lg px-4 py-3.5 text-zinc-500 ring-1 ring-zinc-200')}>
            <span className="size-4 flex-none rounded-full ring-1 ring-zinc-300" />
            {s.placement === 'left' && <span className="h-6 w-10 flex-none rounded bg-zinc-100" />}
            <span className="flex-1">{name}</span>
            {s.placement !== 'left' && <span className="h-6 w-10 flex-none rounded bg-zinc-100" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function TickIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

// Icon placement, drawn like alignment buttons: the mark on the left of the text, or on the right
function PlacementIcon({ side, ...props }) {
  let left = side === 'left'
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <rect x={left ? 2.5 : 12.5} y="6.5" width="5" height="7" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
      <path d={left ? 'M10.5 8h7M10.5 12h5' : 'M2.5 8h7M2.5 12h5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const PLACEMENTS = [
  { id: 'left', label: 'Icon on the left' },
  { id: 'right', label: 'Icon on the right' },
]

function Placement({ value, onChange }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label="Icon placement" className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10 ring-inset">
      {PLACEMENTS.map((p) => (
        <HeadlessRadio
          key={p.id}
          value={p.id}
          title={p.label}
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition hover:text-white focus:outline-none data-checked:bg-white data-checked:text-zinc-900 data-focus:ring-2 data-focus:ring-emerald-400"
        >
          <span className="sr-only">{p.label}</span>
          <PlacementIcon side={p.id} className="size-4" />
        </HeadlessRadio>
      ))}
    </RadioGroup>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <Field className="flex items-center gap-2">
      <Label className="cursor-pointer text-xs text-zinc-300">{label}</Label>
      <Switch
        checked={checked}
        onChange={onChange}
        className="group relative flex h-5 w-9 flex-none cursor-pointer rounded-full bg-white/15 p-0.5 transition focus:outline-none data-checked:bg-emerald-500 data-focus:ring-2 data-focus:ring-emerald-400"
      >
        <span className="size-4 rounded-full bg-white shadow-sm transition group-data-checked:translate-x-4" />
      </Switch>
    </Field>
  )
}

// The theme, as a pill in the code box's bottom bar: its name, and a list of the themes (with
// their mock-ups) to switch to
function ThemePicker({ value, onChange }) {
  let current = THEMES.find((t) => t.id === value)
  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton
        aria-label={`Theme: ${current.label}`}
        className="group flex min-w-0 items-center gap-2 rounded-full bg-white/5 py-1 pr-1 pl-1 text-xs ring-1 ring-white/10 transition ring-inset hover:bg-white/10 focus:outline-none data-focus:ring-2 data-focus:ring-emerald-400 min-[420px]:pl-3"
      >
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

// The code box: Preview and HTML tabs, the theme and Customise in the bottom bar. Customise opens
// one more row inside the box, so the box keeps its shape: icon placement, a badge and context.
function Builder() {
  let [s, setS] = useState({ theme: 'icon', placement: 'right', badge: false, context: false })
  let [settings, setSettings] = useState(false)
  let set = (key) => (value) => setS((prev) => ({ ...prev, [key]: value }))
  let code = optionCode(s)

  return (
    <div className="not-prose">
      <CodeWindow
        className="my-0!"
        code={code}
        html={highlightHtml(code)}
        codeTab="HTML"
        preview={
          <div className="flex min-h-80 items-center justify-center bg-zinc-50 bg-[radial-gradient(var(--color-zinc-200)_1px,transparent_1px)] [background-size:12px_12px] p-6">
            <OptionPreview s={s} />
          </div>
        }
        footer={
          <>
            <div className="flex items-center justify-between gap-3">
              <ThemePicker value={s.theme} onChange={set('theme')} />
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
            <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', settings ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <div
                  id="pay-by-bank-settings"
                  inert={!settings}
                  className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-white/7.5 pt-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300">Icon placement</span>
                    <Placement value={s.placement} onChange={set('placement')} />
                  </div>
                  <Toggle label="Badge" checked={s.badge} onChange={set('badge')} />
                  <Toggle label="Context information" checked={s.context} onChange={set('context')} />
                </div>
              </div>
            </div>
          </>
        }
      />
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
            With Server to Server, you add Pay by Bank to the payment options on your own checkout, and the shopper’s click starts step 1. Pick
            a theme in the code box, adjust it with Customise, then copy the HTML.
          </p>
          <p>
            For colours and other styles, see Token.io’s reference and assets. The buttons, marks and fonts are free to use with Pay by Bank.
          </p>
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
