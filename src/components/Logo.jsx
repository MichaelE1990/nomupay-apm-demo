import clsx from 'clsx'

export function Logo({ className }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 whitespace-nowrap', className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 flex-none">
        <rect width="24" height="24" rx="6" className="fill-emerald-500 dark:fill-emerald-400" />
        <path d="M7 17V7h2.2l5.6 6.6V7H17v10h-2.2L9.2 10.4V17H7Z" className="fill-white dark:fill-zinc-900" />
      </svg>
      <span className="text-sm/6 font-semibold text-zinc-900 dark:text-white">
        NomuPay <span className="font-medium text-emerald-500 dark:text-emerald-400">APM Demo</span>
      </span>
    </span>
  )
}
