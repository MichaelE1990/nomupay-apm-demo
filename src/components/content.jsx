import clsx from 'clsx'

// Row / Col / Note / Properties from the Protocol template's mdx components

function InfoIcon(props) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="8" strokeWidth="0" />
      <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 7.75h1.5v3.5" />
      <circle cx="8" cy="4" r=".5" fill="none" />
    </svg>
  )
}

const noteTones = {
  emerald:
    'border-emerald-500/20 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200',
  amber:
    'border-amber-500/25 bg-amber-50/60 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200',
  rose: 'border-rose-500/20 bg-rose-50/60 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-200',
}
const noteIcon = {
  emerald: 'fill-emerald-500 stroke-white dark:fill-emerald-200/20 dark:stroke-emerald-200',
  amber: 'fill-amber-500 stroke-white dark:fill-amber-200/20 dark:stroke-amber-200',
  rose: 'fill-rose-500 stroke-white dark:fill-rose-200/20 dark:stroke-rose-200',
}

export function Note({ children, tone = 'emerald', className }) {
  return (
    <div className={clsx('not-prose my-6 flex gap-2.5 rounded-2xl border p-4 text-sm/6', noteTones[tone], className)}>
      <InfoIcon className={clsx('mt-1 h-4 w-4 flex-none', noteIcon[tone])} />
      <div className="min-w-0 *:first:mt-0 *:last:mb-0 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8125rem] dark:[&_code]:bg-white/10">
        {children}
      </div>
    </div>
  )
}

export function Row({ children }) {
  return (
    <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">{children}</div>
  )
}

export function Col({ children, sticky = false }) {
  return (
    <div className={clsx('min-w-0 *:first:mt-0 *:last:mb-0', sticky && 'xl:sticky xl:top-24')}>{children}</div>
  )
}

export function Properties({ children, className }) {
  return (
    <div className={clsx('not-prose my-6', className)}>
      <ul role="list" className="m-0 list-none divide-y divide-zinc-900/5 p-0 dark:divide-white/5">
        {children}
      </ul>
    </div>
  )
}

export function Property({ name, type, badge, children, control }) {
  return (
    <li className="m-0 px-0 py-4 first:pt-0 last:pb-0">
      <dl className="m-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <dt className="sr-only">Name</dt>
        <dd>
          <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900 ring-1 ring-zinc-300 ring-inset dark:bg-zinc-700/15 dark:text-white dark:ring-white/10">
            {name}
          </code>
        </dd>
        {type && (
          <>
            <dt className="sr-only">Type</dt>
            <dd className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{type}</dd>
          </>
        )}
        {badge && <dd>{badge}</dd>}
        {children && (
          <>
            <dt className="sr-only">Description</dt>
            <dd className="w-full flex-none text-sm text-zinc-600 dark:text-zinc-400 [&_code]:font-mono [&_code]:text-xs [&_code]:break-all [&_code]:text-zinc-900 dark:[&_code]:text-white">{children}</dd>
          </>
        )}
        {control && <dd className="w-full flex-none">{control}</dd>}
      </dl>
    </li>
  )
}
