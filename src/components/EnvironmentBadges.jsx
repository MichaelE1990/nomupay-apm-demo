'use client'

import { useConfig } from '@/lib/useConfig'

export function EnvironmentBadges() {
  let config = useConfig()
  if (!config) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">Loading environment…</span>
  }
  let live = config.environment !== 'TEST'
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span
        className={
          live
            ? 'inline-flex items-center gap-x-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-400/10 dark:text-rose-400 dark:ring-rose-400/20'
            : 'inline-flex items-center gap-x-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20'
        }
      >
        <svg viewBox="0 0 6 6" aria-hidden="true" className="size-1.5 fill-current">
          <circle r={3} cx={3} cy={3} />
        </svg>
        {live ? 'LIVE' : 'TEST'}
      </span>
      <span className="hidden truncate font-mono text-xs text-zinc-500 sm:inline dark:text-zinc-400">{config.apiHost}</span>
      {!config.configured && (
        <span className="hidden rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset sm:inline dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20">
          Credentials missing
        </span>
      )}
    </div>
  )
}
