'use client'

import clsx from 'clsx'

import { Banner, PlaygroundShell, Row, Section, Stepper, TextField } from '@/components/Playground'
import { SegmentedControl, Toggle } from '@/components/forms'
import { SelectMenu } from '@/components/select'
import { AGREEMENTS, CUSTOMER_KEYS, DECLINE_CODES, RECURRING_BRANDS, RECURRING_CURRENCIES, TEST_CARDS } from '@/lib/recurring'

// The Playground for the recurring guide sets up the initial payment: the agreement, the
// card, the shopper and 3-D Secure. The demo always runs on the test system's 3DV2 card
// channel with its own access token, so there are no credentials to enter. The subsequent
// payment and the registration have their own controls in steps 4 and 5.

export function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="3.25" y="4.25" width="13.5" height="12.5" rx="2" strokeWidth="1.25" fill="none" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M3.25 8.25h13.5M7 2.75v3M13 2.75v3M6.75 11.25h1.5M11.75 11.25h1.5M6.75 14h1.5" />
    </svg>
  )
}

export function CardIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="2" strokeWidth="1.25" fill="none" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M2.75 8.25h14.5M5.75 12.25h3" />
    </svg>
  )
}

// The two use cases, each with its agreement types (standingInstruction.type)
export const USE_CASES = {
  scheduled: {
    label: 'Scheduled',
    icon: CalendarIcon,
    text: 'The merchant charges the stored card on a schedule the shopper agreed to.',
    examples: 'a monthly membership, a streaming subscription, or one purchase paid in 3 installments.',
    types: ['RECURRING', 'INSTALLMENT'],
  },
  unscheduled: {
    label: 'Unscheduled',
    icon: CardIcon,
    text: 'The merchant charges the stored card when it’s needed, with no fixed schedule or amount.',
    examples: 'an account top-up when the balance runs low, or usage charged after the fact.',
    types: ['UNSCHEDULED'],
  },
}

const RECURRING_TYPE_OPTIONS = [
  { value: '', label: 'Not sent' },
  { value: 'SUBSCRIPTION', label: 'SUBSCRIPTION', description: 'Fixed amount at a fixed interval' },
  { value: 'STANDING_ORDER', label: 'STANDING_ORDER', description: 'Variable amount at a fixed interval' },
]

const CUSTOMER_LABELS = {
  'customer.givenName': 'Given name',
  'customer.surname': 'Surname',
  'customer.email': 'Email',
  'customer.mobile': 'Mobile',
  'billing.street1': 'Billing street',
  'billing.city': 'Billing city',
  'billing.postcode': 'Billing postcode',
  'billing.country': 'Billing country',
}

// threeDSecure.challengeIndicator, from the 3D Secure Request Parameters page
const CHALLENGE_INDICATORS = [
  { value: '', label: 'Not sent', description: 'The gateway uses 04 for an initial CIT' },
  { value: '01', label: '01', description: 'No preference' },
  { value: '02', label: '02', description: 'No challenge requested' },
  { value: '03', label: '03', description: 'Challenge requested: merchant preference' },
  { value: '04', label: '04', description: 'Challenge requested: mandate (initial CIT)' },
  { value: '05', label: '05', description: 'No challenge: risk analysis done' },
  { value: '06', label: '06', description: 'No challenge: data share only' },
  { value: '07', label: '07', description: 'No challenge: SCA already done' },
  { value: '08', label: '08', description: 'No challenge: whitelist exemption' },
  { value: '09', label: '09', description: 'Challenge with a whitelist prompt' },
]

export const DECLINE_OPTIONS = [
  ...DECLINE_CODES.map((d) => ({ value: d.code, label: d.code, description: d.description, keywords: d.description })),
  { value: 'custom', label: 'Another result code', description: 'Type any rejection code' },
]

// Agreement types under a use case, as radio cards (like the use case trays on the page)
function AgreementTypes({ types, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Agreement type" className={clsx('grid gap-2', types.length > 1 && 'sm:grid-cols-2')}>
      {types.map((t) => {
        let on = t === value
        let a = AGREEMENTS[t]
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(t)}
            className={clsx(
              'flex items-start gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition',
              on
                ? 'bg-emerald-50/60 ring-emerald-500 dark:bg-emerald-400/5 dark:ring-emerald-400/60'
                : 'ring-zinc-900/10 hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/2.5',
            )}
          >
            <span
              className={clsx(
                'mt-0.5 flex size-4 flex-none items-center justify-center rounded-full ring-1',
                on ? 'bg-emerald-500 ring-emerald-500' : 'ring-zinc-300 dark:ring-white/20',
              )}
            >
              {on && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <span className="min-w-0 flex-auto">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[0.8125rem] font-medium text-zinc-900 dark:text-white">{a.title}</span>
                <code className="font-mono text-[0.6875rem] text-zinc-400">{t}</code>
              </span>
              <span className="mt-0.5 block text-xs/5 text-zinc-500 dark:text-zinc-400">{a.text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

// pg: { flow, setFlow, form, setForm, missing, onReset }
export function RecurringPlayground({ open, onClose, focus, pg }) {
  let { form, setForm, flow, missing } = pg
  let set = (patch) => setForm({ ...form, ...patch })
  let setCard = (patch) => setForm({ ...form, card: { ...form.card, ...patch } })
  let setAgreement = (patch) => setForm({ ...form, agreement: { ...form.agreement, ...patch } })
  let set3ds = (patch) => setForm({ ...form, threeDS: { ...form.threeDS, ...patch } })
  let useCase = USE_CASES[flow.mode] || USE_CASES.scheduled
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
      <div className="px-5 py-4">
        <Banner>Runs on the test system’s card channel with 3-D Secure 2 (Demo Channel - 3DV2), with the demo’s credentials.</Banner>
      </div>

      {/* The agreement: the use case, its agreement type, and the fields that type needs */}
      <Section id="pg-agreement" title="Agreement" description="The recurring agreement the payments belong to (standingInstruction).">
        <SegmentedControl
          label="Use case"
          options={Object.entries(USE_CASES).map(([value, u]) => ({ value, label: u.label, icon: <u.icon className="size-4 flex-none stroke-current" /> }))}
          value={flow.mode}
          onChange={(mode) => pg.setFlow({ mode, tx: USE_CASES[mode].types[0] })}
        />
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
          {useCase.text} For example, {useCase.examples}
        </p>
        {useCase.types.length > 1 && <AgreementTypes types={useCase.types} value={flow.tx} onChange={(tx) => pg.setFlow({ mode: flow.mode, tx })} />}
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
          <Row label="frequency" htmlFor="pg-frequency" hint="Days between payments">
            <TextField id="pg-frequency" value={form.agreement.frequency} placeholder="0030" invalid={invalid('standingInstruction.frequency')} onChange={(frequency) => setAgreement({ frequency })} />
          </Row>
        )}
        {needs.includes('expiry') && (
          <Row label="expiry" htmlFor="pg-si-expiry" hint="When the agreement ends">
            <TextField id="pg-si-expiry" value={form.agreement.expiry} placeholder="yyyy-mm-dd" invalid={invalid('standingInstruction.expiry')} onChange={(expiry) => setAgreement({ expiry })} />
          </Row>
        )}
        {needs.includes('numberOfInstallments') && (
          <Row label="numberOfInstallments" htmlFor="pg-installments" hint="Payments in the plan">
            <TextField
              id="pg-installments"
              value={form.agreement.numberOfInstallments}
              placeholder="12"
              invalid={invalid('standingInstruction.numberOfInstallments')}
              onChange={(numberOfInstallments) => setAgreement({ numberOfInstallments })}
            />
          </Row>
        )}
        <Row label="Customer ID" htmlFor="pg-customer-id" hint="customer.merchantCustomerId">
          <TextField id="pg-customer-id" value={form.merchantCustomerId} placeholder="Not sent if empty" onChange={(merchantCustomerId) => set({ merchantCustomerId })} />
        </Row>
      </Section>

      {/* The card and the initial payment */}
      <Section id="pg-payment" title="Card & initial payment" description="The card the shopper enters, and the first payment of the agreement.">
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
        <Row label="card.holder" htmlFor="pg-card-holder">
          <TextField id="pg-card-holder" value={form.card.holder} placeholder="John Doe" mono={false} invalid={invalid('card.holder')} onChange={(holder) => setCard({ holder })} />
        </Row>
        <Row label="Expiry and CVV" htmlFor="pg-card-month" hint="MM, YYYY, CVV">
          <div className="grid grid-cols-3 gap-2">
            <TextField id="pg-card-month" value={form.card.expiryMonth} placeholder="12" invalid={invalid('card.expiryMonth')} onChange={(expiryMonth) => setCard({ expiryMonth })} />
            <TextField id="pg-card-year" value={form.card.expiryYear} placeholder="2029" invalid={invalid('card.expiryYear')} onChange={(expiryYear) => setCard({ expiryYear })} />
            <TextField id="pg-card-cvv" value={form.card.cvv} placeholder="123" invalid={invalid('card.cvv')} onChange={(cvv) => setCard({ cvv })} />
          </div>
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
        {preset && preset.value !== 'CUSTOM' && (
          <Banner>
            {preset.label}: {preset.note.toLowerCase()}.
          </Banner>
        )}
      </Section>

      {/* Customer and billing */}
      <Section
        id="pg-customer"
        title="Customer & billing"
        description="3-D Secure needs an email, a phone number and the billing address."
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
        <Row label="Challenge indicator" htmlFor="pg-3ds-indicator" hint="challengeIndicator">
          <SelectMenu id="pg-3ds-indicator" options={CHALLENGE_INDICATORS} value={form.threeDS.challengeIndicator ?? ''} onChange={(challengeIndicator) => set3ds({ challengeIndicator })} />
        </Row>
        <Row label="Simulator flow" htmlFor="pg-3ds-flow" hint="3DS2_flow">
          <SelectMenu
            id="pg-3ds-flow"
            options={[
              { value: '', label: 'Not sent', description: 'The test card and indicator decide' },
              { value: 'frictionless', label: 'frictionless' },
              { value: 'challenge', label: 'challenge' },
            ]}
            value={form.threeDS.flow}
            onChange={(flow3) => set3ds({ flow: flow3 })}
          />
        </Row>
        <Row label="Any card enrolled" hint="3DS2_enrolled">
          <Toggle checked={form.threeDS.enrolled} label="Treat any test card as enrolled" onChange={(enrolled) => set3ds({ enrolled })} />
        </Row>
        <Row label="Browser data" hint="customer.browser.*">
          <Toggle checked={form.threeDS.browser} label="Send the shopper's browser data" onChange={(browser) => set3ds({ browser })} />
        </Row>
        {form.threeDS.browser && (
          <Row label="Challenge window" htmlFor="pg-3ds-window" hint="challengeWindow">
            <SelectMenu
              id="pg-3ds-window"
              options={[
                { value: '', label: 'Not sent' },
                { value: '01', label: '01', description: '250 x 400' },
                { value: '02', label: '02', description: '390 x 400' },
                { value: '03', label: '03', description: '500 x 600' },
                { value: '04', label: '04', description: '600 x 400' },
                { value: '05', label: '05', description: 'Full screen' },
              ]}
              value={form.threeDS.challengeWindow ?? ''}
              onChange={(challengeWindow) => set3ds({ challengeWindow })}
            />
          </Row>
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
      </Section>
    </PlaygroundShell>
  )
}
