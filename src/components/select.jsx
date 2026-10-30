'use client'

import clsx from 'clsx'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Select menus in the Tailwind UI style: a compact trigger, and a panel with an
// optional search box, grouped options and a check on what's selected.
// Single (value: string) or multiple (value: string[], shown as chips).

function ChevronUpDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M5.22 10.22a.75.75 0 0 1 1.06 0L8 11.94l1.72-1.72a.75.75 0 1 1 1.06 1.06l-2.25 2.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 0 1 0-1.06ZM10.78 5.78a.75.75 0 0 1-1.06 0L8 4.06 6.28 5.78a.75.75 0 0 1-1.06-1.06l2.25-2.25a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
    </svg>
  )
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.75 12.75 3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function XMarkIcon(props) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" {...props}>
      <path d="m3 3 6 6m0-6L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CheckCircle({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex size-4 flex-none items-center justify-center rounded-full ring-1 ring-inset',
        checked ? 'bg-zinc-900 ring-zinc-900 dark:bg-emerald-500 dark:ring-emerald-500' : 'bg-white ring-zinc-300 dark:bg-white/5 dark:ring-white/20',
      )}
    >
      {checked && <CheckIcon className="size-3 text-white" />}
    </span>
  )
}

const fieldClass =
  'w-full rounded-lg bg-white text-left text-sm/6 text-zinc-900 outline-1 -outline-offset-1 outline-zinc-900/10 dark:bg-white/5 dark:text-white dark:outline-white/10'

const focusClass = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 dark:focus-visible:outline-emerald-400'

/**
 * options: [{ value, label, meta?, description?, leading?, trailing?, group?, keywords?, disabled? }]
 */
export function SelectMenu({
  options,
  value,
  onChange,
  multiple = false,
  searchable,
  searchPlaceholder = 'Search',
  placeholder = 'Select…',
  id,
  invalid,
  variant = 'field',
  maxChips = 3,
  align = 'left',
  className,
  panelClassName,
  renderValue,
  emptyText = 'No matches',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) {
  let [open, setOpen] = useState(false)
  let [query, setQuery] = useState('')
  let [active, setActive] = useState(0)
  let [dropUp, setDropUp] = useState(false)
  let rootRef = useRef(null)
  let triggerRef = useRef(null)
  let searchRef = useRef(null)
  let listRef = useRef(null)
  let baseId = useId()
  let listId = `${baseId}-list`
  let optionId = (i) => `${baseId}-opt-${i}`

  let selectedValues = multiple ? value || [] : value != null ? [value] : []
  let selectedOptions = selectedValues.map((v) => options.find((o) => o.value === v)).filter(Boolean)
  let withSearch = searchable ?? options.length > 8

  let filtered = useMemo(() => {
    let q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) =>
      [o.label, o.value, o.meta, typeof o.description === 'string' ? o.description : '', o.keywords]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [options, query])

  function openMenu() {
    let rect = rootRef.current?.getBoundingClientRect()
    if (rect) setDropUp(window.innerHeight - rect.bottom < 360 && rect.top > 360)
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => selectedValues.includes(o.value))))
    setOpen(true)
  }

  function close(focusTrigger = true) {
    setOpen(false)
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true })
  }

  function choose(o) {
    if (!o || o.disabled) return
    if (multiple) onChange(selectedValues.includes(o.value) ? selectedValues.filter((v) => v !== o.value) : [...selectedValues, o.value])
    else {
      onChange(o.value)
      close()
    }
  }

  function move(step) {
    if (!filtered.length) return
    let i = active
    for (let n = 0; n < filtered.length; n++) {
      i = (i + step + filtered.length) % filtered.length
      if (!filtered[i].disabled) break
    }
    setActive(i)
  }

  useEffect(() => {
    if (!open) return
    ;(withSearch ? searchRef : listRef).current?.focus({ preventScroll: true })
    let onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, withSearch])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onPanelKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Home' && !withSearch) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && !withSearch) {
      e.preventDefault()
      setActive(filtered.length - 1)
    } else if (e.key === 'Enter' || (e.key === ' ' && !withSearch)) {
      e.preventDefault()
      choose(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  function onTriggerKeyDown(e) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openMenu()
    } else if (e.key === 'Backspace' && multiple && selectedValues.length) {
      onChange(selectedValues.slice(0, -1))
    }
  }

  let triggerProps = {
    ref: triggerRef,
    id,
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    'aria-controls': open ? listId : undefined,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    onClick: () => (open ? close(false) : openMenu()),
    onKeyDown: onTriggerKeyDown,
  }

  let bare = variant === 'bare'
  let single = selectedOptions[0]

  return (
    <div ref={rootRef} className={clsx('relative', bare ? 'inline-flex' : 'block', className)}>
      {multiple ? (
        <div
          className={clsx(
            fieldClass,
            'relative flex min-h-9 flex-wrap items-center gap-1.5 py-1.5 pr-9 pl-2',
            invalid && 'outline-rose-400 dark:outline-rose-400/60',
            open && 'outline-2 -outline-offset-2 outline-emerald-500 dark:outline-emerald-400',
          )}
        >
          <button {...triggerProps} className={clsx('absolute inset-0 rounded-lg', focusClass)}>
            <span className="sr-only">
              {selectedOptions.length ? `${selectedOptions.map((o) => o.label).join(', ')} selected` : placeholder}
            </span>
          </button>
          {selectedOptions.length ? (
            <>
              {selectedOptions.slice(0, maxChips).map((o) => (
                <span
                  key={o.value}
                  className="pointer-events-none relative inline-flex items-center gap-1 rounded-md bg-emerald-50 py-0.5 pr-1 pl-2 text-xs/5 font-medium text-emerald-800 ring-1 ring-emerald-600/20 ring-inset dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                >
                  {o.label}
                  <button
                    type="button"
                    aria-label={`Remove ${o.label}`}
                    onClick={() => onChange(selectedValues.filter((v) => v !== o.value))}
                    className="pointer-events-auto flex size-4 items-center justify-center rounded-sm text-emerald-700/70 hover:bg-emerald-600/15 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:bg-emerald-400/20 dark:hover:text-emerald-200"
                  >
                    <XMarkIcon className="size-3" />
                  </button>
                </span>
              ))}
              {selectedOptions.length > maxChips && (
                <span className="pointer-events-none relative text-sm text-zinc-500 dark:text-zinc-400">+{selectedOptions.length - maxChips} more</span>
              )}
            </>
          ) : (
            <span className="pointer-events-none relative px-1 text-sm text-zinc-400 dark:text-zinc-500">{placeholder}</span>
          )}
          <ChevronUpDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-zinc-500" />
        </div>
      ) : (
        <button
          {...triggerProps}
          className={clsx(
            bare
              ? 'flex items-center gap-1.5 rounded-md py-0.5 pr-1 pl-1.5 text-sm/6 text-zinc-700 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5'
              : clsx(fieldClass, 'flex min-h-9 items-center gap-2.5 py-1.5 pr-2.5 pl-3', invalid && 'outline-rose-400 dark:outline-rose-400/60'),
            open && !bare && 'outline-2 -outline-offset-2 outline-emerald-500 dark:outline-emerald-400',
            focusClass,
          )}
        >
          {renderValue ? (
            renderValue(single)
          ) : single ? (
            <>
              {single.leading}
              <span className="truncate">{single.label}</span>
              {single.meta && <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{single.meta}</span>}
            </>
          ) : (
            <span className="truncate text-zinc-400 dark:text-zinc-500">{placeholder}</span>
          )}
          {bare ? (
            <ChevronDownIcon className="size-4 flex-none text-zinc-500" />
          ) : (
            <ChevronUpDownIcon className="ml-auto size-4 flex-none text-zinc-500" />
          )}
        </button>
      )}

      {open && (
        <div
          className={clsx(
            'absolute z-40 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/10',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            bare ? (align === 'right' ? 'right-0 w-72' : 'left-0 w-72') : 'inset-x-0 min-w-64',
            panelClassName,
          )}
          onKeyDown={onPanelKeyDown}
        >
          {withSearch && (
            <div className="relative border-b border-zinc-900/7.5 dark:border-white/10">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={filtered[active] ? optionId(active) : undefined}
                aria-autocomplete="list"
                aria-label={searchPlaceholder}
                autoComplete="off"
                spellCheck="false"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                className="block w-full bg-transparent py-2.5 pr-3 pl-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-multiselectable={multiple || undefined}
            aria-activedescendant={!withSearch && filtered[active] ? optionId(active) : undefined}
            className="max-h-72 overflow-auto p-1.5 focus:outline-none"
          >
            {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</li>}
            {filtered.map((o, i) => {
              let selected = selectedValues.includes(o.value)
              let showGroup = o.group && o.group !== filtered[i - 1]?.group
              return (
                <li key={o.value} role="presentation">
                  {showGroup && (
                    <div className={clsx('px-2.5 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400', i > 0 ? 'pt-3' : 'pt-1')}>{o.group}</div>
                  )}
                  <div
                    id={optionId(i)}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={o.disabled || undefined}
                    data-index={i}
                    onMouseMove={() => active !== i && setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o)}
                    className={clsx(
                      'flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm select-none',
                      i === active ? 'bg-zinc-100 dark:bg-white/7.5' : multiple && selected ? 'bg-zinc-50 dark:bg-white/2.5' : '',
                      o.disabled && 'opacity-50',
                    )}
                  >
                    {multiple && <CheckCircle checked={selected} />}
                    {o.leading}
                    <span className="min-w-0 flex-auto">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate font-medium text-zinc-900 dark:text-white">{o.label}</span>
                        {o.meta && <span className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{o.meta}</span>}
                      </span>
                      {o.description && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{o.description}</span>}
                    </span>
                    {o.trailing}
                    {!multiple && <CheckIcon className={clsx('size-4 flex-none text-emerald-600 dark:text-emerald-400', !selected && 'invisible')} />}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// Small coloured initials standing in for a brand logo
const MONO_COLORS = [
  'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20',
  'bg-amber-50 text-amber-800 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20',
  'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20',
  'bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20',
]
const MONO_TEXT = {
  IDEAL_VA: 'iD',
  MBWAY: 'MB',
  PAYPAL: 'PP',
  PAYU: 'PU',
  PAYSAFECARD: 'PS',
  CLEARPAY: 'CP',
  AFTERPAY_PACIFIC: 'AP',
  DIRECTDEBIT_SEPA: 'DD',
  MULTIBANCO_VA: 'MU',
  PRZELEWY: 'P24',
  BCMC_VA: 'BC',
  VISA: 'VI',
  MASTER: 'MC',
  AMEX: 'AX',
}

export function Monogram({ code, name, className }) {
  let text = MONO_TEXT[code] || name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2)
  let hash = [...code].reduce((h, c) => h + c.charCodeAt(0), 0)
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex size-6 flex-none items-center justify-center rounded-md font-mono text-[0.625rem] font-semibold tracking-tight ring-1 ring-inset',
        MONO_COLORS[hash % MONO_COLORS.length],
        className,
      )}
    >
      {text}
    </span>
  )
}

// Round flag from flagcdn; hides itself if the image can't load
export function Flag({ code, className }) {
  let [failed, setFailed] = useState(false)
  if (!code || failed) return <span aria-hidden="true" className={clsx('size-5 flex-none rounded-full bg-zinc-200 dark:bg-white/10', className)} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={clsx('size-5 flex-none rounded-full object-cover ring-1 ring-zinc-900/10 dark:ring-white/15', className)}
    />
  )
}
