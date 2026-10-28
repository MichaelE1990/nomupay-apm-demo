'use client'

import clsx from 'clsx'

import { PaymentWidget } from '@/components/playground/PaymentWidget'
import { getBrand } from '@/lib/brands'
import { describeCode } from '@/lib/codes'
import { cartFor, formatMoney, getCountry, orderedMethods, requiredFields } from '@/lib/playground'
import { cartTotal } from '@/lib/request'

// The merchant's checkout page. Always light, like a real shop page would be.

const input =
  'block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-600'

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-zinc-700">
        {label}
        {hint && <span className="text-xs font-normal text-amber-700">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Thumb({ tone }) {
  return (
    <div className={clsx('relative size-12 flex-none overflow-hidden rounded-lg bg-linear-to-br ring-1 ring-zinc-900/5', tone)}>
      <div className="absolute inset-x-2.5 top-3 bottom-2 rounded-sm bg-white/30" />
    </div>
  )
}

function Summary({ config, setConfig, currency, editable }) {
  let cart = cartFor({ ...config, quantities: config.quantities })
  let total = cartTotal(cart)
  return (
    <div>
      <p className="text-sm font-medium text-zinc-500">Pay Halden Coffee</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-zinc-900">{formatMoney(total, currency)}</p>
      <ul role="list" className="mt-8 divide-y divide-zinc-900/5">
        {cart.map((p) => (
          <li key={p.id} className="flex items-start gap-4 py-4 first:pt-0">
            <Thumb tone={p.tone} />
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-medium text-zinc-900">{p.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs whitespace-nowrap text-zinc-500">
                <span className="mr-1">{p.detail}</span>
                {editable ? (
                  <label className="inline-flex items-center gap-1">
                    Qty
                    <select
                      value={p.quantity}
                      onChange={(e) => setConfig({ ...config, quantities: { ...config.quantities, [p.id]: Number(e.target.value) } })}
                      className="rounded border-0 bg-zinc-100 py-0 pr-5 pl-1.5 text-xs text-zinc-700 outline-none focus:ring-2 focus:ring-emerald-600"
                      aria-label={`Quantity of ${p.name}`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <span>Qty {p.quantity}</span>
                )}
              </div>
            </div>
            <p className="text-sm font-medium whitespace-nowrap text-zinc-900 tabular-nums">{formatMoney((Number(p.price) * p.quantity).toFixed(2), currency)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-3 border-t border-zinc-900/5 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-600">Subtotal</dt>
          <dd className="text-zinc-900 tabular-nums">{formatMoney(total, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-600">Shipping</dt>
          <dd className="text-zinc-900">Free</dd>
        </div>
        <div className="flex justify-between border-t border-zinc-900/5 pt-3 font-medium">
          <dt className="text-zinc-900">Total due today</dt>
          <dd className="text-zinc-900 tabular-nums">{formatMoney(total, currency)}</dd>
        </div>
      </dl>
    </div>
  )
}

function CustomerForm({ config, setConfig }) {
  let need = requiredFields(orderedMethods(config))
  let country = getCountry(config.country)
  let c = config.customer
  let setC = (patch) => setConfig({ ...config, customer: { ...c, ...patch } })
  let showContact = config.contact || need['customer.email'] || need['customer.givenName']
  let showAddress = config.billing || config.shipping
  let reqHint = (key) => (!config.contact && need[key] ? `Required by ${need[key].join(', ')}` : null)
  if (!showContact && !showAddress) return null
  return (
    <div className="space-y-6">
      {showContact && (
        <fieldset>
          <legend className="text-base font-semibold text-zinc-900">Contact information</legend>
          <div className="mt-3 space-y-3">
            {(config.contact || need['customer.email']) && (
              <Field label="Email" hint={reqHint('customer.email')}>
                <input className={input} type="email" value={c.email} onChange={(e) => setC({ email: e.target.value })} />
              </Field>
            )}
            {(config.contact || need['customer.givenName']) && (
              <Field label="Full name" hint={reqHint('customer.givenName')}>
                <input className={input} value={c.name} onChange={(e) => setC({ name: e.target.value })} />
              </Field>
            )}
          </div>
        </fieldset>
      )}
      {showAddress && (
        <fieldset>
          <legend className="text-base font-semibold text-zinc-900">
            {config.billing && config.shipping ? 'Billing and shipping address' : config.billing ? 'Billing address' : 'Shipping address'}
          </legend>
          <div className="mt-3 -space-y-px overflow-hidden rounded-md">
            <input className={clsx(input, 'rounded-b-none')} aria-label="Street" value={c.street} onChange={(e) => setC({ street: e.target.value })} />
            <div className="grid grid-cols-2 -space-x-px">
              <input className={clsx(input, 'rounded-none')} aria-label="City" value={c.city} onChange={(e) => setC({ city: e.target.value })} />
              <input className={clsx(input, 'rounded-none')} aria-label="Postcode" value={c.postcode} onChange={(e) => setC({ postcode: e.target.value })} />
            </div>
            <div className={clsx(input, 'rounded-t-none text-zinc-500')}>
              {country.flag} {country.name}
            </div>
          </div>
        </fieldset>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading the payment form">
      <div className="h-10 rounded-md bg-zinc-100" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 rounded-md bg-zinc-100" />
        <div className="h-10 rounded-md bg-zinc-100" />
      </div>
      <div className="h-10 rounded-md bg-zinc-200" />
    </div>
  )
}

function Placeholder({ title, children }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-5 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <div className="mt-1 text-sm text-zinc-500">{children}</div>
    </div>
  )
}

function PaymentArea({ env, config, widget, action, onWidgetReady }) {
  let methods = orderedMethods(config)
  let body
  if (!methods.length) body = <Placeholder title="No payment methods">Turn on at least one in the settings.</Placeholder>
  else if (env && !env.configured)
    body = (
      <Placeholder title="Payment form not loaded">
        Add <code className="font-mono text-xs">ENTITY_ID</code> and <code className="font-mono text-xs">ACCESS_TOKEN</code> in Vercel to create real checkouts.
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {methods.map((code) => (
            <li key={code} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
              {getBrand(code).name}
            </li>
          ))}
        </ul>
      </Placeholder>
    )
  else if (widget.error)
    body = (
      <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-600/20 ring-inset">
        <p className="font-medium">The gateway didn&rsquo;t create the checkout</p>
        <p className="mt-1">
          {widget.error.code && <code className="mr-1 font-mono text-xs">{widget.error.code}</code>}
          {widget.error.description}
        </p>
        {widget.error.code && <p className="mt-2 text-rose-700">{describeCode(widget.error.code)}</p>}
      </div>
    )
  else if (!widget.checkoutId) body = <Skeleton />
  else
    body = (
      <div className="relative">
        <PaymentWidget
          widgetBase={env.widgetBase}
          checkoutId={widget.checkoutId}
          integrity={widget.integrity}
          brands={widget.brands}
          action={action}
          onReady={onWidgetReady}
        />
        {widget.updating && (
          <div className="absolute inset-0 flex items-start justify-center bg-white/70 pt-6 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-900/10">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Updating checkout
            </span>
          </div>
        )}
      </div>
    )
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900">Payment method</h3>
      <div className="mt-3">{body}</div>
      {widget.checkoutId && !widget.error && (
        <p className="mt-4 truncate text-center text-xs text-zinc-400">
          COPYandPAY widget · checkout <span className="font-mono">{widget.checkoutId}</span>
        </p>
      )}
    </div>
  )
}

const resultCopy = {
  success: { title: 'Payment successful', tone: 'bg-emerald-100 text-emerald-700', icon: 'M5 10.5l3.5 3.5L15 6.5' },
  pending: { title: 'Payment pending', tone: 'bg-amber-100 text-amber-700', icon: 'M10 6v4.5l3 1.5' },
  failed: { title: 'Payment failed', tone: 'bg-rose-100 text-rose-700', icon: 'M6.5 6.5l7 7m0-7l-7 7' },
}

function Confirmation({ result, checking, saved, repeat, repeating, onPayAgain, onNewCheckout, currency }) {
  let r = result?.response || {}
  let copy = result ? resultCopy[result.status] || resultCopy.failed : null
  return (
    <div>
      {!result ? (
        <div className="py-6 text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-500" />
          <p className="mt-4 text-sm text-zinc-600">{checking ? 'Checking the payment…' : 'Waiting for the payment result'}</p>
        </div>
      ) : (
        <div className="text-center">
          <div className={clsx('mx-auto flex size-12 items-center justify-center rounded-full', copy.tone)}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden="true">
              {result.status === 'pending' && <circle cx="10" cy="10" r="7" />}
              <path d={copy.icon} />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900">{copy.title}</h3>
          <p className="mt-1 text-sm text-zinc-600">{r.result?.description}</p>
          <dl className="mx-auto mt-6 max-w-sm divide-y divide-zinc-900/5 rounded-lg bg-zinc-50 px-4 text-left text-sm">
            {[
              ['Order', r.merchantTransactionId],
              ['Paid with', r.paymentBrand ? getBrand(r.paymentBrand)?.name || r.paymentBrand : null],
              ['Amount', r.amount ? formatMoney(r.amount, r.currency || currency) : null],
              ['Result code', r.result?.code],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="truncate font-medium text-zinc-900">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      {saved && (
        <div className="mt-6 rounded-lg p-4 ring-1 ring-zinc-900/10">
          <p className="text-sm font-medium text-zinc-900">Saved for next time</p>
          <p className="mt-0.5 text-sm text-zinc-600">{saved.label}</p>
          <p className="mt-1 font-mono text-xs break-all text-zinc-500">registrationId {saved.registrationId}</p>
          <button
            type="button"
            onClick={onPayAgain}
            disabled={repeating}
            className="mt-3 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {repeating ? 'Paying…' : 'Buy again in one click'}
          </button>
          {repeat && (
            <p className={clsx('mt-2 text-center text-xs', repeat.status === 'success' ? 'text-emerald-700' : repeat.status === 'pending' ? 'text-amber-700' : 'text-rose-700')}>
              {repeat.response?.result?.code} · {repeat.response?.result?.description}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onNewCheckout}
        className="mt-6 w-full rounded-md px-3 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50"
      >
        Start a new checkout
      </button>
    </div>
  )
}

export function CheckoutPreview({ env, config, setConfig, widget, action, onWidgetReady, mode, confirmation, device }) {
  let country = getCountry(config.country)
  return (
    <div className={clsx('@container mx-auto w-full transition-[max-width] duration-300', device === 'mobile' ? 'max-w-[390px]' : 'max-w-5xl')}>
      <div className="overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-lg ring-1 shadow-zinc-900/5 ring-zinc-900/10 [color-scheme:light] dark:ring-white/10">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-900/5 px-5 py-4 @2xl:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-amber-900 text-sm font-semibold text-amber-50">H</span>
            <span className="text-sm font-semibold text-zinc-900">Halden Coffee</span>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset">Demo store · test</span>
        </div>
        <div className="grid grid-cols-1 gap-10 px-5 py-8 @2xl:grid-cols-2 @2xl:gap-12 @2xl:px-8 @2xl:py-10">
          <Summary config={config} setConfig={setConfig} currency={country.currency} editable={mode !== 'return'} />
          <div className="space-y-8 @2xl:border-l @2xl:border-zinc-900/5 @2xl:pl-12">
            {mode === 'return' ? (
              <Confirmation {...confirmation} currency={country.currency} />
            ) : (
              <>
                <CustomerForm config={config} setConfig={setConfig} />
                <PaymentArea env={env} config={config} widget={widget} action={action} onWidgetReady={onWidgetReady} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
