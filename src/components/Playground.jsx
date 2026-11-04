'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { BrandFacts, BrandSelect, CartEditor, RequiredFields } from '@/components/builder'
import { SlidersIcon } from '@/components/CodeWindow'
import { FieldBox, InsetField, Toggle, bareInputClass } from '@/components/forms'
import { CopyValue } from '@/components/params'
import { SelectMenu } from '@/components/select'
import { ENTITY_PATTERN, TOKEN_PATTERN } from '@/lib/flowState'

// The Playground: everything the requests on the page are built from, in one
// settings drawer (laid out like an API settings card): credentials, the use case,
// payment brand, currency and amount, the brand's own fields, the cart, the
// back-office amounts and test mode. The page's requests update as values change.

export const CREDENTIALS_URL = 'https://support.nomupay.com/hc/en-gb/articles/8918887969297-Credential-Management'

function CheckCircleIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="m5.75 8.25 1.5 1.5 3-3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M8 2.25 14.25 13.5H1.75L8 2.25Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11.5v.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}

export function EyeIcon({ off, ...props }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M1.75 8S4 3.75 8 3.75 14.25 8 14.25 8 12 12.25 8 12.25 1.75 8 1.75 8Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      {off && <path d="m2.5 2.5 11 11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />}
    </svg>
  )
}

// A status line in the settings, as in the design: green when all is well, amber to act on
export function Banner({ tone = 'green', children }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem]/5 ring-1 ring-inset',
        tone === 'green'
          ? 'bg-green-50/80 text-green-900 ring-green-600/15 dark:bg-green-400/10 dark:text-green-200 dark:ring-green-400/15'
          : 'bg-amber-50/80 text-amber-900 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/15',
      )}
    >
      {tone === 'green' ? (
        <CheckCircleIcon className="mt-0.5 size-4 flex-none text-green-600 dark:text-green-400" />
      ) : (
        <AlertIcon className="mt-0.5 size-4 flex-none text-amber-600 dark:text-amber-400" />
      )}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Section({ id, title, description, action, children }) {
  return (
    <section id={id} className="scroll-mt-4 space-y-4 px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          {description && <p className="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// Label on the left, control on the right (stacks on narrow screens)
export function Row({ label, htmlFor, hint, children }) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1.5 sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-zinc-900 dark:text-white">
          {label}
        </label>
        {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const toNumber = (v) => Number(String(v ?? '').replace(/,/g, ''))

// Minus, the value, plus: steps the amount by 1.00
export function Stepper({ id, value, onChange, readOnly }) {
  let step = (d) => {
    let n = toNumber(value)
    if (!Number.isFinite(n)) n = 0
    onChange(Math.max(0.01, Math.round((n + d) * 100) / 100).toFixed(2))
  }
  let button = 'flex w-9 flex-none items-center justify-center text-zinc-500 transition hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-white'
  return (
    <div className="flex h-9 items-stretch divide-x divide-zinc-900/10 rounded-full bg-white ring-1 ring-zinc-900/10 dark:divide-white/10 dark:bg-white/5 dark:ring-white/10">
      <button type="button" aria-label="Decrease amount by 1" disabled={readOnly} onClick={() => step(-1)} className={button}>
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-auto bg-transparent px-2 text-center font-mono text-sm text-zinc-900 focus:outline-none read-only:text-zinc-500 dark:text-white"
      />
      <button type="button" aria-label="Increase amount by 1" disabled={readOnly} onClick={() => step(1)} className={button}>
        +
      </button>
    </div>
  )
}

export function TextField({ id, value, onChange, placeholder, mono = true, type = 'text', invalid, trailing }) {
  return (
    <FieldBox invalid={invalid} className="flex items-center gap-2">
      <input
        id={id}
        type={type}
        autoComplete="off"
        spellCheck="false"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(bareInputClass, mono && 'font-mono text-[0.8125rem]')}
      />
      {trailing}
    </FieldBox>
  )
}

const USE_CASES = [
  { value: 'async:DB', label: 'Asynchronous · Debit' },
  { value: 'async:PA', label: 'Asynchronous · Pre-authorization + Capture' },
  { value: 'sync:DB', label: 'Synchronous · Debit' },
]

function outsideLimits(brand, currency, amount) {
  let row = brand?.amounts?.find((a) => a.currency === currency)
  if (!row) return null
  let n = toNumber(amount)
  if (!Number.isFinite(n)) return null
  if (row.min && n < toNumber(row.min)) return `below ${brand.name}’s minimum of ${currency} ${row.min}`
  if (row.max && n > toNumber(row.max)) return `above ${brand.name}’s maximum of ${currency} ${row.max}`
  return null
}

// pg: everything the drawer reads and changes (see S2SFlow)
export function Playground({ open, onClose, focus, pg }) {
  let [showToken, setShowToken] = useState(false)
  let { creds, setCreds, config, flow, brand, form, setForm, missing } = pg
  let host = config?.apiHost || 'eu-test.oppwa.com'
  let base = `https://${host}`
  let entityOk = ENTITY_PATTERN.test(creds.entityId.trim())
  let tokenOk = TOKEN_PATTERN.test(creds.accessToken.trim())
  let ownReady = entityOk && tokenOk
  let limit = outsideLimits(brand, form.currency, pg.amount)
  let fieldMissing = missing.filter((k) => !k.startsWith('cart.')).length

  // Open at the section the merchant came for (the back-office amounts, say)
  useEffect(() => {
    if (!open || !focus) return
    let t = setTimeout(() => document.getElementById(`pg-${focus}`)?.scrollIntoView({ block: 'start' }), 320)
    return () => clearTimeout(t)
  }, [open, focus])

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-zinc-900/30 backdrop-blur-xs transition-opacity duration-300 ease-out data-closed:opacity-0 dark:bg-black/50"
      />
      <div className="fixed inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-10">
          <DialogPanel
            transition
            className="pointer-events-auto flex h-full w-screen max-w-md flex-col bg-white shadow-xl ring-1 ring-zinc-900/10 transition duration-300 ease-in-out data-closed:translate-x-full dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-start gap-4 border-b border-zinc-900/7.5 px-5 py-4 dark:border-white/10">
              <div className="min-w-0 flex-auto">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                  <SlidersIcon className="size-4 text-zinc-500 dark:text-zinc-400" />
                  Playground
                </DialogTitle>
                <p className="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">
                  Set up the requests on this page. The code and parameters update as you go.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-none rounded-full bg-emerald-500 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                Done
              </button>
            </div>

            <div className="flex-auto divide-y divide-zinc-900/7.5 overflow-y-auto dark:divide-white/10">
              {/* Credentials */}
              <Section
                id="pg-credentials"
                title="Credentials"
                description="The demo’s test entity, or your own from the Nomupay Dashboard."
                action={
                  <Toggle
                    checked={creds.useOwn}
                    label="Use your own test credentials"
                    onChange={(useOwn) => setCreds({ ...creds, useOwn })}
                  />
                }
              >
                {!creds.useOwn ? (
                  <Banner>Using the demo’s test credentials.</Banner>
                ) : ownReady ? (
                  <Banner>Using your test credentials. Your payment brands must be enabled on this entity.</Banner>
                ) : (
                  <Banner tone="amber">Enter your entityId and access token to send requests with them.</Banner>
                )}
                {creds.useOwn && (
                  <div className="space-y-3">
                    <InsetField htmlFor="pg-entity" name="entityId" req="M" invalid={Boolean(creds.entityId) && !entityOk}>
                      <input
                        id="pg-entity"
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="32 characters, 0-9 and a-f"
                        value={creds.entityId}
                        onChange={(e) => setCreds({ ...creds, entityId: e.target.value })}
                        className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')}
                      />
                    </InsetField>
                    <InsetField htmlFor="pg-token" name="Access token" req="M" invalid={Boolean(creds.accessToken) && !tokenOk}>
                      <div className="flex items-center gap-2">
                        <input
                          id="pg-token"
                          type={showToken ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck="false"
                          placeholder="Bearer token"
                          value={creds.accessToken}
                          onChange={(e) => setCreds({ ...creds, accessToken: e.target.value })}
                          className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')}
                        />
                        <button
                          type="button"
                          aria-label={showToken ? 'Hide the access token' : 'Show the access token'}
                          onClick={() => setShowToken(!showToken)}
                          className="flex-none text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                        >
                          <EyeIcon off={showToken} className="size-4" />
                        </button>
                      </div>
                    </InsetField>
                    <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                      Kept in this browser tab only, and sent with each request to the test system. The code on the page keeps showing{' '}
                      <code className="font-mono">{'{entity_id}'}</code> and <code className="font-mono">{'{access_token}'}</code>.{' '}
                      <a href={CREDENTIALS_URL} target="_blank" rel="noreferrer" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                        Retrieve your Test Credentials ↗
                      </a>
                    </p>
                  </div>
                )}
                <Row label="Base URL">
                  <FieldBox className="flex items-center gap-2 py-1.5">
                    <code className="min-w-0 flex-auto truncate font-mono text-[0.8125rem] text-zinc-700 dark:text-zinc-300">{base}</code>
                    <CopyValue value={base} label="base URL" />
                  </FieldBox>
                </Row>
              </Section>

              {/* Payment */}
              <Section id="pg-payment" title="Payment" description="The use case, payment brand and amount.">
                <Row label="Use case" htmlFor="pg-use-case">
                  <SelectMenu
                    id="pg-use-case"
                    options={USE_CASES}
                    value={`${flow.mode}:${flow.tx}`}
                    onChange={(v) => {
                      let [mode, tx] = v.split(':')
                      pg.setFlow({ mode, tx })
                    }}
                  />
                </Row>
                <Row label="Payment brand" htmlFor="pg-brand">
                  <BrandSelect id="pg-brand" brands={pg.eligible} selected={brand ? [brand.code] : []} showDetails={false} compact onChange={([code]) => pg.onBrand(code)} />
                </Row>
                <Row label="Currency" htmlFor="pg-currency">
                  <SelectMenu
                    id="pg-currency"
                    options={(brand?.currencies || ['EUR']).map((c) => ({ value: c, label: c }))}
                    value={form.currency}
                    onChange={(currency) => setForm({ ...form, currency })}
                    searchPlaceholder="Search currencies"
                  />
                </Row>
                <Row label="Amount" htmlFor="pg-amount" hint={pg.cartDriven ? 'The cart total' : null}>
                  <Stepper id="pg-amount" value={pg.amount} readOnly={pg.cartDriven} onChange={(amount) => setForm({ ...form, amount })} />
                </Row>
                {limit && <Banner tone="amber">This amount is {limit}. The payment brand may decline it.</Banner>}
                <Row label="Merchant transaction ID" htmlFor="pg-mtid">
                  <TextField
                    id="pg-mtid"
                    value={form.merchantTransactionId}
                    placeholder="Generated if empty"
                    onChange={(merchantTransactionId) => setForm({ ...form, merchantTransactionId })}
                  />
                </Row>
                <BrandFacts brand={brand} />
              </Section>

              {/* The brand's own fields */}
              <Section
                id="pg-fields"
                title={brand ? `${brand.name} fields` : 'Payment brand fields'}
                description="The fields this payment brand takes. Empty optional fields aren’t sent."
                action={fieldMissing > 0 && <span className="flex-none text-xs font-medium text-rose-700/80 dark:text-rose-300/75">{fieldMissing} to fill in</span>}
              >
                <RequiredFields
                  form={{ ...form, mode: flow.mode }}
                  setForm={({ mode: _mode, ...f }) => setForm(f)}
                  catalogue={pg.catalogue}
                  idPrefix="pg"
                  missing={missing}
                />
              </Section>

              {/* Cart */}
              {pg.cart && (
                <Section
                  id="pg-cart"
                  title="Cart"
                  description={
                    pg.cartRequired
                      ? `Required for ${brand?.name}. The amount is the cart total.`
                      : 'Optional. When you send a cart, the amount is the cart total.'
                  }
                  action={
                    <Toggle
                      checked={pg.cartRequired || form.extras.cart}
                      disabled={pg.cartRequired}
                      label="Send cart items"
                      onChange={(cart) => setForm({ ...form, extras: { ...form.extras, cart } })}
                    />
                  }
                >
                  {(pg.cartRequired || form.extras.cart) && <CartEditor form={form} setForm={setForm} missing={missing} />}
                </Section>
              )}

              {/* Back-office amounts */}
              <Section id="pg-back-office" title="Back-office" description="Amounts for the requests after the payment. Leave empty to use the payment’s amount.">
                {flow.tx === 'PA' && (
                  <Row label="Capture amount" htmlFor="pg-capture-amount">
                    <TextField
                      id="pg-capture-amount"
                      value={pg.amounts.capture || ''}
                      placeholder={pg.sentAmount}
                      onChange={(v) => pg.setAmount('capture', v)}
                      trailing={<span className="flex-none font-mono text-xs text-zinc-400">{pg.sentCurrency}</span>}
                    />
                  </Row>
                )}
                <Row label="Refund amount" htmlFor="pg-refund-amount">
                  <TextField
                    id="pg-refund-amount"
                    value={pg.amounts.refund || ''}
                    placeholder={pg.sentAmount}
                    onChange={(v) => pg.setAmount('refund', v)}
                    trailing={<span className="flex-none font-mono text-xs text-zinc-400">{pg.sentCurrency}</span>}
                  />
                </Row>
              </Section>

              {/* Testing */}
              {config?.testMode && (
                <Section id="pg-testing" title="Testing" description="Sends the requests to the payment brands’ test systems.">
                  <Row label="testMode">
                    <FieldBox className="py-1.5">
                      <code className="font-mono text-[0.8125rem] text-zinc-700 dark:text-zinc-300">{config.testMode}</code>
                    </FieldBox>
                  </Row>
                </Section>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-900/7.5 px-5 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={pg.onReset}
                className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-emerald-500 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                Done
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
