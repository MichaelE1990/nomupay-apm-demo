'use client'

import clsx from 'clsx'
import { useState } from 'react'

import { Tag } from '@/components/Tag'

// Parameter listings in the API reference style: the name on the left; the OPPWA
// format, pattern and requirement on the right; then the description and an example.
// Objects open their child parameters, as in the Stripe API reference.

const BADGES = {
  M: ['Required', 'bg-rose-50 text-rose-700/80 ring-rose-600/10 dark:bg-rose-400/10 dark:text-rose-300/75 dark:ring-rose-400/15'],
  C: ['Conditional', 'bg-amber-50 text-amber-700/85 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300/75 dark:ring-amber-400/15'],
  O: ['Optional', 'bg-zinc-50 text-zinc-500 ring-zinc-500/15 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10'],
  T: ['Test only', 'bg-zinc-50 text-zinc-500 ring-zinc-500/15 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10'],
  A: ['Always', 'bg-zinc-50 text-zinc-600 ring-zinc-500/15 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10'],
}

export function ReqBadge({ req }) {
  let [text, color] = BADGES[req] || BADGES.O
  return (
    <span className={clsx('inline-flex flex-none items-center rounded-md px-1.5 py-0.5 text-[0.6875rem]/4 font-medium ring-1 ring-inset', color)}>
      {text}
    </span>
  )
}

const isValue = (v) => v !== undefined && v !== null && typeof v !== 'object' && String(v) !== ''

function PlusIcon({ open, ...props }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d={open ? 'M4 8h8' : 'M8 4v8M4 8h8'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// A list of parameters (a <ul>, so it can sit in a ParamGroup or on its own)
export function ParamList({ children, className }) {
  return <ul role="list" className={clsx('param-list m-0 list-none divide-y divide-zinc-900/5 p-0 dark:divide-white/5', className)}>{children}</ul>
}

// doc: { name, format, pattern, req, text, type, children, example }
// value: what the current request or the last response holds for it
// prefix: the parent's path, shown muted in front of a child's name
export function ParamDoc({ doc, value, prefix, note, missing, onPlayground }) {
  let example = isValue(value) ? String(value) : doc.example
  let kids = doc.children
  let childValue = (child) => {
    if (doc.type === 'array') return Array.isArray(value) ? value[0]?.[child.name] : undefined
    return value && typeof value === 'object' ? value[child.name] : undefined
  }
  let childPrefix = `${prefix || ''}${doc.name}${doc.type === 'array' ? '[n]' : ''}.`
  return (
    <li className="m-0 px-0 py-3.5 first:pt-3 last:pb-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="min-w-0 font-mono text-[0.8125rem] break-all">
          {prefix && <span className="text-zinc-400 dark:text-zinc-500">{prefix}</span>}
          <span className="font-semibold text-zinc-900 dark:text-white">{doc.name}</span>
          {doc.type && <span className="ml-2 text-xs font-normal text-zinc-400 dark:text-zinc-500">{doc.type}</span>}
        </span>
        <span className="ml-auto flex max-w-full flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
          {doc.format && <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">{doc.format}</span>}
          {doc.pattern && (
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.6875rem]/4 break-all text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
              {doc.pattern}
            </code>
          )}
          {doc.req && <ReqBadge req={doc.req} />}
        </span>
      </div>
      {doc.text && <p className="mt-1.5 text-[0.8125rem]/5 text-zinc-600 dark:text-zinc-400">{doc.text}</p>}
      {note && <p className="mt-1 text-[0.8125rem]/5 text-zinc-500 dark:text-zinc-400">{note}</p>}
      {missing ? (
        <p className="mt-2 text-xs text-rose-700/80 dark:text-rose-300/75">
          Not set yet.{' '}
          {onPlayground && (
            <button type="button" onClick={onPlayground} className="font-medium underline decoration-rose-600/30 underline-offset-2 hover:decoration-rose-600">
              Add it in the Playground
            </button>
          )}
        </p>
      ) : (
        example !== undefined &&
        !kids && (
          <p className="mt-2 flex min-w-0 items-baseline gap-2 text-xs">
            <span className="flex-none text-zinc-400 dark:text-zinc-500">Example</span>
            <code className="min-w-0 font-mono break-words text-zinc-800 dark:text-zinc-200">{example}</code>
          </p>
        )
      )}
      {kids && <ChildParams docs={kids} valueOf={childValue} prefix={childPrefix} />}
    </li>
  )
}

function ChildParams({ docs, valueOf, prefix }) {
  let [open, setOpen] = useState(false)
  let button = (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white',
        !open && 'rounded-full px-3 py-1 ring-1 ring-zinc-900/10 ring-inset hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/5',
      )}
    >
      <PlusIcon open={open} className="size-3.5" />
      {open ? 'Hide child parameters' : 'Show child parameters'}
    </button>
  )
  if (!open) return <div className="mt-3">{button}</div>
  return (
    <div className="mt-3 rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
      <div className="border-b border-zinc-900/7.5 px-4 py-2 dark:border-white/10">{button}</div>
      <ParamList className="px-4">
        {docs.map((d) => (
          <ParamDoc key={d.name} doc={d} value={valueOf(d)} prefix={prefix} />
        ))}
      </ParamList>
    </div>
  )
}

function CopyIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <rect x="5.25" y="5.25" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10.75 3.25h-6a1.5 1.5 0 0 0-1.5 1.5v6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function CopyValue({ value, label }) {
  let [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${label || value}`}
      title={copied ? 'Copied' : 'Copy'}
      onClick={() =>
        window.navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1000)
          })
          .catch(() => {})
      }
      className="flex-none rounded p-0.5 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
    >
      {copied ? (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-3.5 text-emerald-500">
          <path d="m4 8.5 2.5 2.5L12 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  )
}

// The request's properties: method and endpoint, the host, and how the body is sent
export function RequestProperties({ method, path, base, form = method === 'POST' }) {
  let rows = [
    [
      'Endpoint',
      <span key="e" className="flex min-w-0 items-center gap-2">
        <Tag variant="small" color={method === 'GET' ? 'green' : 'emerald'}>
          {method}
        </Tag>
        <code className="min-w-0 truncate font-mono text-xs text-zinc-900 dark:text-white">{path}</code>
      </span>,
    ],
    [
      'Base URL',
      <span key="b" className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 truncate font-mono text-xs text-zinc-900 dark:text-white">{base}</code>
        <CopyValue value={base} label="base URL" />
      </span>,
    ],
    form && ['Content type', <code key="c" className="font-mono text-xs text-zinc-700 dark:text-zinc-300">application/x-www-form-urlencoded</code>],
  ].filter(Boolean)
  return (
    <dl className="param-list not-prose my-6 divide-y divide-zinc-900/5 rounded-xl ring-1 ring-zinc-900/7.5 dark:divide-white/5 dark:ring-white/10">
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-w-0 items-center gap-4 px-4 py-2.5">
          <dt className="w-28 flex-none text-[0.8125rem] text-zinc-500 dark:text-zinc-400">{k}</dt>
          <dd className="flex min-w-0 flex-auto">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
