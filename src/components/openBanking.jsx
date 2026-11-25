import clsx from 'clsx'
import Link from 'next/link'

// Building blocks for the Open Banking (Pay by Bank) guides. Patterns borrowed from Tailwind Plus:
// the journey steps and stats from the Pay by Bank one-pager, Catalyst's description list and
// stat, Syntax's callout and quick links, and Compass's "up next" content links.

// Icons (20 x 20, stroked like the rest of the site)
const icon = (d, extra = null) =>
  function Icon(props) {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
        {extra}
        <path fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    )
  }

export const CheckCircleIcon = icon('M6.75 10.25 9 12.5l4.25-4.75M17.25 10a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z')
export const ShieldIcon = icon('M10 2.75 4 5v4.5c0 3.6 2.55 6.55 6 7.75 3.45-1.2 6-4.15 6-7.75V5l-6-2.25ZM7.5 10l1.75 1.75L12.75 8')
export const BankIcon = icon('M2.75 7.25 10 3.25l7.25 4H2.75ZM4.75 9.5v5M8.25 9.5v5M11.75 9.5v5M15.25 9.5v5M2.75 16.75h14.5')
export const FingerprintIcon = icon(
  'M5.5 15.25c.9-1.4 1.25-3 1.25-5.25a3.25 3.25 0 0 1 6.5 0c0 .9-.05 1.75-.15 2.5M10 10c0 2.6-.6 4.75-1.75 6.5M12.75 15.25c.3-.75.55-1.6.7-2.5M3.6 12.5c.25-.8.4-1.6.4-2.5a6 6 0 0 1 10.75-3.65M15.75 8.25c.15.55.25 1.15.25 1.75 0 1.5-.15 2.75-.45 3.9',
)

// The shopper's journey, from the Pay by Bank one-pager
export const PAY_BY_BANK_JOURNEY = [
  { icon: BankIcon, title: 'Select bank', text: 'Chooses Pay by Bank at checkout or in your Pay by link, then picks their bank.' },
  { icon: FingerprintIcon, title: 'Authenticate', text: 'Signs in to their banking app.' },
  { icon: CheckCircleIcon, title: 'Approve', text: 'Approves the payment, and their bank confirms it.' },
]

function StepCheck(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m4.5 8.25 2.25 2.25 4.75-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Steps as a tracker: circles joined by a line, each with its step's icon, the earlier steps grey and
// the last one in the brand colour. Across on wider screens and down on phones, or always down
export function JourneySteps({ steps, vertical = false, className }) {
  let across = !vertical
  return (
    <ol className={clsx('not-prose grid grid-cols-1 gap-6', across && 'my-8 sm:grid-cols-3 sm:gap-0', className)}>
      {steps.map((s, i) => {
        let last = i === steps.length - 1
        return (
          <li key={s.title} className={clsx('relative flex gap-4', across && 'sm:block sm:pr-8')}>
            {!last && (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute top-11 -bottom-5 left-[17px] w-0.5 rounded-full bg-emerald-600/70 dark:bg-emerald-400/60',
                  across && 'sm:top-[17px] sm:right-2 sm:bottom-auto sm:left-11 sm:h-0.5 sm:w-auto',
                )}
              />
            )}
            <span
              className={clsx(
                'relative flex size-9 flex-none items-center justify-center rounded-full',
                last
                  ? 'bg-emerald-600 ring-4 ring-emerald-600/15 dark:bg-emerald-500 dark:ring-emerald-400/20'
                  : 'bg-zinc-400 dark:bg-zinc-600',
              )}
            >
              <s.icon className="size-5 stroke-white [&_path]:[stroke-width:1.6]" />
            </span>
            <div className={clsx('min-w-0 pt-1.5', across && 'sm:mt-4 sm:pt-0')}>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</p>
              <p className="mt-1 text-[0.8125rem]/5 text-zinc-500 dark:text-zinc-400">{s.text}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// A spec sheet: a label with its value under it, three to a row (like a marketplace listing)
export function SpecGrid({ items }) {
  return (
    <dl className="not-prose my-8 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-zinc-900/7.5 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-none dark:border-white/10">
      {items.map((f) => (
        <div key={f.term} id={f.id} className={f.id ? 'scroll-mt-24' : undefined}>
          <dt className="text-sm font-semibold text-zinc-900 dark:text-white">{f.term}</dt>
          <dd className="mt-1 text-sm/6 text-zinc-600 dark:text-zinc-400 [&_a]:font-medium [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400">
            {f.details}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Numbered steps down a line, like Tailwind Plus's vertical progress steps
export function TickList({ items }) {
  return (
    <ul className="mt-1 space-y-1">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2">
          <StepCheck className="mt-1 size-4 flex-none text-emerald-600 dark:text-emerald-400" />
          {t}
        </li>
      ))}
    </ul>
  )
}

// A callout with a title, after Syntax's: note (brand blue) or warning (amber)
export function Callout({ title, type = 'note', children }) {
  let warning = type === 'warning'
  return (
    <div
      className={clsx(
        'not-prose my-8 flex gap-4 rounded-2xl p-5 ring-1',
        warning ? 'bg-amber-50 ring-amber-500/20 dark:bg-amber-400/5 dark:ring-amber-400/20' : 'bg-emerald-50/70 ring-emerald-500/20 dark:bg-emerald-400/5 dark:ring-emerald-400/20',
      )}
    >
      {warning ? (
        <ShieldIcon className="size-6 flex-none stroke-amber-600 dark:stroke-amber-400" />
      ) : (
        <CheckCircleIcon className="size-6 flex-none stroke-emerald-600 dark:stroke-emerald-400" />
      )}
      <div className="min-w-0 text-sm/6">
        <p className={clsx('font-semibold', warning ? 'text-amber-900 dark:text-amber-200' : 'text-emerald-900 dark:text-emerald-200')}>{title}</p>
        <div
          className={clsx(
            'mt-1 [&_a]:font-semibold [&_a]:underline [&_a]:decoration-current/30 [&_a]:underline-offset-2 [&_code]:font-mono [&_code]:text-[0.8125rem]',
            warning ? 'text-amber-800 dark:text-amber-100/80' : 'text-emerald-900/80 dark:text-emerald-100/80',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// How long the bank's final confirmation takes: cumulative share of payments by time
export function ConfirmationChart({ rows, source }) {
  return (
    <figure className="not-prose my-8 rounded-2xl p-5 ring-1 ring-zinc-900/7.5 dark:ring-white/10">
      <figcaption className="text-sm font-semibold text-zinc-900 dark:text-white">How long the bank’s confirmation takes</figcaption>
      <p className="mt-1 text-xs/5 text-zinc-500 dark:text-zinc-400">Share of payments with their final status within each time</p>
      <dl className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3 text-xs">
            <dt className="text-zinc-600 dark:text-zinc-400">{r.label}</dt>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900/5 dark:bg-white/10">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.value}%` }} />
            </div>
            <dd className="text-right font-mono text-zinc-900 tabular-nums dark:text-white">{r.value}%</dd>
          </div>
        ))}
      </dl>
      {source && <p className="mt-5 text-xs/5 text-zinc-400 dark:text-zinc-500">{source}</p>}
    </figure>
  )
}

const INTER = "'Inter Variable', Inter, system-ui, sans-serif"
const PBB = '/images/pay-by-bank'

// The Get started intro's picture: Pay by Bank at the top of a checkout's payment options, over a
// moving strip of UK banks' app icons (icons and logos from Mikey's Canva boards)
const HERO_BANKS = ['natwest', 'barclays', 'lloyds', 'hsbc', 'halifax', 'nationwide', 'starling', 'santander', 'revolut', 'monzo']

function HeroRadio({ on }) {
  return (
    <span className={clsx('flex size-4 flex-none items-center justify-center rounded-full ring-1', on ? 'ring-zinc-900' : 'ring-zinc-400')}>
      {on && <span className="size-2 rounded-full bg-zinc-900" />}
    </span>
  )
}

export function PayByBankHero() {
  return (
    <div
      role="img"
      aria-label="Pay by Bank at the top of a checkout’s payment options, above card and PayPal, with UK banks’ app icons"
      className="not-prose relative overflow-hidden rounded-3xl bg-zinc-100/70 px-6 pt-8 pb-6 ring-1 ring-zinc-900/5 dark:bg-white/2.5 dark:ring-white/10"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-28 -left-24 size-80 rounded-full border-[44px] border-white/80 dark:border-white/5" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -bottom-36 size-96 rounded-full border-[52px] border-white/80 dark:border-white/5" />
      <div className="relative mx-auto max-w-sm rounded-2xl bg-white p-4 text-sm text-zinc-900 shadow-xl shadow-zinc-900/5 ring-1 ring-zinc-900/5" style={{ fontFamily: INTER }}>
        <div className="mb-3 text-zinc-400">Payment options</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 ring-1 ring-zinc-300">
            <HeroRadio on />
            <span className="flex-1 tracking-[-0.03em]">
              Pay by <strong className="font-bold">Bank</strong>
            </span>
            <span className="flex gap-1">
              {['barclays', 'natwest', 'lloyds'].map((b) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={b} src={`${PBB}/bank-${b}.png`} alt="" className="size-6 rounded-[25%]" />
              ))}
              <span className="flex size-6 items-center justify-center rounded-[25%] bg-[#b4b4b4] text-white">
                <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 text-zinc-500 opacity-70 ring-1 ring-zinc-200">
            <HeroRadio />
            <span className="flex-1">Card</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PBB}/logo-visa.png`} alt="" className="h-6 w-auto rounded" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PBB}/logo-mastercard.png`} alt="" className="h-6 w-auto rounded" />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3.5 py-3 text-zinc-500 opacity-70 ring-1 ring-zinc-200">
            <HeroRadio />
            <span className="flex-1">PayPal</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${PBB}/logo-paypal.png`} alt="" className="h-4 w-auto" />
          </div>
        </div>
      </div>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-[pbb-marquee_45s_linear_infinite] gap-3 pr-3 motion-reduce:animate-none">
          {[...HERO_BANKS, ...HERO_BANKS].map((b, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`${PBB}/bank-${b}.png`} alt="" className="size-10 flex-none rounded-[23%]" />
          ))}
        </div>
      </div>
    </div>
  )
}
