'use client'

import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { Tag } from '@/components/Tag'

// Code panel in the Protocol template's CodeGroup style, for code that changes
// as the page is used (live requests and real responses).

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        strokeWidth="0"
        d="M5.5 13.5v-5a2 2 0 0 1 2-2l.447-.894A2 2 0 0 1 9.737 4.5h.527a2 2 0 0 1 1.789 1.106l.447.894a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2Z"
      />
      <path
        fill="none"
        strokeLinejoin="round"
        d="M12.5 6.5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2m5 0-.447-.894a2 2 0 0 0-1.79-1.106h-.527a2 2 0 0 0-1.789 1.106L7.5 6.5m5 0-1 1h-3l-1-1"
      />
    </svg>
  )
}

function CopyButton({ code }) {
  let [copyCount, setCopyCount] = useState(0)
  let copied = copyCount > 0

  useEffect(() => {
    if (copyCount > 0) {
      let timeout = setTimeout(() => setCopyCount(0), 1000)
      return () => clearTimeout(timeout)
    }
  }, [copyCount])

  return (
    <button
      type="button"
      className={clsx(
        'group/button absolute top-3.5 right-4 overflow-hidden rounded-full py-1 pr-3 pl-2 text-2xs font-medium opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus:opacity-100',
        copied
          ? 'bg-emerald-400/10 ring-1 ring-emerald-400/20 ring-inset'
          : 'bg-white/5 hover:bg-white/7.5 dark:bg-white/2.5 dark:hover:bg-white/5',
      )}
      onClick={() => {
        window.navigator.clipboard
          .writeText(code)
          .then(() => setCopyCount((count) => count + 1))
          .catch(() => {})
      }}
    >
      <span
        aria-hidden={copied}
        className={clsx(
          'pointer-events-none flex items-center gap-0.5 text-zinc-400 transition duration-300',
          copied && '-translate-y-1.5 opacity-0',
        )}
      >
        <ClipboardIcon className="h-5 w-5 fill-zinc-500/20 stroke-zinc-500 transition-colors group-hover/button:stroke-zinc-400" />
        Copy
      </span>
      <span
        aria-hidden={!copied}
        className={clsx(
          'pointer-events-none absolute inset-0 flex items-center justify-center text-emerald-400 transition duration-300',
          !copied && 'translate-y-1.5 opacity-0',
        )}
      >
        Copied!
      </span>
    </button>
  )
}

export function CodeWindow({ title, tag, label, code, html, empty, footer, status, className }) {
  return (
    <div
      className={clsx(
        'not-prose my-6 overflow-hidden rounded-2xl bg-zinc-900 shadow-md dark:ring-1 dark:ring-white/10',
        className,
      )}
    >
      <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-center gap-x-4 border-b border-zinc-700 bg-zinc-800 px-4 dark:border-zinc-800 dark:bg-transparent">
        <h3 className="mr-auto py-3 text-xs font-semibold text-white">{title}</h3>
        {status}
      </div>
      {(tag || label) && (
        <div className="flex h-9 items-center gap-2 border-y border-t-transparent border-b-white/7.5 bg-zinc-900 bg-white/2.5 px-4 dark:border-b-white/5 dark:bg-white/1">
          {tag && (
            <div className="dark flex">
              <Tag variant="small">{tag}</Tag>
            </div>
          )}
          {tag && label && <span className="h-0.5 w-0.5 rounded-full bg-zinc-500" />}
          {label && <span className="truncate font-mono text-xs text-zinc-400">{label}</span>}
        </div>
      )}
      <div className="group relative dark:bg-white/2.5">
        {code ? (
          <>
            <pre className="max-h-[32rem] overflow-auto p-4 text-xs/5 text-white">
              <code dangerouslySetInnerHTML={{ __html: html ?? code }} />
            </pre>
            <CopyButton code={code} />
          </>
        ) : (
          <p className="p-4 text-xs/5 text-zinc-400">{empty}</p>
        )}
      </div>
      {footer && <div className="border-t border-white/7.5 bg-white/2.5 px-4 py-3 dark:border-white/5">{footer}</div>}
    </div>
  )
}

// Primary action inside a code panel footer: emerald so it reads on the dark panel in both themes
const sendClass =
  'inline-flex justify-center rounded-full bg-emerald-500 px-3 py-1 text-sm font-medium text-white transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-500'

export function SendButton({ className, children, ...props }) {
  return (
    <button type="button" {...props} className={clsx(sendClass, className)}>
      {children}
    </button>
  )
}

// Same look for a link, or a disabled-looking span when there's nowhere to go yet
export function SendLink({ href, className, children }) {
  if (!href) return <span className={clsx(sendClass, 'cursor-not-allowed opacity-40', className)}>{children}</span>
  return (
    <a href={href} className={clsx(sendClass, className)}>
      {children}
    </a>
  )
}
