'use client'

import { Switch } from '@headlessui/react'
import clsx from 'clsx'

import { Tag } from '@/components/Tag'

// Tailwind UI form controls in the Protocol palette (zinc + emerald)

const inputClass =
  'block w-full rounded-lg bg-white px-3 py-1.5 text-sm/6 text-zinc-900 outline-1 -outline-offset-1 outline-zinc-900/10 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-500 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-500 dark:focus:outline-emerald-400'

export function TextInput({ className, invalid, ...props }) {
  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck="false"
      {...props}
      className={clsx(inputClass, invalid && 'outline-rose-400 dark:outline-rose-400/60', className)}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <div className={clsx('grid grid-cols-1', className)}>
      <select
        {...props}
        className={clsx(inputClass, 'col-start-1 row-start-1 appearance-none pr-8 dark:*:bg-zinc-800')}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 mr-2 size-4 self-center justify-self-end text-zinc-500"
      >
        <path
          fillRule="evenodd"
          d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}

export function Toggle({ checked, onChange, label, description, children, disabled }) {
  return (
    <div className={clsx('rounded-2xl p-4 ring-1 ring-zinc-900/7.5 transition dark:ring-white/10', checked && 'ring-emerald-500/40 dark:ring-emerald-400/30', disabled && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</p>
          {description && <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</div>}
        </div>
        <Switch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-label={label}
          className="group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-900/5 outline-offset-2 outline-emerald-500 transition-colors duration-200 ease-in-out focus-visible:outline-2 data-checked:bg-emerald-500 data-disabled:cursor-not-allowed dark:bg-white/10 dark:inset-ring-white/10 dark:data-checked:bg-emerald-500"
        >
          <span className="size-4 rounded-full bg-white shadow-xs ring-1 ring-zinc-900/5 transition-transform duration-200 ease-in-out group-data-checked:translate-x-4" />
        </Switch>
      </div>
      {checked && children && <div className="mt-4">{children}</div>}
    </div>
  )
}

const reqColor = { M: 'rose', C: 'amber', O: 'zinc' }
const reqName = { M: 'Mandatory', C: 'Conditional', O: 'Optional' }

export function ReqTag({ req }) {
  return (
    <span title={reqName[req]}>
      <Tag color={reqColor[req] || 'zinc'}>{reqName[req] || req}</Tag>
    </span>
  )
}

const statusStyles = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20',
  failed: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-400 dark:ring-rose-400/20',
  neutral: 'bg-zinc-50 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/20',
}
const statusLabel = { success: 'Successful', pending: 'Pending', failed: 'Failed', neutral: 'Not sent' }

// Tailwind UI "badge with dot"
export function StatusBadge({ status = 'neutral', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        statusStyles[status] || statusStyles.neutral,
        className,
      )}
    >
      <svg viewBox="0 0 6 6" aria-hidden="true" className="size-1.5 fill-current">
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children || statusLabel[status]}
    </span>
  )
}

export function Label({ htmlFor, children, hint }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-sm/6 font-medium text-zinc-900 dark:text-white">
        {children}
      </label>
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  )
}
