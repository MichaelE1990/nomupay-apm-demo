'use client'

import { Switch } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { Flag, SelectMenu } from '@/components/select'
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

// Switches stacked in one bordered list, each row optionally opening its own settings
export function ToggleList({ children }) {
  return (
    <div className="divide-y divide-zinc-900/7.5 rounded-xl ring-1 ring-zinc-900/7.5 dark:divide-white/10 dark:ring-white/10">{children}</div>
  )
}

export function ToggleRow({ checked, onChange, label, description, children }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
          {description && <div className="text-xs/5 text-zinc-500 dark:text-zinc-400">{description}</div>}
        </div>
        <Switch
          checked={checked}
          onChange={onChange}
          aria-label={label}
          className="group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-900/5 outline-offset-2 outline-emerald-500 transition-colors duration-200 ease-in-out focus-visible:outline-2 data-checked:bg-emerald-500 dark:bg-white/10 dark:inset-ring-white/10 dark:data-checked:bg-emerald-500"
        >
          <span className="size-4 rounded-full bg-white shadow-xs ring-1 ring-zinc-900/5 transition-transform duration-200 ease-in-out group-data-checked:translate-x-4" />
        </Switch>
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
  AE: '971', AT: '43', AU: '61', BE: '32', BG: '359', BR: '55', CA: '1', CH: '41', CY: '357', CZ: '420', DE: '49', DK: '45',
  EE: '372', ES: '34', FI: '358', FR: '33', GB: '44', GE: '995', GI: '350', GR: '30', HR: '385', HU: '36', IE: '353', IS: '354',
  IT: '39', LI: '423', LT: '370', LU: '352', LV: '371', MT: '356', MX: '52', NL: '31', NO: '47', NZ: '64', PE: '51', PL: '48',
  PT: '351', RO: '40', SE: '46', SI: '386', SK: '421', US: '1', UY: '598',
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
      className={bare ? '-mx-1.5 w-[calc(100%+0.75rem)]' : undefined}
      panelClassName={bare ? 'w-full min-w-72' : undefined}
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
