'use client'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import clsx from 'clsx'
import { useMotionValue } from 'framer-motion'
import Link from 'next/link'

import { ResourceIcon, ResourcePattern } from '@/components/Resources'

export { ReqText } from '@/components/forms'

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Request parameters, grouped as in the parameters reference on docs.oppwa.com
// ---------------------------------------------------------------------------

export function ParamGroups({ children }) {
  return <div className="not-prose my-6 border-y border-zinc-900/10 dark:border-white/10">{children}</div>
}

// One collapsible group: "Basic payment", "Customer", "Cart"…
// required: how many of its parameters are mandatory; missing: how many still need a value
export function ParamGroup({ title, count, required = 0, missing = 0, defaultOpen = false, children }) {
  return (
    <Disclosure as="div" defaultOpen={defaultOpen} className="border-t border-zinc-900/10 first:border-t-0 dark:border-white/10">
      <DisclosureButton className="group flex w-full items-center gap-3 py-3.5 text-left">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
        <span className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
          {count} {count === 1 ? 'parameter' : 'parameters'}
          {required > 0 && !missing ? ` · ${required} required` : ''}
        </span>
        {missing > 0 && <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{missing} to fill in</span>}
        <ChevronDownIcon className="ml-auto size-4 flex-none text-zinc-500 transition group-data-open:rotate-180 dark:text-zinc-400" />
      </DisclosureButton>
      <DisclosurePanel className="pb-5">
        <ul role="list" className="m-0 list-none divide-y divide-zinc-900/5 border-t border-zinc-900/5 p-0 pt-3.5 dark:divide-white/5 dark:border-white/5">
          {children}
        </ul>
      </DisclosurePanel>
    </Disclosure>
  )
}

// ---------------------------------------------------------------------------
// Flow cards: two cards (the intro page's card style); the chosen one opens a
// tray underneath to pick the transaction flow
// ---------------------------------------------------------------------------

function RedirectIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 3.5h5.5V9M16.5 3.5 9.5 10.5M8 4.5H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16.5h9a1.5 1.5 0 0 0 1.5-1.5v-3"
      />
    </svg>
  )
}

function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="5.75" y="2.5" width="8.5" height="15" rx="2" strokeWidth="1.5" />
      <path fill="none" strokeWidth="1.5" strokeLinecap="round" d="M9 14.5h2" />
    </svg>
  )
}

const FLOW_ICONS = { async: RedirectIcon, sync: PhoneIcon }
const FLOW_PATTERNS = {
  async: { y: -6, squares: [[-1, 2], [1, 3]] },
  sync: { y: 16, squares: [[0, 1], [1, 3]] },
}

function Radio({ on }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex size-4 flex-none items-center justify-center rounded-full ring-1 transition ring-inset',
        on ? 'bg-zinc-900 ring-zinc-900 dark:bg-white dark:ring-white' : 'bg-white ring-zinc-900/20 dark:bg-transparent dark:ring-white/25',
      )}
    >
      {on && <span className="size-1.5 rounded-full bg-white dark:bg-zinc-900" />}
    </span>
  )
}

function FlowCard({ mode, selected, onSelect, tray }) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)
  function onMouseMove({ currentTarget, clientX, clientY }) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }
  return (
    <div
      className={clsx(
        'rounded-2xl transition-colors duration-300',
        selected ? 'bg-zinc-100 ring-1 ring-zinc-900/7.5 dark:bg-white/5 dark:ring-white/10' : 'bg-transparent',
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className={clsx(
          'group relative flex rounded-2xl transition-shadow',
          selected
            ? 'bg-white shadow-sm shadow-zinc-900/5 dark:bg-zinc-900'
            : 'bg-zinc-50 hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5',
        )}
      >
        <ResourcePattern {...FLOW_PATTERNS[mode.value]} mouseX={mouseX} mouseY={mouseY} />
        <div
          className={clsx(
            'absolute inset-0 rounded-2xl ring-1 ring-inset',
            selected ? 'ring-zinc-900/15 dark:ring-white/20' : 'ring-zinc-900/7.5 group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20',
          )}
        />
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={onSelect}
          className="relative w-full rounded-2xl px-4 pt-5 pb-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <span className="flex items-start justify-between">
            <ResourceIcon icon={FLOW_ICONS[mode.value]} />
            <Radio on={selected} />
          </span>
          <span className="mt-6 block text-sm/7 font-semibold text-zinc-900 dark:text-white">{mode.title}</span>
          <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{mode.description}</span>
        </button>
      </div>
      {/* The tray slides open under the chosen card */}
      <div
        inert={!selected}
        className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', selected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden">{tray}</div>
      </div>
    </div>
  )
}

// modes: [{ value, title, description, flows: [{ value, title, types: ['PA','CP'] }] }]
export function FlowCards({ modes, mode, tx, onChange, footer }) {
  return (
    <div role="radiogroup" aria-label="Payment flow" className="not-prose my-6 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
      {modes.map((m) => {
        let selected = m.value === mode
        return (
          <FlowCard
            key={m.value}
            mode={m}
            selected={selected}
            onSelect={() => onChange({ mode: m.value, tx: m.flows.some((f) => f.value === tx) ? tx : m.flows[0].value })}
            tray={
              <div className="px-4 pt-3.5 pb-4">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Transaction flow</p>
                <div role="radiogroup" aria-label={`${m.title}: transaction flow`} className="mt-2 grid gap-1">
                  {m.flows.map((f) => {
                    let on = selected && f.value === tx
                    return (
                      <button
                        key={f.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange({ mode: m.value, tx: f.value })}
                        className={clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition',
                          on
                            ? 'bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
                        )}
                      >
                        <Radio on={on} />
                        <span className="min-w-0 flex-auto">{f.title}</span>
                        <span className="flex-none font-mono text-[0.6875rem] text-zinc-400 dark:text-zinc-500">{f.types.join(' · ')}</span>
                      </button>
                    )
                  })}
                </div>
                {selected && footer && <p className="mt-3 text-xs/5 text-zinc-500 dark:text-zinc-400">{footer}</p>}
              </div>
            }
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sequence diagram: who sends what to whom, for the chosen flow
// ---------------------------------------------------------------------------

export const LANES = [
  { id: 'shopper', label: 'Shopper', bar: 'bg-emerald-500 dark:bg-emerald-400' },
  { id: 'server', label: 'Your server', bar: 'bg-amber-500 dark:bg-amber-400' },
  { id: 'gateway', label: 'NomuPay gateway', bar: 'bg-sky-500 dark:bg-sky-400' },
  { id: 'brand', label: 'Payment brand', bar: 'bg-violet-500 dark:bg-violet-400' },
]
const laneIndex = (id) => LANES.findIndex((l) => l.id === id)
const laneCenter = (i) => `${((i + 0.5) / LANES.length) * 100}%`

function ArrowHead({ dir }) {
  return (
    <svg
      viewBox="0 0 8 10"
      aria-hidden="true"
      className={clsx('absolute top-1/2 h-2.5 w-2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500', dir === 'right' ? '-right-0.5' : '-left-0.5 rotate-180')}
    >
      <path d="M1 1.5 5.5 5 1 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MessageBox({ message, maxWidth }) {
  let inner = (
    <>
      <span className="block font-medium text-zinc-900 dark:text-white">
        {message.step && <span className="mr-1.5 font-normal text-zinc-400 tabular-nums dark:text-zinc-500">{message.step}</span>}
        {message.label}
        {message.optional && <span className="ml-1.5 font-normal text-zinc-400 dark:text-zinc-500">Optional</span>}
      </span>
      {message.detail && (
        <span className="mt-0.5 block font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
          {message.detail.split(' · ').map((part, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <span className="whitespace-nowrap">{part}</span>
            </span>
          ))}
        </span>
      )}
    </>
  )
  let className = clsx(
    'relative z-10 block rounded-lg px-2.5 py-1.5 text-center text-xs/5 shadow-sm ring-1 ring-zinc-900/7.5 dark:ring-white/10',
    message.kind === 'note' ? 'bg-zinc-50 dark:bg-zinc-800/80' : 'bg-white dark:bg-zinc-800',
    message.href && 'transition hover:ring-zinc-900/20 dark:hover:ring-white/25',
  )
  return message.href ? (
    <Link href={`#${message.href}`} className={className} style={{ maxWidth }}>
      {inner}
    </Link>
  ) : (
    <span className={className} style={{ maxWidth }}>
      {inner}
    </span>
  )
}

function MessageRow({ message }) {
  let a = laneIndex(message.from)
  let b = laneIndex(message.to || message.from)
  let lo = Math.min(a, b)
  let hi = Math.max(a, b)
  let span = hi - lo + 1
  let note = a === b
  // From one lane's centre to the other's, inside the columns the message spans
  let inset = `calc(100% / ${2 * span})`
  let maxWidth = note ? 'calc(100% - 1rem)' : `calc(${((span - 1) / span) * 100}% - 1.25rem)`
  return (
    <li className="relative grid grid-cols-4 items-center py-2">
      {[...new Set([a, b])].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={clsx('absolute inset-y-1 w-[3px] -translate-x-1/2 rounded-full opacity-80', LANES[i].bar)}
          style={{ left: laneCenter(i) }}
        />
      ))}
      <div className="relative flex justify-center" style={{ gridColumn: `${lo + 1} / ${hi + 2}` }}>
        {!note && (
          <span
            aria-hidden="true"
            className={clsx(
              'absolute top-1/2 h-0 border-t',
              message.kind === 'response' ? 'border-dashed border-zinc-400 dark:border-zinc-500' : 'border-zinc-400 dark:border-zinc-500',
            )}
            style={{ left: `calc(${inset} + 4px)`, right: `calc(${inset} + 4px)` }}
          >
            <ArrowHead dir={b > a ? 'right' : 'left'} />
          </span>
        )}
        <MessageBox message={message} maxWidth={maxWidth} />
      </div>
    </li>
  )
}

// messages: [{ from, to?, label, detail?, step?, href?, kind: 'request' | 'response' | 'note', optional? }]
export function SequenceDiagram({ title, messages }) {
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-2xl xl:max-w-none bg-zinc-50 ring-1 ring-zinc-900/7.5 dark:bg-white/2.5 dark:ring-white/10">
      {title && (
        <figcaption className="border-b border-zinc-900/7.5 px-4 py-2.5 text-xs font-medium text-zinc-600 dark:border-white/10 dark:text-zinc-400">{title}</figcaption>
      )}
      <div className="overflow-x-auto bg-[image:radial-gradient(var(--dot)_1px,transparent_1px)] [--dot:rgb(24_24_27/0.09)] bg-size-[16px_16px] dark:[--dot:rgb(255_255_255/0.07)]">
        <div className="relative min-w-[44rem] px-2 pt-4 pb-5">
          {/* Lifelines */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-12 bottom-3 grid grid-cols-4">
            {LANES.map((l) => (
              <div key={l.id} className="flex justify-center">
                <span className="w-px bg-zinc-300 dark:bg-white/15" />
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-4 pb-5">
            {LANES.map((l) => (
              <div key={l.id} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">{l.label}</span>
                <span aria-hidden="true" className={clsx('h-3 w-[3px] rounded-full', l.bar)} />
              </div>
            ))}
          </div>
          <ol role="list" className="relative m-0 list-none p-0">
            {messages.map((m, i) => (
              <MessageRow key={i} message={m} />
            ))}
          </ol>
        </div>
      </div>
    </figure>
  )
}
