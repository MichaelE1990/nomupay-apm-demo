'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { SlidersIcon } from '@/components/CodeWindow'
import { FieldBox, InsetField, SegmentedControl, Toggle, bareInputClass } from '@/components/forms'
import { CopyValue } from '@/components/params'
import { Banner, CREDENTIALS_URL, EyeIcon, Row, Section, Stepper, TextField } from '@/components/Playground'
import { SelectMenu } from '@/components/select'
import { AUTHORIZATION_TYPES, COF_BRANDS, CURRENCIES, RECURRING_TYPES, SI_TYPES, TEST_CARDS, TEST_MODES, THREE_DS_MODES } from '@/lib/cards'
import { ENTITY_PATTERN, TOKEN_PATTERN } from '@/lib/flowState'

// The Playground for server-to-server cards: credentials, the test card, the
// payment, the card-on-file agreement, how 3D Secure runs, the repeated payment
// and testMode. Everything the requests on the page are built from.
export function CardPlayground({ open, onClose, focus, pg }) {
  let [showToken, setShowToken] = useState(false)
  let { creds, setCreds, config, form, setForm, tx, setTx, repeated, setRepeated, ids } = pg
  let base = `https://${config?.apiHost || 'eu-test.oppwa.com'}`
  let entityOk = ENTITY_PATTERN.test(creds.entityId.trim())
  let tokenOk = TOKEN_PATTERN.test(creds.accessToken.trim())
  let set = (patch) => setForm({ ...form, ...patch })
  let cards = TEST_CARDS[form.brand] || []
  let testMode = TEST_MODES.find((t) => t.value === (form.testMode || ''))
  let threeDS = THREE_DS_MODES.find((m) => m.value === form.threeDS)

  useEffect(() => {
    if (!open || !focus) return
    let t = setTimeout(() => document.getElementById(`cpg-${focus}`)?.scrollIntoView({ block: 'start' }), 320)
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
                <p className="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">Set up the card requests on this page. The code and parameters update as you go.</p>
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
                id="cpg-credentials"
                title="Credentials"
                description="The demo’s test entity, or your own from the Nomupay Dashboard. The entity needs Visa and Mastercard on NomuPay."
                action={<Toggle checked={creds.useOwn} label="Use your own test credentials" onChange={(useOwn) => setCreds({ ...creds, useOwn })} />}
              >
                {!creds.useOwn ? (
                  <Banner>Using the demo’s test credentials{config?.entities?.cardDedicated ? ' (card entity)' : ''}.</Banner>
                ) : entityOk && tokenOk ? (
                  <Banner>Using your test credentials.</Banner>
                ) : (
                  <Banner tone="amber">Enter your entityId and access token to send requests with them.</Banner>
                )}
                {creds.useOwn && (
                  <div className="space-y-3">
                    <InsetField htmlFor="cpg-entity" name="entityId" req="M" invalid={Boolean(creds.entityId) && !entityOk}>
                      <input
                        id="cpg-entity"
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="32 characters, 0-9 and a-f"
                        value={creds.entityId}
                        onChange={(e) => setCreds({ ...creds, entityId: e.target.value })}
                        className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')}
                      />
                    </InsetField>
                    <InsetField htmlFor="cpg-token" name="Access token" req="M" invalid={Boolean(creds.accessToken) && !tokenOk}>
                      <div className="flex items-center gap-2">
                        <input
                          id="cpg-token"
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
                      Kept in this browser tab only, and sent with each request to the test system.{' '}
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

              {/* Card */}
              <Section id="cpg-card" title="Card" description="Published test cards only. Card-on-file is supported for Visa and Mastercard on NomuPay.">
                <Row label="Brand">
                  <SegmentedControl
                    label="Card brand"
                    options={COF_BRANDS.map((b) => ({ value: b.code, label: b.name }))}
                    value={form.brand}
                    onChange={(brand) => set({ brand, cardNumber: TEST_CARDS[brand][0].number })}
                  />
                </Row>
                <Row label="Test card" htmlFor="cpg-card-number">
                  <SelectMenu
                    id="cpg-card-number"
                    options={cards.map((c) => ({ value: c.number, label: `${c.number} · ${c.label}` }))}
                    value={form.cardNumber}
                    onChange={(cardNumber) => set({ cardNumber })}
                  />
                </Row>
                <div className="grid grid-cols-3 gap-3">
                  <InsetField htmlFor="cpg-exp-month" name="expiryMonth" req="M">
                    <input id="cpg-exp-month" value={form.expiryMonth} onChange={(e) => set({ expiryMonth: e.target.value })} className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')} />
                  </InsetField>
                  <InsetField htmlFor="cpg-exp-year" name="expiryYear" req="M">
                    <input id="cpg-exp-year" value={form.expiryYear} onChange={(e) => set({ expiryYear: e.target.value })} className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')} />
                  </InsetField>
                  <InsetField htmlFor="cpg-cvv" name="cvv" req="M">
                    <input id="cpg-cvv" value={form.cvv} onChange={(e) => set({ cvv: e.target.value })} className={clsx(bareInputClass, 'font-mono text-[0.8125rem]')} />
                  </InsetField>
                </div>
                <Row label="Card holder" htmlFor="cpg-holder">
                  <TextField id="cpg-holder" value={form.holder} mono={false} onChange={(holder) => set({ holder })} />
                </Row>
                <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                  NomuPay test data: expiry 01/30 and CVV 333. On NomuPay’s test system an amount of 9000 declines with 800.100.152, and 9100 with 900.100.200.
                </p>
              </Section>

              {/* Payment */}
              <Section id="cpg-payment" title="Payment" description="The initial payment that stores the card.">
                <Row label="Transaction flow">
                  <SegmentedControl
                    label="Transaction flow"
                    options={[
                      { value: 'DB', label: 'Debit' },
                      { value: 'PA', label: 'PA + Capture' },
                    ]}
                    value={tx}
                    onChange={setTx}
                  />
                </Row>
                <Row label="Currency" htmlFor="cpg-currency">
                  <SelectMenu id="cpg-currency" options={CURRENCIES.map((c) => ({ value: c, label: c }))} value={form.currency} onChange={(currency) => set({ currency })} />
                </Row>
                <Row label="Amount" htmlFor="cpg-amount">
                  <Stepper id="cpg-amount" value={form.amount} onChange={(amount) => set({ amount })} />
                </Row>
                <Row label="Merchant transaction ID" htmlFor="cpg-mtid">
                  <TextField id="cpg-mtid" value={form.merchantTransactionId} placeholder="Generated if empty" onChange={(merchantTransactionId) => set({ merchantTransactionId })} />
                </Row>
                {tx === 'PA' && (
                  <Row label="Authorisation type" htmlFor="cpg-auth-type" hint="customParameters[authorization_type]">
                    <SelectMenu
                      id="cpg-auth-type"
                      options={AUTHORIZATION_TYPES.map((a) => ({ value: a.value || 'none', label: a.label }))}
                      value={form.authorizationType || 'none'}
                      onChange={(v) => set({ authorizationType: v === 'none' ? '' : v })}
                    />
                  </Row>
                )}
                <Row label="Customer email" htmlFor="cpg-email">
                  <TextField id="cpg-email" value={form.email} onChange={(email) => set({ email })} />
                </Row>
                <Row label="Billing country" htmlFor="cpg-country">
                  <TextField id="cpg-country" value={form.billingCountry} onChange={(billingCountry) => set({ billingCountry: billingCountry.toUpperCase().slice(0, 2) })} />
                </Row>
              </Section>

              {/* Card-on-file agreement */}
              <Section id="cpg-cof" title="Card-on-file" description="The standing instruction the initial payment sets up.">
                <Row label="Type">
                  <SegmentedControl label="standingInstruction.type" options={SI_TYPES.map((t) => ({ value: t.value, label: t.label, title: t.description }))} value={form.siType} onChange={(siType) => set({ siType })} />
                </Row>
                {form.siType === 'RECURRING' && (
                  <>
                    <Row label="Recurring type" htmlFor="cpg-rtype" hint="Required for Mastercard">
                      <SelectMenu id="cpg-rtype" options={RECURRING_TYPES.map((t) => ({ value: t.value, label: t.label }))} value={form.recurringType} onChange={(recurringType) => set({ recurringType })} />
                    </Row>
                    <Row label="Frequency" htmlFor="cpg-frequency" hint="Minimum days between payments">
                      <TextField id="cpg-frequency" value={form.frequency} placeholder="0030" onChange={(frequency) => set({ frequency })} />
                    </Row>
                    <Row label="Expiry" htmlFor="cpg-si-expiry" hint="yyyy-mm-dd">
                      <TextField id="cpg-si-expiry" value={form.siExpiry} placeholder="2035-12-31" onChange={(siExpiry) => set({ siExpiry })} />
                    </Row>
                  </>
                )}
              </Section>

              {/* 3D Secure */}
              <Section id="cpg-3ds" title="3D Secure" description={threeDS?.description}>
                <SegmentedControl label="3D Secure" options={THREE_DS_MODES.map((m) => ({ value: m.value, label: m.label }))} value={form.threeDS} onChange={(threeDS) => set({ threeDS })} />
                {form.threeDS === 'gateway' && (
                  <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                    The request adds the shopper’s browser data, customer.ip and a shopperResultUrl. Use a 3DS challenge test card to see the redirect.
                  </p>
                )}
              </Section>

              {/* Repeated payment */}
              <Section id="cpg-repeated" title="Repeated payment" description="The MIT over the registration. With a registration, the gateway adds the initial transaction ID and Mastercard TLID itself.">
                <Row label="Amount" htmlFor="cpg-mit-amount">
                  <TextField
                    id="cpg-mit-amount"
                    value={repeated.amount}
                    placeholder={form.amount}
                    onChange={(amount) => setRepeated({ ...repeated, amount })}
                    trailing={<span className="flex-none font-mono text-xs text-zinc-400">{form.currency}</span>}
                  />
                </Row>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium text-zinc-900 dark:text-white">Send initialTransactionId</p>
                    <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                      {ids.initialTransactionId ? <code className="font-mono">{ids.initialTransactionId}</code> : 'From the initial payment’s CardholderInitiatedTransactionID'}
                    </p>
                  </div>
                  <Toggle
                    checked={repeated.sendInitialTransactionId}
                    label="Send initialTransactionId"
                    onChange={(v) => setRepeated({ ...repeated, sendInitialTransactionId: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-medium text-zinc-900 dark:text-white">Send agreementId</p>
                    <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                      {ids.agreementId ? <code className="font-mono">{ids.agreementId}</code> : 'From the initial payment’s LifecycleId (Mastercard)'}
                    </p>
                  </div>
                  <Toggle checked={repeated.sendAgreementId} label="Send agreementId" onChange={(v) => setRepeated({ ...repeated, sendAgreementId: v })} />
                </div>
              </Section>

              {/* Testing */}
              <Section id="cpg-testing" title="Testing" description={testMode?.description}>
                <Row label="testMode">
                  <SegmentedControl
                    label="testMode"
                    options={TEST_MODES.map((t) => ({ value: t.value || 'none', label: t.label }))}
                    value={form.testMode || 'none'}
                    onChange={(v) => set({ testMode: v === 'none' ? '' : v })}
                  />
                </Row>
                {form.testMode !== 'EXTERNAL' && (
                  <Banner tone="amber">Connector fields such as resultDetails.LifecycleId come from NomuPay’s test system, so they only come back with EXTERNAL.</Banner>
                )}
              </Section>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-900/7.5 px-5 py-3 dark:border-white/10">
              <button type="button" onClick={pg.onReset} className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
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
