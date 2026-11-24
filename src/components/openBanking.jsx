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

export const BankIcon = icon('M2.75 7.25 10 3.25l7.25 4H2.75ZM4.75 9.5v5M8.25 9.5v5M11.75 9.5v5M15.25 9.5v5M2.75 16.75h14.5')
export const FingerprintIcon = icon(
  'M5.5 15.25c.9-1.4 1.25-3 1.25-5.25a3.25 3.25 0 0 1 6.5 0c0 .9-.05 1.75-.15 2.5M10 10c0 2.6-.6 4.75-1.75 6.5M12.75 15.25c.3-.75.55-1.6.7-2.5M3.6 12.5c.25-.8.4-1.6.4-2.5a6 6 0 0 1 10.75-3.65M15.75 8.25c.15.55.25 1.15.25 1.75 0 1.5-.15 2.75-.45 3.9',
)
export const CheckCircleIcon = icon('M6.75 10.25 9 12.5l4.25-4.75M17.25 10a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z')
export const ShieldIcon = icon('M10 2.75 4 5v4.5c0 3.6 2.55 6.55 6 7.75 3.45-1.2 6-4.15 6-7.75V5l-6-2.25ZM7.5 10l1.75 1.75L12.75 8')
export const LinkIcon = icon('M8.25 11.75a3.25 3.25 0 0 0 4.6 0l2.4-2.4a3.25 3.25 0 0 0-4.6-4.6l-.9.9M11.75 8.25a3.25 3.25 0 0 0-4.6 0l-2.4 2.4a3.25 3.25 0 0 0 4.6 4.6l.9-.9')
export const ServerIcon = icon('M4.75 3.25h10.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5ZM4.75 11.25h10.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5ZM6 6h.01M6 14h.01M9 6h4.5M9 14h4.5')
export const ArrowRightIcon = icon('M4.25 10h11.5m0 0-4-4m4 4-4 4')
export const DownloadIcon = icon('M10 3.25v9.5m0 0-3.5-3.5M10 12.75l3.5-3.5M3.75 13.25v1.5a1.5 1.5 0 0 0 1.5 1.5h9.5a1.5 1.5 0 0 0 1.5-1.5v-1.5')

// The shopper's journey, from the Pay by Bank one-pager
export const PAY_BY_BANK_JOURNEY = [
  { icon: BankIcon, title: 'Select bank', text: 'The shopper chooses Pay by Bank at checkout, or opens your Pay by link, and picks their bank.' },
  { icon: FingerprintIcon, title: 'Authenticate', text: 'They sign in to their banking app to verify the payment.' },
  { icon: CheckCircleIcon, title: 'Approve', text: 'They approve the payment, and their bank confirms it.' },
]

function IconBadge({ icon: Icon, className }) {
  return (
    <span
      className={clsx(
        'flex size-10 flex-none items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-500/15 dark:bg-emerald-400/10 dark:ring-emerald-400/20',
        className,
      )}
    >
      <Icon className="size-5 stroke-emerald-600 dark:stroke-emerald-400" />
    </span>
  )
}

// The shopper's three steps, joined by arrows on wide screens
export function JourneySteps({ steps, className }) {
  return (
    <ol className={clsx('not-prose my-8 grid grid-cols-1 gap-4 sm:grid-cols-3 xl:max-w-none', className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-900/7.5 dark:bg-white/2.5 dark:ring-white/10">
          <IconBadge icon={s.icon} />
          <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">
            <span className="mr-1.5 text-emerald-600 dark:text-emerald-400">{i + 1}.</span>
            {s.title}
          </p>
          <p className="mt-1 text-sm/6 text-zinc-600 dark:text-zinc-400">{s.text}</p>
          {i < steps.length - 1 && (
            <ArrowRightIcon className="absolute top-10 -right-3.5 z-10 hidden size-5 rounded-full bg-white stroke-zinc-400 ring-1 ring-zinc-900/10 sm:block dark:bg-zinc-900 dark:ring-white/10" />
          )}
        </li>
      ))}
    </ol>
  )
}

// A spec sheet: a label with its value under it, three to a row (like a marketplace listing)
export function SpecGrid({ items }) {
  return (
    <dl className="not-prose my-8 grid grid-cols-1 gap-x-8 gap-y-6 border-t border-zinc-900/7.5 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-none dark:border-white/10">
      {items.map((f) => (
        <div key={f.term}>
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
export function StepList({ steps }) {
  return (
    <ol className="not-prose my-8">
      {steps.map((s, i) => (
        <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-9 bottom-1 left-4 w-px bg-zinc-900/10 dark:bg-white/10" />}
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-zinc-900 dark:text-emerald-400 dark:ring-emerald-400/30">
            {i + 1}
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</p>
            {s.text && <div className="mt-1 text-sm/6 text-zinc-600 dark:text-zinc-400 [&_a]:font-medium [&_a]:text-emerald-600 dark:[&_a]:text-emerald-400 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-zinc-900 dark:[&_code]:text-white">{s.text}</div>}
            {s.action && <div className="mt-4">{s.action}</div>}
          </div>
        </li>
      ))}
    </ol>
  )
}

// The next page, as one compact row (after Compass's "up next" link)
export function UpNext({ href, title, text }) {
  return (
    <Link
      href={href}
      className="not-prose group my-8 flex items-center gap-4 rounded-2xl px-5 py-4 ring-1 ring-zinc-900/7.5 transition hover:bg-zinc-50 hover:ring-emerald-500/40 dark:ring-white/10 dark:hover:bg-white/2.5 dark:hover:ring-emerald-400/40"
    >
      <div className="min-w-0 flex-auto">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Up next</p>
        <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-sm/6 text-zinc-600 dark:text-zinc-400">{text}</p>
      </div>
      <ArrowRightIcon className="size-5 flex-none stroke-zinc-400 transition group-hover:translate-x-0.5 group-hover:stroke-emerald-500" />
    </Link>
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

// A single raised pill that downloads a file (the settings form, say)
export function DownloadPill({ href, label, title }) {
  return (
    <a
      href={href}
      download
      title={title}
      className="group inline-flex items-center gap-2 rounded-full bg-linear-to-b from-white to-zinc-50 py-1.5 pr-3.5 pl-4 text-sm font-semibold text-zinc-900 shadow-[0_1px_2px_rgb(23_33_71/0.08),0_2px_6px_rgb(23_33_71/0.06)] ring-1 ring-zinc-900/7.5 transition hover:to-white dark:from-zinc-700 dark:to-zinc-800 dark:text-white dark:ring-white/10 dark:hover:to-zinc-700"
    >
      {label}
      <DownloadIcon className="size-4 flex-none stroke-current transition group-hover:translate-y-0.5" />
    </a>
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

// Token.io's banner, on an off-white background instead of black
function BasketIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3 9.75h18l-1.7 8.5a2 2 0 0 1-2 1.6H6.7a2 2 0 0 1-2-1.6L3 9.75ZM8 9.75 11 4.5M16 9.75 13 4.5M3.8 13.75h16.4M9.25 9.75v10M14.75 9.75v10" />
    </svg>
  )
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function ArrowDownCircleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

const BANNER_POINTS = [
  { icon: BasketIcon, title: 'Easy to use.', text: 'No registration or card details required.' },
  { icon: LockIcon, title: 'Secure.', text: '2.4x lower* fraud vs. traditional payment methods.' },
  { icon: ArrowDownCircleIcon, title: 'Lower cost.', text: 'Substantial savings vs. other methods.' },
]

export function PayByBankBanner() {
  return (
    <figure className="not-prose my-10 xl:max-w-none">
      <div className="grid gap-8 rounded-3xl bg-zinc-50 px-8 py-9 ring-1 ring-zinc-900/5 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14 lg:px-12 dark:bg-white/2.5 dark:ring-white/10">
        <p className="text-3xl/9 font-medium tracking-tight text-zinc-900 dark:text-white">
          Lower fees.
          <br />
          Faster payments.
          <br />
          No compromises.
        </p>
        <dl className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {BANNER_POINTS.map((p) => (
            <div key={p.title} className="text-sm/6 text-zinc-700 dark:text-zinc-300">
              <p.icon className="size-8 text-zinc-900 dark:text-white" />
              <dt className="mt-4 inline font-semibold text-zinc-900 dark:text-white">{p.title}</dt> <dd className="inline">{p.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figcaption className="mt-2 px-2 text-xs text-zinc-500 dark:text-zinc-400">
        *Against payments industry norms, from Open Banking Limited data. Banner by Token.io.
      </figcaption>
    </figure>
  )
}
