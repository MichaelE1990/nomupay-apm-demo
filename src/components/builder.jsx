'use client'

import clsx from 'clsx'

import { Property } from '@/components/content'
import {
  AmountInput,
  CountrySelect,
  DIAL_CODES,
  FieldBox,
  InsetField,
  ReqTag,
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
import { CUSTOMER_FIELDS, cartSpec, cartTotal, fieldSpecs } from '@/lib/request'

function shortList(values, max = 3) {
  return values.length > max ? `${values.slice(0, max).join(' ')} +${values.length - max}` : values.join(' ')
}

// Payment brand picker: one searchable menu instead of a grid of cards.
// multiple adds chips in the field and checkboxes in the menu (COPYandPAY).
export function BrandSelect({ id, brands, selected, onChange, multiple = false, currency, showDetails = true }) {
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
  let one = !multiple && showDetails ? chosen[0] : null

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

// One control per parameter, chosen by its type
export function FieldControl({ id, spec, value, onChange, invalid, defaultCountry, countries }) {
  if (spec.type === 'country')
    return <CountrySelect id={id} bare countries={spec.options || []} value={value} onChange={onChange} invalid={invalid} />
  if (spec.type === 'select')
    return (
      <SelectMenu
        id={id}
        variant="bare"
        options={[...(spec.req === 'M' ? [] : [{ value: '', label: 'Not sent' }]), ...spec.options.map((o) => ({ value: o, label: o }))]}
        value={value || (spec.req === 'M' ? undefined : '')}
        onChange={onChange}
        searchable={spec.options.length > 8}
        searchPlaceholder={`Search ${spec.label.toLowerCase()}`}
        fullWidth
        className="-mx-1.5"
        renderValue={(o) => (
          <span className={clsx('flex-auto truncate text-left font-mono text-sm', o?.value ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500')}>
            {o?.label || 'Choose…'}
          </span>
        )}
      />
    )
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

export function RequiredFields({ form, setForm, catalogue, idPrefix, missing = [] }) {
  let selected = form.brands.map((c) => catalogue.find((b) => b.code === c)).filter(Boolean)
  let specs = fieldSpecs(form.brands, form.mode).filter((s) => !(form.extras.customer && CUSTOMER_FIELDS.some((f) => f.key === s.key)))
  if (!specs.length) return <p className="text-sm text-zinc-500 dark:text-zinc-400">The payment brands you chose don&rsquo;t take any extra fields.</p>
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let countries = [...new Set(selected.flatMap((b) => b.countries))]
  return (
    <div className="not-prose @container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        {specs.map((spec) => {
          let key = spec.key
          let id = `${idPrefix}-${key.replace(/[^\w]/g, '_')}`
          let value = form.fields[key] || ''
          let invalid = missing.includes(key)
          let hint = [selected.length > 1 && spec.usedBy?.length ? `For ${spec.usedBy.join(', ')}` : '', spec.hint].filter(Boolean).join('. ')
          return (
            <InsetField key={key} htmlFor={id} name={key} req={spec.req} invalid={invalid} hint={hint}>
              <FieldControl
                id={id}
                spec={spec}
                value={value}
                onChange={(v) => setField(key, v)}
                invalid={invalid}
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

// Under a Send button: why it's switched off
export function MissingFieldsHint({ missing }) {
  if (!missing.length) return null
  return (
    <span className="text-xs text-zinc-400">
      Fill in the mandatory {missing.length === 1 ? 'field' : 'fields'} first: {missing.slice(0, 3).join(', ')}
      {missing.length > 3 ? ` and ${missing.length - 3} more` : ''}
    </span>
  )
}

const countryList = (codes, max = 5) => {
  let names = codes.map(countryName)
  return names.length > max ? `${names.slice(0, max).join(', ')} and ${names.length - max} more` : names.join(', ')
}

// What a brand supports, from the Help Centre list and the KB: shown above its request
export function BrandFacts({ brand }) {
  if (!brand) return null
  let refunds = brand.refunds.length ? brand.refunds.join(', ') : 'Not supported'
  let limits = [brand.limits.min && `Min ${brand.limits.min}`, brand.limits.max && `Max ${brand.limits.max}`].filter(Boolean).join(' · ') || 'Not listed'
  let rows = [
    ['Currencies', brand.currencies.join(', ')],
    ['Countries', countryList(brand.countries)],
    ['Timeout', brand.timeout ? `Pending payments expire after ${brand.timeout}` : '—'],
    ['Amount', limits],
    ['Refunds', refunds],
  ]
  return (
    <div className="not-prose my-6">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-zinc-900/7.5 ring-1 ring-zinc-900/7.5 sm:grid-cols-2 dark:bg-white/10 dark:ring-white/10">
        {rows.map(([k, v], i) => (
          <div key={k} className={clsx('bg-white px-4 py-3 dark:bg-zinc-900', i === rows.length - 1 && rows.length % 2 === 1 && 'sm:col-span-2')}>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-white">{v}</dd>
          </div>
        ))}
      </dl>
      {brand.note && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{brand.note}</p>}
    </div>
  )
}

// A request parameter as a reference row: name, type, requirement, what it is, and its value
export function ParamRow({ name, type = 'string', req, children, control }) {
  return (
    <Property name={name} type={type} badge={req ? <ReqTag req={req} /> : null} control={control}>
      {children}
    </Property>
  )
}

// A fixed value in a parameter row (set by the demo, not typed in)
export function FixedValue({ children }) {
  return <span className="block truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{children}</span>
}

// The chosen brand's own fields as parameter rows with inputs
export function BrandFieldRows({ form, setForm, catalogue, idPrefix, missing = [] }) {
  let selected = form.brands.map((c) => catalogue.find((b) => b.code === c)).filter(Boolean)
  let specs = fieldSpecs(form.brands, form.mode).filter((s) => !(form.extras.customer && CUSTOMER_FIELDS.some((f) => f.key === s.key)))
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let countries = [...new Set(selected.flatMap((b) => b.countries))]
  return specs.map((spec) => {
    let id = `${idPrefix}-${spec.key.replace(/[^\w]/g, '_')}`
    let invalid = missing.includes(spec.key)
    return (
      <ParamRow
        key={spec.key}
        name={spec.key}
        type={spec.type === 'country' ? 'country code' : spec.type === 'phone' ? 'phone' : 'string'}
        req={spec.req}
        control={
          <FieldBox invalid={invalid}>
            <FieldControl
              id={id}
              spec={spec}
              value={form.fields[spec.key] || ''}
              onChange={(v) => setField(spec.key, v)}
              invalid={invalid}
              defaultCountry={countries[0] || 'GB'}
              countries={countries}
            />
          </FieldBox>
        }
      >
        {[spec.label, spec.hint].filter(Boolean).join('. ')}
      </ParamRow>
    )
  })
}

const ALL_COUNTRIES = Object.keys(DIAL_CODES).sort((a, b) => countryName(a).localeCompare(countryName(b)))

const cellInvalid = 'outline-rose-400 dark:outline-rose-400/60'

export function Extras({ form, setForm, idPrefix, missing = [] }) {
  let setField = (k, v) => setForm({ ...form, fields: { ...form.fields, [k]: v } })
  let setCart = (cart) => setForm({ ...form, cart })
  let cart = cartSpec(form.brands)
  let cartRequired = Boolean(cart?.required.length)
  let withItemId = Boolean(cart?.fields.includes('merchantItemId'))
  let cols = withItemId ? 'grid-cols-[1fr_6.5rem_3.5rem_5rem_2rem]' : 'grid-cols-[1fr_4rem_5.5rem_2rem]'
  let setItem = (i, patch) => setCart(form.cart.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  let bad = (i, k) => missing.includes(`cart.items[${i}].${k}`)
  return (
    <div className="not-prose">
      <ToggleList>
        <ToggleRow
          label="Customer & billing details"
          description="Adds the shopper’s name, email and phone, and the billing and shipping address. Empty fields aren’t sent."
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

        {cart && (
          <ToggleRow
            label="Cart items"
            locked={cartRequired}
            description={`${cartRequired ? `Mandatory for ${cart.required.join(', ')}. ` : ''}Adds the items in the order: ${cart.fields.join(', ')}. The amount becomes the cart total.`}
            checked={cartRequired || form.extras.cart}
            onChange={(v) => setForm({ ...form, extras: { ...form.extras, cart: v } })}
          >
            <div className="space-y-2">
              <div className={clsx('grid gap-2 px-0.5 text-xs text-zinc-500 dark:text-zinc-400', cols)}>
                <span>name</span>
                {withItemId && <span>merchantItemId</span>}
                <span>quantity</span>
                <span>price</span>
                <span />
              </div>
              {form.cart.map((item, i) => (
                <div key={i} className={clsx('grid items-center gap-2', cols)}>
                  <TextInput aria-label={`Item ${i + 1} name`} placeholder="Item name" value={item.name} className={bad(i, 'name') && cellInvalid} onChange={(e) => setItem(i, { name: e.target.value })} />
                  {withItemId && (
                    <TextInput
                      aria-label={`Item ${i + 1} merchantItemId`}
                      placeholder="item-001"
                      maxLength={32}
                      value={item.merchantItemId || ''}
                      className={bad(i, 'merchantItemId') && cellInvalid}
                      onChange={(e) => setItem(i, { merchantItemId: e.target.value })}
                    />
                  )}
                  <TextInput aria-label={`Item ${i + 1} quantity`} inputMode="numeric" value={item.quantity} className={bad(i, 'quantity') && cellInvalid} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  <TextInput aria-label={`Item ${i + 1} price`} inputMode="decimal" value={item.price} className={bad(i, 'price') && cellInvalid} onChange={(e) => setItem(i, { price: e.target.value })} />
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
              {missing.includes('cart.items') && <p className="text-xs text-rose-600 dark:text-rose-400">Add at least one item.</p>}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCart([...form.cart, { name: '', quantity: '1', price: '0.00', merchantItemId: `item-${String(form.cart.length + 1).padStart(3, '0')}` }])}
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
        )}
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
