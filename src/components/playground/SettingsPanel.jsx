'use client'

import { Switch } from '@headlessui/react'
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

function Row({ label, hint, tag, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-sm text-zinc-700 dark:text-zinc-300">
          {label}
          {tag}
        </div>
        {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </div>
      <div className="pt-0.5">
        <SmallSwitch checked={checked} onChange={onChange} label={typeof label === 'string' ? label : undefined} disabled={disabled} />
      </div>
    </div>
  )
}

function Section({ title, children, note }) {
  return (
    <section className="py-4 first:pt-0">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
      {note && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</p>}
      <div className="mt-1">{children}</div>
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
    <div className="divide-y divide-zinc-900/5 dark:divide-white/5">
      <Section title="Shopper" note="Sets the currency and which payment methods are offered.">
        <div className="mt-2">
          <CountrySelect id="pg-country" value={config.country} onChange={onCountry} />
        </div>
      </Section>

      <Section title="Payment methods" note={`Sent as data-brands to the widget. Shown for ${country.name} in ${country.currency}.`}>
        {cards.length > 0 && (
          <Row
            label="Cards"
            hint={cards.map((b) => b.name).join(', ')}
            checked={cardCodes.some(has)}
            onChange={(on) => toggle(cardCodes, on)}
          />
        )}
        {local.map(methodRow)}
        {other.length > 0 && (
          <>
            <p className="mt-3 mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Also available</p>
            {other.map(methodRow)}
          </>
        )}
      </Section>

      <Section title="Customer details" note="Collected on your page and sent with the checkout.">
        <Row
          label="Name and email"
          hint={!config.contact && forcedCustomer.length ? `Partly required by ${forcedBy(forcedCustomer)}` : 'customer.givenName, surname, email'}
          checked={config.contact}
          onChange={(v) => set({ contact: v })}
        />
        <Row
          label="Billing address"
          hint={!config.billing && need['billing.country'] ? `billing.country is sent anyway: ${forcedBy(['billing.country'])}` : 'billing.street1, city, postcode, country'}
          checked={config.billing}
          onChange={(v) => set({ billing: v })}
        />
        <Row label="Shipping address" hint="shipping.street1, city, postcode, country" checked={config.shipping} onChange={(v) => set({ shipping: v })} />
      </Section>

      <Section title="Order">
        <Row label="Line items" hint="cart.items[n].name, quantity, price" checked={config.lineItems} onChange={(v) => set({ lineItems: v })} />
      </Section>

      <Section title="Payment setup">
        <Row
          label="Save payment details"
          hint="createRegistration with a CIT standing instruction. Charge it again from the confirmation page."
          checked={config.save}
          onChange={(v) => set({ save: v })}
        />
      </Section>

      <Section title="Advanced options">
        <Row label="Integrity check" hint="integrity=true, then the script tag carries the returned hash" checked={config.integrity} onChange={(v) => set({ integrity: v })} />
      </Section>

      <div className="pt-4">
        <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-white/2.5">
          <p className="text-zinc-600 dark:text-zinc-400">Want it step by step?</p>
          <div className="mt-1 flex flex-col gap-1">
            <Link href="/copyandpay" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
              COPYandPAY guide
            </Link>
            <Link href="/server-to-server" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
              Server-to-server guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

