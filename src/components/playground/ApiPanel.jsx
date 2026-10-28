'use client'

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { StatusBadge } from '@/components/forms'
import { Tag } from '@/components/Tag'

function CopyButton({ code }) {
  let [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    let t = setTimeout(() => setCopied(false), 1000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(code).then(() => setCopied(true), () => {})}
      className={clsx(
        'absolute top-2.5 right-3 rounded-full px-2.5 py-0.5 text-2xs font-medium opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus:opacity-100',
        copied ? 'bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20 ring-inset' : 'bg-white/5 text-zinc-400 hover:bg-white/10',
      )}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// Protocol-style dark code panel with Request / Response tabs
// `focus` switches to a tab when its key changes, e.g. to Response when one arrives
export function CodeTabs({ tabs, className, focus }) {
  let shown = tabs.filter(Boolean)
  let [index, setIndex] = useState(focus?.index ?? 0)
  useEffect(() => {
    if (focus) setIndex(focus.index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key])
  return (
    <TabGroup
      selectedIndex={index}
      onChange={setIndex}
      className={clsx('overflow-hidden rounded-xl bg-zinc-900 shadow-md ring-1 ring-zinc-900/10 dark:ring-white/10', className)}
    >
      <div className="flex items-center gap-4 border-b border-zinc-700 bg-zinc-800 px-4 dark:border-zinc-800 dark:bg-white/2.5">
        <TabList className="-mb-px flex gap-4 text-xs font-medium">
          {shown.map((t) => (
            <Tab
              key={t.name}
              className="border-b border-transparent py-2.5 text-zinc-400 transition outline-none hover:text-zinc-300 data-selected:border-emerald-500 data-selected:text-emerald-400"
            >
              {t.name}
            </Tab>
          ))}
        </TabList>
      </div>
      <TabPanels>
        {shown.map((t) => (
          <TabPanel key={t.name} className="group relative outline-none">
            {t.code ? (
              <>
                <pre className="max-h-96 overflow-auto p-4 text-xs/5 text-white">
                  <code dangerouslySetInnerHTML={{ __html: t.html ?? t.code }} />
                </pre>
                <CopyButton code={t.code} />
              </>
            ) : (
              <p className="p-4 text-xs/5 text-zinc-400">{t.empty}</p>
            )}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  )
}

const dotTone = {
  done: 'bg-emerald-500 text-white ring-emerald-500',
  active: 'bg-white text-emerald-600 ring-emerald-500 dark:bg-zinc-900 dark:text-emerald-400',
  waiting: 'bg-white text-zinc-400 ring-zinc-300 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-white/15',
}

export function Step({ number, state = 'waiting', tag, path, title, badge, children, last }) {
  return (
    <li className="relative pb-8 last:pb-0">
      {!last && <div className="absolute top-8 bottom-0 left-3.5 w-px bg-zinc-900/10 dark:bg-white/10" aria-hidden="true" />}
      <div className="relative flex gap-4">
        <span className={clsx('flex size-7 flex-none items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset', dotTone[state])}>
          {state === 'done' ? (
            <svg viewBox="0 0 14 14" fill="none" className="size-3.5 stroke-current" aria-hidden="true">
              <path d="M3 7.5l2.5 2.5L11 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            number
          )}
        </span>
        <div className="min-w-0 flex-auto">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
            {badge}
          </div>
          {(tag || path) && (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {tag && <Tag>{tag}</Tag>}
              {path && <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{path}</span>}
            </div>
          )}
          <div className="mt-2 space-y-3 text-sm text-zinc-600 dark:text-zinc-400 [&_p_code]:font-mono [&_p_code]:text-xs [&_p_code]:text-zinc-900 dark:[&_p_code]:text-white">
            {children}
          </div>
        </div>
      </div>
    </li>
  )
}

export function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      <span className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500 dark:border-zinc-600" />
      {label}
    </span>
  )
}

export { StatusBadge }
