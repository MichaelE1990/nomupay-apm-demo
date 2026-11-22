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
export const TagIcon = icon('M10.5 3.25h5.25a1 1 0 0 1 1 1V9.5a1 1 0 0 1-.3.7l-6.55 6.55a1 1 0 0 1-1.4 0L3.25 11.5a1 1 0 0 1 0-1.4L9.8 3.55a1 1 0 0 1 .7-.3ZM13.5 6.5h.01')
export const ShieldIcon = icon('M10 2.75 4 5v4.5c0 3.6 2.55 6.55 6 7.75 3.45-1.2 6-4.15 6-7.75V5l-6-2.25ZM7.5 10l1.75 1.75L12.75 8')
export const ChartIcon = icon('M4.25 16.25V11M8.08 16.25V8M11.92 16.25V9.5M15.75 16.25V4.75M2.75 16.25h14.5')
export const ClockIcon = icon('M10 6.25V10l2.5 1.5M17.25 10a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z')
export const ReceiptIcon = icon('M5 2.75h10a.75.75 0 0 1 .75.75v13.75l-2.25-1.5-2.25 1.5L10 15.75l-1.25 1.5-2.25-1.5-2.25 1.5V3.5A.75.75 0 0 1 5 2.75ZM7.25 7h5.5M7.25 10h5.5M7.25 13h3')
export const HeadsetIcon = icon('M3.75 12.25V10a6.25 6.25 0 0 1 12.5 0v2.25M3.75 12.25a1.5 1.5 0 0 1 1.5-1.5h.5a1 1 0 0 1 1 1v2.5a1 1 0 0 1-1 1h-.5a1.5 1.5 0 0 1-1.5-1.5v-1.5ZM16.25 12.25a1.5 1.5 0 0 0-1.5-1.5h-.5a1 1 0 0 0-1 1v2.5a1 1 0 0 0 1 1h.5a1.5 1.5 0 0 0 1.5-1.5v-1.5ZM14.75 15.25c0 1.1-1.75 2-3.75 2')
export const LinkIcon = icon('M8.25 11.75a3.25 3.25 0 0 0 4.6 0l2.4-2.4a3.25 3.25 0 0 0-4.6-4.6l-.9.9M11.75 8.25a3.25 3.25 0 0 0-4.6 0l-2.4 2.4a3.25 3.25 0 0 0 4.6 4.6l.9-.9')
export const ServerIcon = icon('M4.75 3.25h10.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5ZM4.75 11.25h10.5a1.5 1.5 0 0 1 1.5 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-2.5a1.5 1.5 0 0 1 1.5-1.5ZM6 6h.01M6 14h.01M9 6h4.5M9 14h4.5')
export const SettingsIcon = icon('M10 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM10 2.75v1.5M10 15.75v1.5M17.25 10h-1.5M4.25 10h-1.5M15.13 4.87l-1.06 1.06M5.93 14.07l-1.06 1.06M15.13 15.13l-1.06-1.06M5.93 5.93 4.87 4.87')
export const ArrowRightIcon = icon('M4.25 10h11.5m0 0-4-4m4 4-4 4')

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

// Figures with their sources, in the style of Catalyst's stat
export function StatGrid({ stats, footnote }) {
  return (
    <div className="not-prose my-10 xl:max-w-none">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-t border-zinc-900/10 pt-5 dark:border-white/10">
            <dd className="text-3xl/8 font-semibold tracking-tight text-zinc-900 dark:text-white">{s.value}</dd>
            <dt className="mt-2 text-sm/6 text-zinc-600 dark:text-zinc-400">{s.label}</dt>
            <p className="mt-1 text-xs/5 text-zinc-400 dark:text-zinc-500">{s.source}</p>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-6 text-xs/5 text-zinc-400 dark:text-zinc-500">{footnote}</p>}
    </div>
  )
}

// Icon, title and a line of text, three to a row
export function FeatureGrid({ features }) {
  return (
    <dl className="not-prose my-8 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-none">
      {features.map((f) => (
        <div key={f.title} className="flex gap-4">
          <IconBadge icon={f.icon} className="size-9" />
          <div>
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">{f.title}</dt>
            <dd className="mt-1 text-sm/6 text-zinc-600 dark:text-zinc-400">{f.text}</dd>
          </div>
        </div>
      ))}
    </dl>
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

// A short list with check marks, two columns on wide screens
export function CheckList({ items }) {
  return (
    <ul className="not-prose my-6 grid grid-cols-1 gap-x-8 gap-y-3 text-sm/6 text-zinc-700 sm:grid-cols-2 dark:text-zinc-300">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <CheckCircleIcon className="mt-0.5 size-5 flex-none stroke-emerald-500" />
          {item}
        </li>
      ))}
    </ul>
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
          </div>
        </li>
      ))}
    </ol>
  )
}

// Steps across a dotted line, each with a pill, a title, a line of text and an optional link
export function StepStrip({ steps }) {
  return (
    <ol className="not-prose my-8 grid grid-cols-1 gap-y-6 sm:grid-cols-3 xl:max-w-none">
      {steps.map((s, i) => (
        <li key={s.title} className={clsx('flex flex-col', i > 0 && 'sm:border-l sm:border-zinc-900/7.5 sm:pl-5 dark:sm:border-white/10', i < steps.length - 1 && 'sm:pr-5')}>
          <span
            className={clsx(
              'self-start rounded-md px-2 py-1 text-xs font-medium ring-1',
              i === 0
                ? 'bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white'
                : 'bg-zinc-50 text-zinc-700 ring-zinc-900/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10',
            )}
          >
            Step {i + 1}
          </span>
          <span aria-hidden="true" className="mt-3 border-t border-dashed border-zinc-900/15 dark:border-white/15" />
          <p className="mt-4 text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</p>
          <p className="mt-1 flex-auto text-sm/6 text-zinc-600 dark:text-zinc-400">{s.text}</p>
          {s.href && (
            <Link href={s.href} className="group mt-3 flex items-center gap-1.5 self-start text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {s.action}
              <ArrowRightIcon className="size-4 stroke-current transition group-hover:translate-x-0.5" />
            </Link>
          )}
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

// Settings in three columns, one per group, each setting with its description under it
export function SettingColumns({ groups }) {
  return (
    <div className="not-prose my-8 grid grid-cols-1 gap-8 border-t border-zinc-900/7.5 pt-6 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-none dark:border-white/10">
      {groups.map((g) => (
        <section key={g.title}>
          <div className="flex items-center gap-3">
            <IconBadge icon={g.icon} className="size-8 [&_svg]:size-4" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{g.title}</h3>
          </div>
          <dl className="mt-4 space-y-4">
            {g.items.map((f) => (
              <div key={f.term}>
                <dt className="text-sm font-medium text-zinc-900 dark:text-white">{f.term}</dt>
                <dd className="mt-0.5 text-sm/6 text-zinc-600 dark:text-zinc-400">{f.details}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
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
