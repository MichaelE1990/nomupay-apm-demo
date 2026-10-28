'use client'

import { Switch } from '@headlessui/react'
import { useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'

import { Select } from '@/components/forms'
import { Tag } from '@/components/Tag'
import { COUNTRIES, getCountry, methodsFor, requiredFields } from '@/lib/playground'

export function SmallSwitch({ checked, onChange, label, disabled }) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      className="group relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-900/5 outline-offset-2 outline-emerald-500 transition-colors duration-200 ease-in-out focus-visible:outline-2 data-checked:bg-emerald-500 data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:bg-white/10 dark:inset-ring-white/10 dark:data-checked:bg-emerald-500"
    >
      <span className="size-4 rounded-full bg-white shadow-xs ring-1 ring-zinc-900/5 transition-transform duration-200 ease-in-out group-data-checked:translate-x-4" />
    </Switch>
  )
}

function Row({ label, warning, tag, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-700 dark:text-zinc-300">
          {label}
          {tag}
        </div>
        {warning && <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{warning}</p>}
      </div>
      <div className="pt-0.5">
        <SmallSwitch checked={checked} onChange={onChange} label={typeof label === 'string' ? label : undefined} disabled={disabled} />
      </div>
    </div>
  )
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={clsx('size-4 flex-none text-zinc-400 transition-transform duration-200', open && 'rotate-180')}>
      <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

// A collapsible group: the header always says what's switched on inside it.
// One group is open at a time so the column stays short.
function Group({ id, title, summary, count, openId, setOpenId, children }) {
  let open = openId === id
  let panelId = `pg-group-${id}`
  return (
    <section className="py-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenId(open ? null : id)}
        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-white/2.5"
      >
        <span className="min-w-0 flex-auto">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{title}</span>
          {!open && <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">{summary}</span>}
        </span>
        <span
          className={clsx(
            'flex-none rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap tabular-nums ring-1 ring-inset',
            count > 0
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20'
              : 'bg-zinc-50 text-zinc-500 ring-zinc-500/10 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10',
          )}
        >
          {count} on
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <div id={panelId} className="pt-1 pb-2">
          {children}
        </div>
      )}
    </section>
  )
}

export function CountrySelect({ value, onChange, id, className }) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label="Shopper country">
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.name} · {c.currency}
        </option>
      ))}
    </Select>
  )
}

export function SettingsPanel({ config, setConfig, onCountry }) {
  let { local, other, cards } = methodsFor(config.country)
  let country = getCountry(config.country)
  let need = requiredFields(config.methods)
  let set = (patch) => setConfig({ ...config, ...patch })
  let has = (code) => config.methods.includes(code)
  let toggle = (codes, on) => set({ methods: on ? [...new Set([...config.methods, ...codes])] : config.methods.filter((c) => !codes.includes(c)) })
  let cardCodes = cards.map((b) => b.code)
  let forcedCustomer = Object.keys(need).filter((k) => k.startsWith('customer.'))
  let forcedBy = (keys) => [...new Set(keys.flatMap((k) => need[k] || []))].join(', ')
  let fieldNames = { 'customer.givenName': 'name', 'customer.email': 'email', 'customer.merchantCustomerId': 'customer ID' }
  let forcedFields = forcedCustomer.map((k) => fieldNames[k] || k)
  let forcedLabel = forcedFields.length > 1 ? `${forcedFields.slice(0, -1).join(', ')} and ${forcedFields.at(-1)}` : forcedFields[0] || ''
  forcedLabel = forcedLabel.charAt(0).toUpperCase() + forcedLabel.slice(1)

  let methodsOn = [...(cardCodes.some(has) ? ['Cards'] : []), ...[...local, ...other].filter((b) => has(b.code)).map((b) => b.name)]
  let customerOn = [config.contact && 'Name and email', config.billing && 'Billing address', config.shipping && 'Shipping address'].filter(Boolean)
  let setupOn = [config.lineItems && 'Line items', config.save && 'Save payment details'].filter(Boolean)
  let listed = (items) => (items.length ? items.join(', ') : 'None')
  let [openId, setOpenId] = useState('methods')
  let groupProps = (id) => ({ id, openId, setOpenId })

  let methodRow = (b) => (
    <Row
      key={b.code}
      label={b.name}
      tag={b.status === 'Certification' ? <Tag color="amber">In certification</Tag> : null}
      checked={has(b.code)}
      onChange={(on) => toggle([b.code], on)}
    />
  )

  return (
    <div>
      <label htmlFor="pg-country" className="block text-sm font-semibold text-zinc-900 dark:text-white">
        Shopper country
      </label>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Sets the currency and the methods on offer.</p>
      <CountrySelect id="pg-country" value={config.country} onChange={onCountry} className="mt-2" />

      <div className="mt-5 divide-y divide-zinc-900/5 border-t border-zinc-900/5 dark:divide-white/5 dark:border-white/5">
        <Group {...groupProps('methods')} title="Payment methods" summary={listed(methodsOn)} count={methodsOn.length}>
          {cards.length > 0 && <Row label="Cards" checked={cardCodes.some(has)} onChange={(on) => toggle(cardCodes, on)} />}
          {local.map(methodRow)}
          {other.length > 0 && (
            <>
              <p className="mt-2 mb-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">More in {country.name}</p>
              {other.map(methodRow)}
            </>
          )}
        </Group>

        <Group {...groupProps('customer')} title="Customer details" summary={listed(customerOn)} count={customerOn.length}>
          <Row
            label="Name and email"
            warning={!config.contact && forcedCustomer.length ? `${forcedLabel} still sent for ${forcedBy(forcedCustomer)}` : null}
            checked={config.contact}
            onChange={(v) => set({ contact: v })}
          />
          <Row
            label="Billing address"
            warning={!config.billing && need['billing.country'] ? `Country still sent for ${forcedBy(['billing.country'])}` : null}
            checked={config.billing}
            onChange={(v) => set({ billing: v })}
          />
          <Row label="Shipping address" checked={config.shipping} onChange={(v) => set({ shipping: v })} />
        </Group>

        <Group {...groupProps('setup')} title="Payment setup" summary={listed(setupOn)} count={setupOn.length}>
          <Row label="Line items" checked={config.lineItems} onChange={(v) => set({ lineItems: v })} />
          <Row label="Save payment details" checked={config.save} onChange={(v) => set({ save: v })} />
        </Group>

        <Group {...groupProps('advanced')} title="Advanced options" summary={config.integrity ? 'Integrity check' : 'None'} count={config.integrity ? 1 : 0}>
          <Row label="Integrity check" checked={config.integrity} onChange={(v) => set({ integrity: v })} />
        </Group>
      </div>

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Prefer it step by step? Try the{' '}
        <Link href="/copyandpay" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          COPYandPAY
        </Link>{' '}
        or{' '}
        <Link href="/server-to-server" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
          server-to-server
        </Link>{' '}
        guide.
      </p>
    </div>
  )
}
