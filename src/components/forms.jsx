'use client'

import { Switch } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { Flag, SelectMenu } from '@/components/select'
import { Tag } from '@/components/Tag'

// Tailwind UI form controls in the brand palette (zinc = navy neutrals, emerald = brand blue)

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

// Switches stacked in one bordered list, each row optionally opening its own settings
export function ToggleList({ children }) {
  return (
    <div className="divide-y divide-zinc-900/7.5 rounded-xl ring-1 ring-zinc-900/7.5 dark:divide-white/10 dark:ring-white/10">{children}</div>
  )
}

export function Toggle({ checked, onChange, disabled, label, title, id }) {
  return (
    <Switch
      id={id}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      title={title}
      className="group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-900/5 outline-offset-2 outline-emerald-500 transition-colors duration-200 ease-in-out focus-visible:outline-2 data-checked:bg-emerald-500 data-disabled:cursor-not-allowed data-disabled:opacity-60 dark:bg-white/10 dark:inset-ring-white/10 dark:data-checked:bg-emerald-500"
    >
      <span className="size-4 rounded-full bg-white shadow-xs ring-1 ring-zinc-900/5 transition-transform duration-200 ease-in-out group-data-checked:translate-x-4" />
    </Switch>
  )
}

// locked: on and can't be switched off (the brand requires it)
export function ToggleRow({ checked, onChange, label, description, children, locked }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
          {description && <div className="text-xs/5 text-zinc-500 dark:text-zinc-400">{description}</div>}
        </div>
        <Toggle checked={checked} onChange={onChange} disabled={locked} label={label} title={locked ? 'Required for this payment brand' : undefined} />
      </div>
      {checked && children && <div className="mt-3 pb-1">{children}</div>}
    </div>
  )
}

// Required marker in the label, as in the form designs: * for mandatory, (optional), (conditional)
export function ReqMark({ req }) {
  if (req === 'M')
    return (
      <span className="text-rose-500" title="Mandatory">
        *<span className="sr-only"> mandatory</span>
      </span>
    )
  if (req === 'C') return <span className="font-sans font-normal text-amber-600 dark:text-amber-400">(conditional)</span>
  return <span className="font-sans font-normal text-zinc-400 dark:text-zinc-500">(optional)</span>
}

// Input with its label inside the same box (Tailwind UI "inset label"): the
// parameter name sits on top and the value underneath, so fields stay short
export const bareInputClass =
  'block w-full min-w-0 bg-transparent p-0 py-0.5 text-sm/6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none read-only:text-zinc-500 dark:text-white dark:placeholder:text-zinc-500 dark:read-only:text-zinc-400'

export function InsetField({ htmlFor, name, req, note, invalid, hint, children, className }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div
        className={clsx(
          'rounded-lg bg-white px-3 pt-1.5 pb-1 outline-1 -outline-offset-1 outline-zinc-900/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-emerald-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-emerald-400',
          invalid && 'outline-rose-400 dark:outline-rose-400/60',
        )}
      >
        <label htmlFor={htmlFor} className="flex min-w-0 items-center gap-1.5 text-xs/5 font-medium text-zinc-900 dark:text-white">
          <span className="truncate font-mono text-[0.6875rem]">{name}</span>
          {req && <ReqMark req={req} />}
          {note && <span className="ml-auto truncate font-normal text-zinc-400 dark:text-zinc-500">{note}</span>}
        </label>
        {children}
      </div>
      {hint && <p className="mt-1.5 text-xs/5 text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  )
}

// Countries: names from the browser, flags from flagcdn
const REGION = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
export const countryName = (c) => {
  try {
    return REGION?.of(c) || c
  } catch {
    return c
  }
}

export const DIAL_CODES = {
  AD: '376', AE: '971', AT: '43', AU: '61', BE: '32', BG: '359', BR: '55', CA: '1', CH: '41', CN: '86', CY: '357', CZ: '420', DE: '49', DK: '45',
  EE: '372', ES: '34', FI: '358', FR: '33', GB: '44', GE: '995', GI: '350', GR: '30', HK: '852', HR: '385', HU: '36', ID: '62', IE: '353', IN: '91',
  IS: '354', IT: '39', JP: '81', KR: '82', LI: '423', LT: '370', LU: '352', LV: '371', MC: '377', MT: '356', MX: '52', MY: '60', NL: '31', NO: '47',
  NZ: '64', PE: '51', PH: '63', PL: '48', PT: '351', RO: '40', SE: '46', SG: '65', SI: '386', SK: '421', SM: '378', TH: '66', US: '1', UY: '598',
  VA: '379', VN: '84',
}

function countryOptions(codes, { dial } = {}) {
  return codes.map((c) => ({
    value: c,
    label: countryName(c),
    meta: dial ? `+${DIAL_CODES[c]}` : c,
    keywords: `${c} +${DIAL_CODES[c] || ''}`,
    leading: <Flag code={c} />,
  }))
}

export function CountrySelect({ id, countries, value, onChange, allowEmpty, invalid, bare, ...props }) {
  let options = countryOptions(countries)
  if (allowEmpty) options = [{ value: '', label: 'Not sent', meta: '', leading: <span aria-hidden="true" className="size-5 flex-none rounded-full ring-1 ring-zinc-900/10 ring-inset dark:ring-white/15" /> }, ...options]
  return (
    <SelectMenu
      id={id}
      options={options}
      value={value || (allowEmpty ? '' : undefined)}
      onChange={onChange}
      invalid={invalid}
      searchPlaceholder="Search countries"
      placeholder="Choose a country"
      variant={bare ? 'bare' : 'field'}
      fullWidth={bare}
      className={bare ? '-mx-1.5' : undefined}
      renderValue={
        bare
          ? (o) =>
              o ? (
                <span className="flex min-w-0 flex-auto items-center gap-2">
                  {o.leading}
                  <span className="truncate text-zinc-900 dark:text-white">{o.label}</span>
                  {o.value && <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{o.value}</span>}
                </span>
              ) : (
                <span className="flex-auto text-left text-zinc-400 dark:text-zinc-500">Choose a country</span>
              )
          : undefined
      }
      {...props}
    />
  )
}

// Phone number with a country dial-code menu in front, as in the phone input design.
// format "plus" gives +34700000000; "hash" gives 351#912345678 (MB WAY)
function splitPhone(value, format, fallback) {
  let v = String(value || '')
  if (format === 'hash' && v.includes('#')) {
    let [dial, number] = v.split('#')
    let country = Object.keys(DIAL_CODES).find((c) => DIAL_CODES[c] === dial) || fallback
    return { country, number }
  }
  let digits = v.replace(/^\+/, '')
  let match = Object.entries(DIAL_CODES)
    .filter(([, d]) => digits.startsWith(d))
    .sort((a, b) => b[1].length - a[1].length || (a[0] === fallback ? -1 : 0))[0]
  if (v && match) return { country: match[0], number: digits.slice(match[1].length) }
  return { country: fallback, number: v.replace(/^\+/, '') }
}

export function PhoneInput({ id, value, onChange, format = 'plus', defaultCountry = 'GB', countries, placeholder = 'Phone number', invalid }) {
  let parsed = splitPhone(value, format, defaultCountry)
  // The chosen country is kept even while the number is empty
  let [country, setCountry] = useState(parsed.country)
  useEffect(() => {
    if (value && parsed.country !== country) setCountry(parsed.country)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  let number = parsed.number
  let list = [...new Set([...(countries || []), ...Object.keys(DIAL_CODES).sort((a, b) => countryName(a).localeCompare(countryName(b)))])].filter(
    (c) => DIAL_CODES[c],
  )
  let join = (c, n) => {
    let digits = String(n || '').replace(/[^\d]/g, '')
    if (!digits) return ''
    return format === 'hash' ? `${DIAL_CODES[c]}#${digits}` : `+${DIAL_CODES[c]}${digits}`
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <SelectMenu
        variant="bare"
        aria-label="Country code"
        options={countryOptions(list, { dial: true })}
        value={country}
        onChange={(c) => {
          setCountry(c)
          onChange(join(c, number))
        }}
        searchPlaceholder="Search countries"
        className="-ml-1.5"
        renderValue={(o) => (
          <span className="flex items-center gap-1.5">
            <Flag code={o?.value} className="size-4" />
            <span className="font-medium text-zinc-900 dark:text-white">{o?.value}</span>
          </span>
        )}
      />
      <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{format === 'hash' ? `${DIAL_CODES[country]}#` : `+${DIAL_CODES[country]}`}</span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder={placeholder}
        value={number}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(join(country, e.target.value))}
        className={bareInputClass}
      />
    </div>
  )
}

// Amount with the currency menu inside the same field
export function AmountInput({ id, amount, onAmount, currency, onCurrency, currencies, readOnly }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        readOnly={readOnly}
        onChange={(e) => onAmount(e.target.value)}
        className={bareInputClass}
      />
      <SelectMenu
        variant="bare"
        align="right"
        aria-label="currency"
        options={currencies.map((c) => ({ value: c, label: c }))}
        value={currency}
        onChange={onCurrency}
        searchPlaceholder="Search currencies"
        className="-mr-1.5"
        panelClassName="w-40"
        renderValue={(o) => <span className="font-mono text-sm font-medium text-zinc-900 dark:text-white">{o?.value || currency}</span>}
      />
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

// Requirement as plain text on the right of a parameter row, as in API references
const REQ_TEXT = {
  M: ['Required', 'text-rose-700/75 dark:text-rose-300/70'],
  C: ['Conditional', 'text-amber-700/75 dark:text-amber-300/70'],
  O: ['Optional', 'text-zinc-400 dark:text-zinc-500'],
  T: ['Test only', 'text-zinc-400 dark:text-zinc-500'],
  A: ['Always', 'text-zinc-500 dark:text-zinc-400'],
}

export function ReqText({ req }) {
  let [text, color] = REQ_TEXT[req] || REQ_TEXT.O
  return <span className={clsx('text-xs font-medium', color)}>{text}</span>
}

const statusStyles = {
  success: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-300 dark:ring-green-400/20',
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

// Segmented tabs (a grey track with the chosen option raised), as in the settings design.
// options: [{ value, label, icon?, disabled?, title? }]
export function SegmentedControl({ options, value, onChange, label, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex rounded-xl bg-zinc-100 p-1 dark:bg-white/5', className)}>
      {options.map((o) => {
        let on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            title={o.title}
            onClick={() => !on && onChange(o.value)}
            className={clsx(
              'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition',
              on
                ? 'bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-700 dark:text-white dark:ring-white/10'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
              o.disabled && 'cursor-not-allowed opacity-40 hover:text-zinc-500',
            )}
          >
            {o.icon}
            <span className="min-w-0 text-center leading-5">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Status inside a dark code panel: a soft pill with an icon (the panel keeps the original emerald)
const panelTone = {
  success: 'bg-emerald-400/10 text-emerald-300/85 ring-emerald-400/20',
  pending: 'bg-amber-400/10 text-amber-200/80 ring-amber-400/20',
  failed: 'bg-rose-400/10 text-rose-300/85 ring-rose-400/20',
  neutral: 'bg-white/5 text-zinc-400 ring-white/10',
}

export function StatusIcon({ status, className }) {
  if (status === 'success')
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
        <path d="m5.75 8.25 1.5 1.5 3-3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (status === 'failed')
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
        <path d="m6 6 4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    )
  if (status === 'pending')
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
        <path
          d="M8 1.75v2.5M8 11.75v2.5M1.75 8h2.5M11.75 8h2.5M3.6 3.6l1.75 1.75M10.65 10.65l1.75 1.75M3.6 12.4l1.75-1.75"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    )
  return (
    <svg viewBox="0 0 6 6" aria-hidden="true" className="size-1.5 fill-current">
      <circle r={3} cx={3} cy={3} />
    </svg>
  )
}

export function PanelStatus({ status = 'neutral', children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        panelTone[status] || panelTone.neutral,
      )}
    >
      <StatusIcon status={status} className="size-3.5" />
      {children || statusLabel[status]}
    </span>
  )
}

// A bordered box for a control that has its label elsewhere (in a parameter row)
export function FieldBox({ invalid, children, className }) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-white px-3 py-1 outline-1 -outline-offset-1 outline-zinc-900/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-emerald-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-emerald-400',
        invalid && 'outline-rose-400 dark:outline-rose-400/60',
        className,
      )}
    >
      {children}
    </div>
  )
}
