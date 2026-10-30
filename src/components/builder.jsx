'use client'

import clsx from 'clsx'

import {
  AmountInput,
  CountrySelect,
  DIAL_CODES,
  InsetField,
  PhoneInput,
  StatusBadge,
  TextInput,
  ToggleList,
  ToggleRow,
  bareInputClass,
  countryName,
} from '@/components/forms'
import { Monogram, SelectMenu } from '@/components/select'
import { describeCode } from '@/lib/codes'
import { CUSTOMER_FIELDS, brandFieldKeys, cartTotal } from '@/lib/request'

function shortList(values, max = 3) {
  return values.length > max ? `${values.slice(0, max).join(' ')} +${values.length - max}` : values.join(' ')
}

// Payment brand picker: one searchable menu instead of a grid of cards.
// multiple adds chips in the field and checkboxes in the menu (COPYandPAY).
export function BrandSelect({ id, brands, selected, onChange, multiple = false, currency }) {
  let withCards = brands.some((b) => b.type === 'card')
  let options = [...brands.filter((b) => b.type !== 'card'), ...brands.filter((b) => b.type === 'card')].map((b) => {
    let unsupported = multiple && currency && selected.includes(b.code) && !b.currencies.includes(currency)
    return {
      value: b.code,
      label: b.name,
      meta: b.code,
      group: withCards ? (b.type === 'card' ? 'Cards' : 'Payment brands') : undefined,
      keywords: [...b.countries, ...b.currencies, ...b.countries.map(countryName)].join(' '),
      leading: <Monogram code={b.code} name={b.name} />,
      trailing: <span className="hidden flex-none font-mono text-[0.6875rem] text-zinc-400 sm:inline dark:text-zinc-500">{shortList(b.currencies)}</span>,
      description: unsupported ? <span className="text-amber-700 dark:text-amber-400">Doesn&rsquo;t support {currency}</span> : undefined,
    }
  })
  let chosen = selected.map((c) => brands.find((b) => b.code === c)).filter(Boolean)
  let notForCurrency = multiple && currency ? chosen.filter((b) => !b.currencies.includes(currency)) : []
  let one = !multiple ? chosen[0] : null

  return (
    <div className="not-prose">
      <SelectMenu
        id={id}
        options={options}
        value={multiple ? selected : selected[0]}
        onChange={multiple ? onChange : (code) => onChange([code])}
        multiple={multiple}
        searchable
        searchPlaceholder="Search by name, code, country or currency"
        placeholder={multiple ? 'Add payment brands' : 'Choose a payment brand'}
        invalid={!selected.length}
      />
      {one && (
        <p className="mt-2 text-xs/5 text-zinc-500 dark:text-zinc-400">
          <span className="font-mono">{shortList(one.countries, 6)}</span>
          <span className="mx-1.5">·</span>
          <span className="font-mono">{shortList(one.currencies, 6)}</span>
          {one.timeout && (
            <>
              <span className="mx-1.5">·</span>Times out after {one.timeout}
            </>
          )}
          {one.note && <span className="mt-1 block">{one.note}</span>}
        </p>
      )}
      {notForCurrency.length > 0 && (
        <p className="mt-2 text-xs/5 text-amber-700 dark:text-amber-400">
          {notForCurrency.map((b) => b.name).join(', ')} {notForCurrency.length === 1 ? 'doesn’t' : 'don’t'} support {currency}, so{' '}
          {notForCurrency.length === 1 ? 'it' : 'they'} won&rsquo;t show in the widget.
        </p>
      )}
    </div>
  )
}

export function AmountFields({ form, setForm, currencies, cartDriven, idPrefix }) {
  return (
    <div className="not-prose @container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <InsetField htmlFor={`${idPrefix}-amount`} name="amount" req="M" note={cartDriven ? 'Cart total' : null}>
          <AmountInput
            id={`${idPrefix}-amount`}
            amount={cartDriven ? cartTotal(form.cart) : form.amount}
            readOnly={cartDriven}
            onAmount={(amount) => setForm({ ...form, amount })}
            currency={form.currency}
            onCurrency={(currency) => setForm({ ...form, currency })}
            currencies={currencies}
          />
        </InsetField>
        <InsetField htmlFor={`${idPrefix}-mtid`} name="merchantTransactionId" req="O">
          <input
            id={`${idPrefix}-mtid`}
            type="text"
            autoComplete="off"
            spellCheck="false"
            placeholder="Generated if empty"
            value={form.merchantTransactionId}
            onChange={(e) => setForm({ ...form, merchantTransactionId: e.target.value })}
            className={bareInputClass}
          />
        </InsetField>
      </div>
    </div>
  )
}

function fieldSpec(key, brands) {
  for (let b of brands) {
    if (key === 'billing.country' && b.countryRequirement === 'M') return { req: 'M', label: 'Billing country', countries: b.countries }
    let f = b.fields.find((x) => x.key === key)
    if (f) return f
  }
  return { req: 'O', label: key }
}

// One control per parameter, chosen by its type
function FieldControl({ id, spec, value, onChange, invalid, defaultCountry, countries }) {
  if (spec.countries)
    return <CountrySelect id={id} bare countries={spec.countries} value={value} onChange={onChange} invalid={invalid} />
  if (spec.type === 'phone')
    return <PhoneInput id={id} value={value} onChange={onChange} format={spec.format || 'plus'} defaultCountry={defaultCountry} countries={countries} invalid={invalid} />
  return (
    <input
      id={id}
      type={spec.type === 'email' ? 'email' : 'text'}
      autoComplete="off"
      spellCheck="false"
      placeholder={spec.label}
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={bareInputClass}
    />
  )
}

export function RequiredFields({ form, setForm, catalogue, idPrefix }) {
  let selected = form.brands.map((c) => catalogue.find((b) => b.code === c)).filter(Boolean)
  let keys = brandFieldKeys(form.brands).filter((k) => !(form.extras.customer && CUSTOMER_FIELDS.some((f) => f.key === k)))
  if (!keys.length) return <p className="text-sm text-zinc-500 dark:text-zinc-400">The payment brands you chose don&rsquo;t need any extra fields.</p>
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let countries = [...new Set(selected.flatMap((b) => b.countries))]
  return (
    <div className="not-prose @container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        {keys.map((key) => {
          let spec = fieldSpec(key, selected)
          let usedBy = selected
            .filter((b) => b.fields.some((f) => f.key === key) || (key === 'billing.country' && b.countryRequirement === 'M'))
            .map((b) => b.name)
          let id = `${idPrefix}-${key.replace(/[^\w]/g, '_')}`
          let value = form.fields[key] || ''
          let missing = spec.req === 'M' && !String(value).trim()
          let hint = [selected.length > 1 && usedBy.length ? `For ${usedBy.join(', ')}` : '', spec.hint].filter(Boolean).join('. ')
          return (
            <InsetField key={key} htmlFor={id} name={key} req={spec.req} invalid={missing} hint={hint}>
              <FieldControl
                id={id}
                spec={spec}
                value={value}
                onChange={(v) => setField(key, v)}
                invalid={missing}
                defaultCountry={countries[0] || 'GB'}
                countries={countries}
              />
            </InsetField>
          )
        })}
      </div>
    </div>
  )
}

const ALL_COUNTRIES = Object.keys(DIAL_CODES).sort((a, b) => countryName(a).localeCompare(countryName(b)))

export function Extras({ form, setForm, idPrefix }) {
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let setCart = (cart) => setForm({ ...form, cart })
  return (
    <div className="not-prose">
      <ToggleList>
        <ToggleRow
          label="Customer & billing details"
          description={
            <>
              Adds <code className="font-mono text-[0.6875rem]">customer.*</code>, <code className="font-mono text-[0.6875rem]">billing.*</code> and{' '}
              <code className="font-mono text-[0.6875rem]">shipping.*</code>. Empty fields aren&rsquo;t sent.
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
          <div className="@container">
            <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
              {CUSTOMER_FIELDS.map((f) => {
                let id = `${idPrefix}-x-${f.key.replace(/[^\w]/g, '_')}`
                let value = form.fields[f.key] ?? ''
                return (
                  <InsetField key={f.key} htmlFor={id} name={f.key}>
                    {f.key.endsWith('.country') ? (
                      <CountrySelect id={id} bare allowEmpty countries={ALL_COUNTRIES} value={value} onChange={(v) => setField(f.key, v)} />
                    ) : f.key === 'customer.phone' ? (
                      <PhoneInput id={id} value={value} onChange={(v) => setField(f.key, v)} defaultCountry="GB" />
                    ) : (
                      <input
                        id={id}
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder={f.label}
                        value={value}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className={bareInputClass}
                      />
                    )}
                  </InsetField>
                )
              })}
            </div>
          </div>
        </ToggleRow>

        <ToggleRow
          label="Cart items"
          description={
            <>
              Adds <code className="font-mono text-[0.6875rem]">cart.items[n].*</code>. The amount becomes the cart total.
            </>
          }
          checked={form.extras.cart}
          onChange={(v) => setForm({ ...form, extras: { ...form.extras, cart: v } })}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_4rem_5.5rem_2rem] gap-2 px-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span />
            </div>
            {form.cart.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_5.5rem_2rem] items-center gap-2">
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
        </ToggleRow>
      </ToggleList>
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

export function ErrorNote({ message, className }) {
  if (!message) return null
  return (
    <div
      className={clsx(
        'not-prose mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20',
        className,
      )}
    >
      {message}
    </div>
  )
}
