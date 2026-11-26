'use client'

import clsx from 'clsx'

import { PILL_BUTTON as PILL } from '@/components/openBanking'
import { PAY_BY_LINKS_URL } from '@/lib/openBanking'

// The two ways to integrate Pay by Bank, as cards: a pair of keycaps over soft rings, a badge, a title,
// a line and a pill button. Pay by Link opens the Help Centre guide; the API shows the steps below

function CodeIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m6.5 6-4 4 4 4M13.5 6l4 4-4 4M11.25 4.5l-2.5 11" />
    </svg>
  )
}

function LinkIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8.75 11.25a3.25 3.25 0 0 0 4.6 0l2.4-2.4a3.25 3.25 0 0 0-4.6-4.6l-.9.9M11.25 8.75a3.25 3.25 0 0 0-4.6 0l-2.4 2.4a3.25 3.25 0 0 0 4.6 4.6l.9-.9" />
    </svg>
  )
}

// The card icon the Dashboard shows beside Pay by Link
function CardIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2.5" y="4.25" width="15" height="11.5" rx="2" />
      <path d="M2.5 8.25h15M5.5 12.5h3.5" />
    </svg>
  )
}

function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 20 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 8h15m-4.5-4.5L17 8l-4.5 4.5" />
    </svg>
  )
}

function Keycap({ children }) {
  return (
    <span className="flex size-14 items-center justify-center rounded-xl bg-white text-base font-medium text-zinc-600 shadow-[0_3px_0_rgb(24_24_27/0.06),0_1px_2px_rgb(24_24_27/0.06)] ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10">
      {children}
    </span>
  )
}

function Visual({ keys }) {
  return (
    <div aria-hidden="true" className="relative flex h-40 items-center justify-center">
      <span className="absolute size-72 rounded-full border border-zinc-900/[0.03] bg-zinc-900/[0.01] dark:border-white/5" />
      <span className="absolute size-52 rounded-full border border-zinc-900/[0.04] bg-zinc-900/[0.015] dark:border-white/5" />
      <span className="absolute size-32 rounded-full bg-zinc-900/[0.025] dark:bg-white/[0.03]" />
      {/* An accent arc on two corners of the keycap tray, in the brand colour */}
      <span className="relative rounded-[1.1rem] bg-[conic-gradient(from_200deg,transparent_0deg,var(--color-emerald-400)_60deg,transparent_120deg,transparent_200deg,var(--color-emerald-400)_250deg,transparent_310deg)] p-px">
        <span className="flex gap-1.5 rounded-[1.05rem] bg-zinc-50 p-1.5 ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
          {keys.map((k, i) => (
            <Keycap key={i}>{k}</Keycap>
          ))}
        </span>
      </span>
    </div>
  )
}

function Card({ keys, badge, title, text, action, selected }) {
  return (
    <div
      className={clsx(
        'relative flex flex-col items-center overflow-hidden rounded-3xl bg-zinc-50/70 px-6 pt-4 pb-7 text-center ring-1 transition dark:bg-white/2.5',
        selected ? 'ring-emerald-500/40 dark:ring-emerald-400/40' : 'ring-zinc-900/7.5 dark:ring-white/10',
      )}
    >
      <Visual keys={keys} />
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-900/5 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
        {badge}
      </span>
      <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-xs text-sm/6 text-zinc-500 dark:text-zinc-400">{text}</p>
      <div className="mt-auto pt-6">{action}</div>
    </div>
  )
}


function PillContent({ label }) {
  return (
    <>
      {label}
      <ArrowRightIcon className="h-3 w-4 transition group-hover:translate-x-0.5" />
    </>
  )
}

export function PayByBankOptions({ onApi, apiShown }) {
  return (
    <div className="not-prose my-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:max-w-none">
      <Card
        keys={[<CodeIcon key="c" className="size-5" />, 'API']}
        badge={
          <>
            <CodeIcon className="size-3.5 text-emerald-500" />
            API
          </>
        }
        title="Build it into your checkout"
        text="Add Pay by Bank to your own checkout and take payments from your server."
        selected={apiShown}
        action={
          <button type="button" onClick={onApi} className={PILL}>
            <PillContent label="API Development" />
          </button>
        }
      />
      <Card
        keys={[<LinkIcon key="l" className="size-5" />, <CardIcon key="c" className="size-5" />]}
        badge={
          <>
            <LinkIcon className="size-3.5 text-emerald-500" />
            Pay by Link
          </>
        }
        title="Send a link to pay"
        text="Create Pay by links in your Dashboard and send them to shoppers, with nothing to build."
        action={
          <a href={PAY_BY_LINKS_URL} target="_blank" rel="noreferrer" className={PILL}>
            <PillContent label="Pay by Link" />
          </a>
        }
      />
    </div>
  )
}
