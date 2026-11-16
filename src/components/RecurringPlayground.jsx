'use client'

import { Banner, CredentialsSection, PlaygroundShell, Row, Section, Stepper, TextField } from '@/components/Playground'
import { Toggle } from '@/components/forms'
import { SelectMenu } from '@/components/select'
import { AGREEMENTS, CUSTOMER_KEYS, DECLINE_CODES, RECURRING_BRANDS, RECURRING_CURRENCIES, TEST_CARDS } from '@/lib/recurring'

// The Playground for the recurring guide: everything its requests are built from

const USE_CASES = [
  { value: 'scheduled:RECURRING', label: 'Scheduled · Subscription' },
  { value: 'scheduled:INSTALLMENT', label: 'Scheduled · Installments' },
  { value: 'unscheduled:UNSCHEDULED', label: 'Unscheduled · Card on file' },
]

const RECURRING_TYPE_OPTIONS = [
  { value: '', label: 'Not sent' },
  { value: 'SUBSCRIPTION', label: 'SUBSCRIPTION' },
  { value: 'STANDING_ORDER', label: 'STANDING_ORDER' },
]

const CUSTOMER_LABELS = {
  'customer.givenName': 'Given name',
  'customer.surname': 'Surname',
  'customer.email': 'Email',
  'billing.street1': 'Billing street',
  'billing.city': 'Billing city',
  'billing.postcode': 'Billing postcode',
  'billing.country': 'Billing country',
}

export const DECLINE_OPTIONS = [
  ...DECLINE_CODES.map((d) => ({ value: d.code, label: d.code, description: d.description, keywords: d.description })),
  { value: 'custom', label: 'Another result code', description: 'Type any rejection code' },
]

// pg: { config, creds, setCreds, flow, setFlow, form, setForm, missing, onReset, initialAmount, initialCurrency }
export function RecurringPlayground({ open, onClose, focus, pg }) {
  let { form, setForm, flow, missing } = pg
  let set = (patch) => setForm({ ...form, ...patch })
  let setCard = (patch) => setForm({ ...form, card: { ...form.card, ...patch } })
  let setAgreement = (patch) => setForm({ ...form, agreement: { ...form.agreement, ...patch } })
  let setRepeated = (patch) => setForm({ ...form, repeated: { ...form.repeated, ...patch } })
  let setManage = (patch) => setForm({ ...form, manage: { ...form.manage, ...patch } })
  let set3ds = (patch) => setForm({ ...form, threeDS: { ...form.threeDS, ...patch } })
  let needs = AGREEMENTS[flow.tx]?.needs || []
  let invalid = (key) => missing.includes(key)
  let preset = TEST_CARDS.find((c) => c.value === form.preset)

  function choosePreset(value) {
    let card = TEST_CARDS.find((c) => c.value === value)
    if (!card) return
    setForm({
      ...form,
      preset: value,
      paymentBrand: card.brand || form.paymentBrand,
      card: { ...form.card, number: card.number || (value === 'CUSTOM' ? '' : form.card.number) },
    })
  }

  return (
    <PlaygroundShell open={open} onClose={onClose} focus={focus} onReset={pg.onReset}>
      <CredentialsSection
        creds={pg.creds}
        setCreds={pg.setCreds}
        config={pg.config}
        readyText="Using your test credentials. Cards and stored cards (registrations) must be enabled on this entity."
      />

      {/* The agreement */}
      <Section id="pg-agreement" title="Agreement" description="The recurring agreement the payments belong to (standingInstruction).">
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
        <Row label="recurringType" htmlFor="pg-recurring-type" hint="Required for Mastercard">
          <SelectMenu
            id="pg-recurring-type"
            options={RECURRING_TYPE_OPTIONS}
            value={form.agreement.recurringType || ''}
            invalid={invalid('standingInstruction.recurringType')}
            onChange={(recurringType) => setAgreement({ recurringType })}
          />
        </Row>
        {needs.includes('frequency') && (
          <Row label="frequency" htmlFor="pg-frequency" hint="Days, 4 digits">
            <TextField id="pg-frequency" value={form.agreement.frequency} placeholder="0030" invalid={invalid('standingInstruction.frequency')} onChange={(frequency) => setAgreement({ frequency })} />
          </Row>
        )}
        {needs.includes('expiry') && (
          <Row label="expiry" htmlFor="pg-si-expiry" hint="When the agreement ends">
            <TextField id="pg-si-expiry" value={form.agreement.expiry} placeholder="yyyy-mm-dd" invalid={invalid('standingInstruction.expiry')} onChange={(expiry) => setAgreement({ expiry })} />
          </Row>
        )}
        {needs.includes('numberOfInstallments') && (
          <Row label="numberOfInstallments" htmlFor="pg-installments">
            <TextField
              id="pg-installments"
              value={form.agreement.numberOfInstallments}
              placeholder="12"
              invalid={invalid('standingInstruction.numberOfInstallments')}
              onChange={(numberOfInstallments) => setAgreement({ numberOfInstallments })}
            />
          </Row>
        )}
        <Row label="Customer ID" htmlFor="pg-customer-id" hint="Your ID for the shopper">
          <TextField id="pg-customer-id" value={form.merchantCustomerId} placeholder="Not sent if empty" onChange={(merchantCustomerId) => set({ merchantCustomerId })} />
        </Row>
      </Section>

      {/* The initial payment and the card */}
      <Section id="pg-payment" title="Initial payment" description="The card the shopper enters, and the first payment of the agreement.">
        <Row label="Test card" htmlFor="pg-test-card">
          <SelectMenu
            id="pg-test-card"
            options={TEST_CARDS.map((c) => ({ value: c.value, label: c.label, description: c.number ? `${c.number} · ${c.note}` : c.note }))}
            value={form.preset}
            onChange={choosePreset}
          />
        </Row>
        <Row label="Card brand" htmlFor="pg-brand">
          <SelectMenu
            id="pg-brand"
            options={RECURRING_BRANDS.map((b) => ({ value: b.code, label: b.name, meta: b.code }))}
            value={form.paymentBrand}
            onChange={(paymentBrand) => set({ paymentBrand })}
          />
        </Row>
        <Row label="card.number" htmlFor="pg-card-number">
          <TextField
            id="pg-card-number"
            value={form.card.number}
            placeholder="4200000000000000"
            invalid={invalid('card.number')}
            onChange={(number) => setForm({ ...form, preset: TEST_CARDS.find((c) => c.number === number.replace(/\s+/g, ''))?.value || 'CUSTOM', card: { ...form.card, number } })}
          />
        </Row>
        <Row label="card.holder" htmlFor="pg-card-holder" hint="A decline code here declines the initial payment">
          <TextField id="pg-card-holder" value={form.card.holder} placeholder="Test Shopper" mono={false} invalid={invalid('card.holder')} onChange={(holder) => setCard({ holder })} />
        </Row>
        <Row label="Expiry" htmlFor="pg-card-month" hint="Month and year">
          <div className="grid grid-cols-2 gap-2">
            <TextField id="pg-card-month" value={form.card.expiryMonth} placeholder="12" invalid={invalid('card.expiryMonth')} onChange={(expiryMonth) => setCard({ expiryMonth })} />
            <TextField id="pg-card-year" value={form.card.expiryYear} placeholder="2029" invalid={invalid('card.expiryYear')} onChange={(expiryYear) => setCard({ expiryYear })} />
          </div>
        </Row>
        <Row label="card.cvv" htmlFor="pg-card-cvv">
          <TextField id="pg-card-cvv" value={form.card.cvv} placeholder="123" invalid={invalid('card.cvv')} onChange={(cvv) => setCard({ cvv })} />
        </Row>
        <Row label="Payment type" htmlFor="pg-payment-type">
          <SelectMenu
            id="pg-payment-type"
            options={[
              { value: 'DB', label: 'Debit', meta: 'DB' },
              { value: 'PA', label: 'Pre-authorization', meta: 'PA' },
            ]}
            value={form.paymentType}
            onChange={(paymentType) => set({ paymentType })}
          />
        </Row>
        <Row label="Currency" htmlFor="pg-currency">
          <SelectMenu id="pg-currency" options={RECURRING_CURRENCIES.map((c) => ({ value: c, label: c }))} value={form.currency} onChange={(currency) => set({ currency })} />
        </Row>
        <Row label="Amount" htmlFor="pg-amount">
          <Stepper id="pg-amount" value={form.amount} onChange={(amount) => set({ amount })} />
        </Row>
        <Row label="Merchant transaction ID" htmlFor="pg-mtid">
          <TextField id="pg-mtid" value={form.merchantTransactionId} placeholder="Generated if empty" onChange={(merchantTransactionId) => set({ merchantTransactionId })} />
        </Row>
        {preset && preset.value !== 'CUSTOM' && <Banner>{preset.label}: {preset.note.toLowerCase()}.</Banner>}
      </Section>

      {/* Customer and billing */}
      <Section
        id="pg-customer"
        title="Customer & billing"
        description="Recommended for 3-D Secure, and used by risk checks."
        action={<Toggle checked={form.customer.on} label="Send customer and billing details" onChange={(on) => setForm({ ...form, customer: { ...form.customer, on } })} />}
      >
        {form.customer.on &&
          CUSTOMER_KEYS.map((key) => (
            <Row key={key} label={CUSTOMER_LABELS[key]} htmlFor={`pg-${key}`} hint={key}>
              <TextField
                id={`pg-${key}`}
                value={form.customer.fields[key] || ''}
                mono={false}
                invalid={invalid(key)}
                onChange={(v) => setForm({ ...form, customer: { ...form.customer, fields: { ...form.customer.fields, [key]: v } } })}
              />
            </Row>
          ))}
      </Section>

      {/* 3-D Secure */}
      <Section id="pg-3ds" title="3-D Secure" description="The initial payment is the one the shopper authenticates. Subsequent payments carry no authentication data.">
        <Row label="Browser data" hint="customer.ip and customer.browser.*">
          <Toggle checked={form.threeDS.browser} label="Send the shopper's browser data" onChange={(browser) => set3ds({ browser })} />
        </Row>
        <Row label="Simulator flow" htmlFor="pg-3ds-flow" hint="customParameters[3DS2_flow]">
          <SelectMenu
            id="pg-3ds-flow"
            options={[
              { value: '', label: 'Not sent', description: 'The test card decides' },
              { value: 'frictionless', label: 'frictionless' },
              { value: 'challenge', label: 'challenge' },
            ]}
            value={form.threeDS.flow}
            onChange={(flow3) => set3ds({ flow: flow3 })}
          />
        </Row>
        <Row label="Any card enrolled" hint="customParameters[3DS2_enrolled]">
          <Toggle checked={form.threeDS.enrolled} label="Treat any test card as enrolled" onChange={(enrolled) => set3ds({ enrolled })} />
        </Row>
      </Section>

      {/* Subsequent payments */}
      <Section id="pg-subsequent" title="Subsequent payment" description="The merchant-initiated payments on the stored card.">
        <Row label="Amount" htmlFor="pg-repeated-amount" hint="Empty: the initial amount">
          <TextField
            id="pg-repeated-amount"
            value={form.repeated.amount}
            placeholder={pg.initialAmount}
            onChange={(amount) => setRepeated({ amount })}
            trailing={<span className="flex-none font-mono text-xs text-zinc-400">{pg.initialCurrency}</span>}
          />
        </Row>
        <Row label="initialTransactionId" hint="From the initial response">
          <Toggle checked={form.repeated.sendInitialId} label="Send standingInstruction.initialTransactionId" onChange={(sendInitialId) => setRepeated({ sendInitialId })} />
        </Row>
        <Row label="Simulate a decline" hint="Sends the code as card.holder">
          <Toggle checked={form.repeated.decline} label="Simulate a decline on the subsequent payment" onChange={(decline) => setRepeated({ decline })} />
        </Row>
        {form.repeated.decline && (
          <Row label="Result code" htmlFor="pg-decline-code">
            <SelectMenu id="pg-decline-code" options={DECLINE_OPTIONS} value={form.repeated.code} searchable onChange={(code) => setRepeated({ code })} searchPlaceholder="Search codes" />
          </Row>
        )}
        {form.repeated.decline && form.repeated.code === 'custom' && (
          <Row label="Custom code" htmlFor="pg-decline-custom">
            <TextField id="pg-decline-custom" value={form.repeated.custom} placeholder="800.100.171" onChange={(custom) => setRepeated({ custom })} />
          </Row>
        )}
      </Section>

      {/* Manage the registration */}
      <Section id="pg-manage" title="Registration" description="Update the stored card, or delete the registration.">
        <Row label="Action" htmlFor="pg-manage-action">
          <SelectMenu
            id="pg-manage-action"
            options={[
              { value: 'update', label: 'Update the stored card', meta: 'POST' },
              { value: 'delete', label: 'Delete the registration', meta: 'DELETE' },
            ]}
            value={form.manage.action}
            onChange={(action) => setManage({ action })}
          />
        </Row>
        {form.manage.action === 'update' && (
          <>
            <Row label="New card.holder" htmlFor="pg-manage-holder" hint="Try a decline code">
              <TextField id="pg-manage-holder" value={form.manage.holder} placeholder="800.100.203" onChange={(holder) => setManage({ holder })} />
            </Row>
            <Row label="New expiry" htmlFor="pg-manage-month" hint="Month and year">
              <div className="grid grid-cols-2 gap-2">
                <TextField id="pg-manage-month" value={form.manage.expiryMonth} placeholder="MM" onChange={(expiryMonth) => setManage({ expiryMonth })} />
                <TextField id="pg-manage-year" value={form.manage.expiryYear} placeholder="YYYY" onChange={(expiryYear) => setManage({ expiryYear })} />
              </div>
            </Row>
          </>
        )}
      </Section>

      {/* Testing */}
      <Section id="pg-testing" title="Testing" description="Where the test system sends the card payments.">
        <Row label="testMode" htmlFor="pg-test-mode">
          <SelectMenu
            id="pg-test-mode"
            options={[
              { value: '', label: 'Not sent', description: 'The simulator (INTERNAL) is the default' },
              { value: 'INTERNAL', label: 'INTERNAL', description: 'The test simulators' },
              { value: 'EXTERNAL', label: 'EXTERNAL', description: 'The acquirer’s test system' },
            ]}
            value={form.testMode}
            onChange={(testMode) => set({ testMode })}
          />
        </Row>
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
          Negative testing (a decline code in card.holder) runs on the test system’s acquirer simulator.
        </p>
      </Section>
    </PlaygroundShell>
  )
}
