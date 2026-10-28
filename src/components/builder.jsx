'use client'

import clsx from 'clsx'

import { Property, Properties } from '@/components/content'
import { Label, ReqTag, Select, StatusBadge, TextInput, Toggle } from '@/components/forms'
import { Tag } from '@/components/Tag'
import { describeCode } from '@/lib/codes'
import { CUSTOMER_FIELDS, SAVE_DETAILS_PARAMS, brandFieldKeys, cartTotal } from '@/lib/request'

const COUNTRY = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
export const countryName = (c) => {
  try {
    return COUNTRY?.of(c) || c
  } catch {
    return c
  }
}

const GROUPS = [
  { key: 'Cards', title: 'Cards', note: 'Through the COPYandPAY widget' },
  { key: 'Europe', title: 'Europe', note: 'NomuPay Wallets' },
  { key: 'International', title: 'International', note: 'NomuPay Wallets' },
]

export function PaymentMethodPicker({ brands, selected, onChange, multiple, allowCards = true, currency }) {
  let toggle = (code) => {
    if (multiple) onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code])
    else onChange([code])
  }
  return (
    <div className="not-prose space-y-6">
      {GROUPS.filter((g) => allowCards || g.key !== 'Cards').map((group) => {
        let items = brands.filter((b) => b.region === group.key)
        if (!items.length) return null
        return (
          <div key={group.key}>
            <div className="flex items-baseline gap-2">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">{group.title}</h4>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{group.note}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((b) => {
                let on = selected.includes(b.code)
                let unsupported = currency && on && !b.currencies.includes(currency)
                return (
                  <button
                    key={b.code}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(b.code)}
                    className={clsx(
                      'group flex min-w-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition ring-inset',
                      on
                        ? 'bg-emerald-50/60 ring-emerald-500/60 dark:bg-emerald-500/5 dark:ring-emerald-400/40'
                        : 'ring-zinc-900/10 hover:bg-zinc-50 hover:ring-zinc-900/20 dark:ring-white/10 dark:hover:bg-white/2.5 dark:hover:ring-white/20',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'mt-1 flex size-4 flex-none items-center justify-center ring-1 ring-inset',
                        multiple ? 'rounded' : 'rounded-full',
                        on ? 'bg-emerald-500 ring-emerald-500' : 'bg-white ring-zinc-300 dark:bg-white/5 dark:ring-white/20',
                      )}
                    >
                      {on && (
                        <svg viewBox="0 0 14 14" className="size-3 stroke-white" fill="none">
                          <path d="M3 8l3 3 5-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{b.name}</span>
                        {b.status === 'Certification' && <Tag color="amber">In certification</Tag>}
                      </span>
                      <span className="block truncate font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                        {b.code} · {b.currencies.slice(0, 4).join(' ')}
                        {b.currencies.length > 4 ? ' …' : ''}
                      </span>
                      {unsupported && (
                        <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">Doesn&rsquo;t support {currency}</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function AmountFields({ form, setForm, currencies, cartDriven, idPrefix }) {
  return (
    <div className="not-prose grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <Label htmlFor={`${idPrefix}-amount`} hint={cartDriven ? 'Cart total' : null}>
          <code className="font-mono text-xs">amount</code>
        </Label>
        <TextInput
          id={`${idPrefix}-amount`}
          inputMode="decimal"
          value={cartDriven ? cartTotal(form.cart) : form.amount}
          readOnly={cartDriven}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className={cartDriven ? 'bg-zinc-50 dark:bg-white/2.5' : ''}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-currency`} hint={cartDriven ? ' ' : null}>
          <code className="font-mono text-xs">currency</code>
        </Label>
        <Select id={`${idPrefix}-currency`} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-mtid`} hint={cartDriven ? ' ' : null}>
          <code className="font-mono text-xs">merchantTransactionId</code>
        </Label>
        <TextInput
          id={`${idPrefix}-mtid`}
          placeholder="Generated if empty"
          value={form.merchantTransactionId}
          onChange={(e) => setForm({ ...form, merchantTransactionId: e.target.value })}
        />
      </div>
    </div>
  )
}

function fieldSpec(key, brands) {
  for (let b of brands) {
    if (key === 'billing.country' && b.countryRequirement === 'M') return { req: 'M', label: 'Billing country', hint: 'Mandatory for ' + b.name, countries: b.countries }
    let f = b.fields.find((x) => x.key === key)
    if (f) return f
  }
  return { req: 'O', label: key }
}

export function RequiredFields({ form, setForm, catalogue, idPrefix }) {
  let selected = form.brands.map((c) => catalogue.find((b) => b.code === c)).filter(Boolean)
  let keys = brandFieldKeys(form.brands).filter((k) => !(form.extras.customer && CUSTOMER_FIELDS.some((f) => f.key === k)))
  if (!keys.length) return <p className="text-sm text-zinc-500 dark:text-zinc-400">The methods you chose don&rsquo;t need any extra fields.</p>
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  return (
    <Properties>
      {keys.map((key) => {
        let spec = fieldSpec(key, selected)
        let usedBy = selected.filter((b) => b.fields.some((f) => f.key === key) || (key === 'billing.country' && b.countryRequirement === 'M')).map((b) => b.name)
        let id = `${idPrefix}-${key.replace(/[^\w]/g, '_')}`
        let missing = spec.req === 'M' && !String(form.fields[key] || '').trim()
        return (
          <Property
            key={key}
            name={key}
            type="string"
            badge={<ReqTag req={spec.req} />}
            control={
              spec.countries ? (
                <Select id={id} aria-label={key} value={form.fields[key] || ''} onChange={(e) => setField(key, e.target.value)}>
                  {spec.countries.map((c) => (
                    <option key={c} value={c}>
                      {c} · {countryName(c)}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput id={id} aria-label={key} invalid={missing} value={form.fields[key] || ''} onChange={(e) => setField(key, e.target.value)} />
              )
            }
          >
            {spec.label}
            {usedBy.length ? ` · ${usedBy.join(', ')}` : ''}
            {spec.hint ? `. ${spec.hint}` : ''}
          </Property>
        )
      })}
    </Properties>
  )
}

export function Extras({ form, setForm, allowSave, saveHint, idPrefix }) {
  let setExtras = (patch) => setForm({ ...form, extras: { ...form.extras, ...patch } })
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let setCart = (cart) => setForm({ ...form, cart })
  return (
    <div className="not-prose space-y-3">
      <Toggle
        label="Customer & billing details"
        description={
          <>
            Adds <code className="font-mono text-xs">customer.*</code>, <code className="font-mono text-xs">billing.*</code> and{' '}
            <code className="font-mono text-xs">shipping.*</code>. Empty fields aren&rsquo;t sent.
          </>
        }
        checked={form.extras.customer}
        onChange={(v) => {
          // Fill empty fields with test data so the first request already has something to send
          let fields = { ...form.fields }
          if (v) for (let f of CUSTOMER_FIELDS) if (!fields[f.key] && f.sample) fields[f.key] = f.sample
          setForm({ ...form, fields, extras: { ...form.extras, customer: v } })
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CUSTOMER_FIELDS.map((f) => {
            let id = `${idPrefix}-x-${f.key.replace(/[^\w]/g, '_')}`
            return (
              <div key={f.key}>
                <Label htmlFor={id}>
                  <span className="font-mono text-xs">{f.key}</span>
                </Label>
                <TextInput id={id} placeholder={f.label} value={form.fields[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} />
              </div>
            )
          })}
        </div>
      </Toggle>

      <Toggle
        label="Cart items"
        description={
          <>
            Adds <code className="font-mono text-xs">cart.items[n].*</code>. The amount becomes the cart total.
          </>
        }
        checked={form.extras.cart}
        onChange={(v) => setExtras({ cart: v })}
      >
        <div className="space-y-2">
          {form.cart.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_4.5rem_6rem_auto] items-center gap-2">
              <TextInput aria-label={`Item ${i + 1} name`} placeholder="Item name" value={item.name} onChange={(e) => setCart(form.cart.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <TextInput aria-label={`Item ${i + 1} quantity`} inputMode="numeric" value={item.quantity} onChange={(e) => setCart(form.cart.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
              <TextInput aria-label={`Item ${i + 1} price`} inputMode="decimal" value={item.price} onChange={(e) => setCart(form.cart.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <button
                type="button"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setCart(form.cart.filter((_, j) => j !== i))}
                className="flex size-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900/5 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setCart([...form.cart, { name: '', quantity: '1', price: '0.00' }])}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:ring-1 dark:ring-zinc-800 dark:ring-inset dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              Add item
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Total <span className="font-mono text-zinc-900 dark:text-white">{cartTotal(form.cart)} {form.currency}</span>
            </span>
          </div>
        </div>
      </Toggle>

      <Toggle
        label="Save payment details"
        disabled={!allowSave}
        description={
          <>
            Stores the shopper&rsquo;s details for later payments and returns a <code className="font-mono text-xs">registrationId</code>.{' '}
            {saveHint}
            <span className="mt-2 flex flex-wrap gap-1.5">
              {SAVE_DETAILS_PARAMS.map(([k, v]) => (
                <code
                  key={k}
                  className="rounded-md bg-zinc-50 px-1.5 py-0.5 font-mono text-[0.6875rem] text-zinc-700 ring-1 ring-zinc-900/10 ring-inset dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10"
                >
                  {k}={v}
                </code>
              ))}
            </span>
          </>
        }
        checked={allowSave && form.extras.saveDetails}
        onChange={(v) => setExtras({ saveDetails: v })}
      />
    </div>
  )
}

export function ResultSummary({ result, emptyText }) {
  if (!result) return <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
  let r = result.response || {}
  let rd = r.resultDetails || {}
  let code = r.result?.code
  let rows = [
    ['id', r.id],
    ['paymentBrand', r.paymentBrand],
    ['amount', r.amount ? `${r.amount} ${r.currency || ''}` : null],
    ['registrationId', r.registrationId],
    ['resultDetails.ExtendedDescription', rd.ExtendedDescription],
    ['resultDetails.ConnectorReasonCode', rd.ConnectorReasonCode],
    ['resultDetails.ConnectorTxID3', rd.ConnectorTxID3],
    ['resultDetails.ConnectorErrorField', rd.ConnectorErrorField ? `${rd.ConnectorErrorField} ${rd.ConnectorErrorFieldDetails || ''}` : null],
  ].filter(([, v]) => v)
  return (
    <div className="not-prose rounded-2xl p-5 ring-1 ring-zinc-900/7.5 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={result.status} />
        <code className="font-mono text-sm text-zinc-900 dark:text-white">{code || '—'}</code>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{r.result?.description}</span>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{describeCode(code)}</p>
      {rows.length > 0 && (
        <dl className="mt-4 divide-y divide-zinc-900/5 border-t border-zinc-900/5 dark:divide-white/5 dark:border-white/5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <dt className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{k}</dt>
              <dd className="min-w-0 font-mono text-xs break-all text-zinc-900 dark:text-white">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function ErrorNote({ message }) {
  if (!message) return null
  return (
    <div className="not-prose mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">
      {message}
    </div>
  )
}
