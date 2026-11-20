'use client'

import clsx from 'clsx'

import { Banner, PlaygroundShell, Row, Section, Stepper, TextField } from '@/components/Playground'
import { SegmentedControl, Toggle } from '@/components/forms'
import { CHALLENGE_INDICATORS, CUSTOMER_LABELS } from '@/components/RecurringPlayground'
import { SelectMenu } from '@/components/select'
import { AFT_BRANDS, AFT_CURRENCIES, CUSTOMER_KEYS, MCCS, SENDER_KEYS, TEST_CARDS, getMcc, purposeRequired, schemesFor, typesFor } from '@/lib/aft'

// The Playground for the AFT guide sets up the AFT payment: the MCC and what the funds are
// for, the card, the sender, the recipient, the shopper and 3-D Secure. The demo always runs
// on the test system's 3DV2 card channel with its own access token, so there are no
// credentials to enter.

// Icons for the MCC use cases
export function ChartIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" d="M3.25 16.25h13.5M4.75 12.75l3.25-3.5 2.75 2 4.5-5.25M12.75 6h2.5v2.5" />
    </svg>
  )
}

export function WalletIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="2.75" y="5.25" width="14.5" height="10.5" rx="2" strokeWidth="1.25" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" d="M17.25 9h-3.5a1.75 1.75 0 0 0 0 3.5h3.5M5.25 5.25l7.5-2.5 1 2.5" />
    </svg>
  )
}

export function CoinsIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <ellipse cx="10" cy="5.75" rx="5.5" ry="2.25" strokeWidth="1.25" />
      <path fill="none" strokeWidth="1.25" d="M4.5 5.75v4.25c0 1.24 2.46 2.25 5.5 2.25s5.5-1.01 5.5-2.25V5.75M4.5 10v4.25c0 1.24 2.46 2.25 5.5 2.25s5.5-1.01 5.5-2.25V10" />
    </svg>
  )
}

export function TransferIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" d="M3.5 7h12.5m0 0-2.75-2.75M16 7l-2.75 2.75M16.5 13H4m0 0 2.75-2.75M4 13l2.75 2.75" />
    </svg>
  )
}

export function BankIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path strokeWidth="1.25" strokeLinejoin="round" d="M2.75 7.25 10 3.25l7.25 4H2.75Z" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M4.75 9.5v5M8.25 9.5v5M11.75 9.5v5M15.25 9.5v5M2.75 16.75h14.5" />
    </svg>
  )
}

export const MCC_ICONS = { 6211: ChartIcon, 6540: WalletIcon, 6051: CoinsIcon, 4829: TransferIcon, 6012: BankIcon }

// A scheme and the code the Funds Transfer Type maps to, such as "Visa LA" or "MC F61".
// bare: the code alone, where a column already names the scheme
export function SchemeTag({ brand, code, bare, className }) {
  let b = AFT_BRANDS.find((x) => x.code === brand)
  return (
    <span
      className={clsx(
        'inline-flex flex-none items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem]/4 ring-1 ring-inset',
        brand === 'VISA'
          ? 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20'
          : 'bg-amber-50 text-amber-800 ring-amber-600/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20',
        className,
      )}
    >
      {!bare && <span className="font-sans font-medium">{b?.short}</span>}
      {code}
    </span>
  )
}

// The Funds Transfer Types for the chosen MCC, as radio cards with the schemes that allow each
function TransferTypes({ mcc, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Funds Transfer Type" className="grid gap-2">
      {typesFor(mcc).map((t) => {
        let on = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => !on && onChange(t.value)}
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
              <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span className="text-[0.8125rem] font-medium text-zinc-900 dark:text-white">{t.title}</span>
                <span className="flex gap-1">
                  {t.schemes.map((s) => (
                    <SchemeTag key={s} brand={s} code={t[s].code} />
                  ))}
                </span>
              </span>
              <code className="mt-0.5 block font-mono text-[0.6875rem] text-zinc-500 dark:text-zinc-400">{t.value}</code>
              <span className="mt-0.5 block text-xs/5 text-zinc-500 dark:text-zinc-400">{t.text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

const SENDER_LABELS = {
  'sender.givenName': 'Given name',
  'sender.surname': 'Surname',
  'sender.street': 'Street',
  'sender.city': 'City',
  'sender.state': 'State or county',
  'sender.postcode': 'Postcode',
  'sender.country': 'Country',
}

const SENDER_PLACEHOLDERS = { 'sender.state': 'The city if there’s no state', 'sender.postcode': 'Not sent if empty', 'sender.country': 'GB' }

// pg: { flow: { mode: mcc, tx: type }, setFlow, form, setForm, setBrand, missing, onReset }
export function AftPlayground({ open, onClose, focus, pg }) {
  let { form, setForm, flow, missing } = pg
  let set = (patch) => setForm({ ...form, ...patch })
  let setCard = (patch) => setForm({ ...form, card: { ...form.card, ...patch } })
  let setSender = (patch) => setForm({ ...form, sender: { ...form.sender, ...patch } })
  let setRecipient = (patch) => setForm({ ...form, recipient: { ...form.recipient, ...patch } })
  let set3ds = (patch) => setForm({ ...form, threeDS: { ...form.threeDS, ...patch } })
  let invalid = (key) => missing.includes(key)
  let mcc = getMcc(flow.mode)
  let schemes = schemesFor(flow.mode, flow.tx)
  let preset = TEST_CARDS.find((c) => c.value === form.preset)
  let cards = TEST_CARDS.filter((c) => !c.brand || schemes.includes(c.brand))
  let business = form.recipient.who === 'business'
  let needsPurpose = purposeRequired({ paymentBrand: form.paymentBrand, mcc: flow.mode })

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

  function copyFromBilling() {
    let f = form.customer.fields
    setSender({
      'sender.givenName': f['customer.givenName'] || '',
      'sender.surname': f['customer.surname'] || '',
      'sender.street': f['billing.street1'] || '',
      'sender.city': f['billing.city'] || '',
      'sender.country': f['billing.country'] || '',
    })
  }

  return (
    <PlaygroundShell open={open} onClose={onClose} focus={focus} onReset={pg.onReset}>
      <div className="px-5 py-4">
        <Banner>Runs on the test system’s card channel with 3-D Secure 2 (Demo Channel - 3DV2), with the demo’s credentials.</Banner>
      </div>

      {/* The use case: the MCC and what the funds are for */}
      <Section id="pg-usecase" title="Use case" description="Your MCC is set on your merchant account. It decides which Funds Transfer Types you can send on each scheme.">
        <Row label="MCC" htmlFor="pg-mcc">
          <SelectMenu
            id="pg-mcc"
            options={MCCS.map((m) => ({ value: m.code, label: `${m.code} · ${m.title}`, description: m.description }))}
            value={flow.mode}
            onChange={(code) => pg.setFlow({ mode: code, tx: getMcc(code).defaultType })}
          />
        </Row>
        <TransferTypes mcc={flow.mode} value={flow.tx} onChange={(tx) => pg.setFlow({ mode: flow.mode, tx })} />
        <Row label="Direct purchase" hint="isDirectPurchase">
          <Toggle checked={form.directPurchase} label="The payment buys the asset straight away" onChange={(directPurchase) => set({ directPurchase })} />
        </Row>
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
          On when the payment buys the asset straight away, off when it funds an account for later (a top-up). The demo sets it from the Funds Transfer
          Type: on for purchase_ types, off for the others.
        </p>
        <Row label="Purpose code" htmlFor="pg-purpose" hint={needsPurpose ? 'Required for Mastercard' : 'transactionPurposeCode'}>
          <TextField
            id="pg-purpose"
            value={form.purposeCode}
            placeholder={mcc?.purposeCode || 'Not sent if empty'}
            invalid={invalid('transactionPurposeCode')}
            onChange={(purposeCode) => set({ purposeCode: purposeCode.toUpperCase() })}
          />
        </Row>
        {!mcc?.purposeCode && form.paymentBrand === 'MASTER' && (
          <Banner tone="amber">
            transactionPurposeCode is required for Mastercard. The Help Centre documents HIGHRISKSEC for MCC 6211; for {flow.mode}, check the value
            with Nomupay support.
          </Banner>
        )}
      </Section>

      {/* The card and the payment */}
      <Section id="pg-payment" title="Card & payment" description="The card the shopper funds the account with.">
        <Row label="Test card" htmlFor="pg-test-card">
          <SelectMenu
            id="pg-test-card"
            options={cards.map((c) => ({ value: c.value, label: c.label, description: c.number ? `${c.number} · ${c.note}` : c.note }))}
            value={form.preset}
            onChange={choosePreset}
          />
        </Row>
        <Row label="Card brand" htmlFor="pg-brand">
          <SelectMenu
            id="pg-brand"
            options={AFT_BRANDS.map((b) => ({
              value: b.code,
              label: b.name,
              meta: b.code,
              disabled: !schemes.includes(b.code),
              description: schemes.includes(b.code) ? undefined : `${flow.tx} isn’t allowed for ${flow.mode} on ${b.name}`,
            }))}
            value={form.paymentBrand}
            onChange={(brand) => pg.setBrand(brand)}
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
          <TextField id="pg-card-holder" value={form.card.holder} placeholder="Jane Doe" mono={false} invalid={invalid('card.holder')} onChange={(holder) => setCard({ holder })} />
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
              { value: 'PA', label: 'Pre-authorization', meta: 'PA', description: 'Adds a capture step' },
            ]}
            value={form.paymentType}
            onChange={(paymentType) => set({ paymentType })}
          />
        </Row>
        <Row label="Currency" htmlFor="pg-currency">
          <SelectMenu id="pg-currency" options={AFT_CURRENCIES.map((c) => ({ value: c, label: c }))} value={form.currency} onChange={(currency) => set({ currency })} />
        </Row>
        <Row label="Amount" htmlFor="pg-amount">
          <Stepper id="pg-amount" value={form.amount} onChange={(amount) => set({ amount })} />
        </Row>
        <Row label="Merchant transaction ID" htmlFor="pg-mtid" hint="Mandatory for AFTs">
          <TextField id="pg-mtid" value={form.merchantTransactionId} placeholder="Generated if empty" onChange={(merchantTransactionId) => set({ merchantTransactionId })} />
        </Row>
        {preset && preset.value !== 'CUSTOM' && (
          <Banner>
            {preset.label}: {preset.note.toLowerCase()}.
          </Banner>
        )}
      </Section>

      {/* The sender: the cardholder, sent in its own fields */}
      <Section
        id="pg-sender"
        title="Sender"
        description="The cardholder the funds come from. Send these in the sender fields as well as in the customer and billing details."
        action={
          <button type="button" onClick={copyFromBilling} className="flex-none text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
            Copy from billing
          </button>
        }
      >
        {SENDER_KEYS.map((key) => (
          <Row key={key} label={SENDER_LABELS[key]} htmlFor={`pg-${key}`} hint={key}>
            <TextField
              id={`pg-${key}`}
              value={form.sender[key] || ''}
              mono={key === 'sender.country'}
              placeholder={SENDER_PLACEHOLDERS[key]}
              invalid={invalid(key)}
              onChange={(v) => setSender({ [key]: key === 'sender.country' ? v.toUpperCase() : v })}
            />
          </Row>
        ))}
        <Row label="Card issued abroad" hint="Sends sender.birthDate">
          <Toggle checked={form.crossBorder} label="The card was issued outside your country" onChange={(crossBorder) => set({ crossBorder })} />
        </Row>
        {form.crossBorder && (
          <Row label="Date of birth" htmlFor="pg-birth" hint="sender.birthDate">
            <TextField id="pg-birth" value={form.birthDate} placeholder="yyyy-MM-dd" invalid={invalid('sender.birthDate')} onChange={(birthDate) => set({ birthDate })} />
          </Row>
        )}
      </Section>

      {/* The recipient: whose account the funds go to */}
      <Section id="pg-recipient" title="Recipient" description="Whose account the funds go to.">
        <SegmentedControl
          label="Recipient"
          options={[
            { value: 'shopper', label: 'The shopper' },
            { value: 'business', label: 'The business' },
          ]}
          value={form.recipient.who}
          onChange={(who) => setRecipient({ who })}
        />
        <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
          {business
            ? 'The funds are for the business: recipient.givenName is the business name, with no surname.'
            : 'The shopper funds their own account with you, so the recipient is the sender: the demo sends the sender’s names.'}
        </p>
        {business && (
          <Row label="Business name" htmlFor="pg-business" hint="recipient.givenName">
            <TextField id="pg-business" value={form.recipient.businessName} mono={false} invalid={invalid('recipient.givenName')} onChange={(businessName) => setRecipient({ businessName })} />
          </Row>
        )}
        <Row label="Account number" htmlFor="pg-account" hint="recipient.accountNumber">
          <TextField
            id="pg-account"
            value={form.recipient.accountNumber}
            placeholder="The shopper’s account or wallet ID"
            invalid={invalid('recipient.accountNumber')}
            onChange={(accountNumber) => setRecipient({ accountNumber })}
          />
        </Row>
        <Banner>recipient.accountNumberType is WALLET_ID: the only account type Nomupay supports for AFTs today.</Banner>
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
      <Section id="pg-3ds" title="3-D Secure" description="The shopper is there and enters the card, so the AFT is authenticated like any card payment.">
        <Row label="Challenge indicator" htmlFor="pg-3ds-indicator" hint="challengeIndicator">
          <SelectMenu
            id="pg-3ds-indicator"
            options={CHALLENGE_INDICATORS.map((o) => (o.value === '' ? { ...o, description: 'The issuer decides' } : o))}
            value={form.threeDS.challengeIndicator ?? ''}
            onChange={(challengeIndicator) => set3ds({ challengeIndicator })}
          />
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
      <Section id="pg-testing" title="Testing" description="Where the test system sends the payment. A capture is sent with the same testMode.">
        <Row label="testMode" htmlFor="pg-test-mode">
          <SelectMenu
            id="pg-test-mode"
            options={[
              { value: '', label: 'Not sent', description: 'Integrator Test Mode: approves every payment' },
              { value: 'INTERNAL', label: 'INTERNAL', description: 'Integrator Test Mode: approves every payment' },
              { value: 'EXTERNAL', label: 'EXTERNAL', description: 'Acquirer simulator' },
            ]}
            value={form.testMode}
            onChange={(testMode) => set({ testMode })}
          />
        </Row>
      </Section>
    </PlaygroundShell>
  )
}
