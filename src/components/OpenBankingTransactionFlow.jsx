'use client'

import { Radio, RadioGroup } from '@headlessui/react'
import { useState } from 'react'

import { SequenceDiagram } from '@/components/s2sParts'
import { OB_STEPS } from '@/lib/openBanking'

// The transaction flow on Get started: the requests for each API integration, with a toggle
// between them. It's a static picture, so nothing in the Integration page's Playground changes it.

const LANES = [
  { id: 'shopper', label: 'Shopper', bar: 'bg-emerald-500 dark:bg-emerald-400' },
  { id: 'server', label: 'Merchant server', bar: 'bg-amber-500 dark:bg-amber-400' },
  { id: 'gateway', label: 'Payment gateway', bar: 'bg-sky-500 dark:bg-sky-400' },
  { id: 'bank', label: 'Token.io and bank', bar: 'bg-violet-500 dark:bg-violet-400' },
]

const [PAYMENT, REDIRECT, STATUS] = OB_STEPS
const linked = (s, detail) => ({ step: s.step, href: `/open-banking/integration#${s.id}`, label: s.title, detail })

// The shopper's part and what follows it are the same for both integrations
const BANK_AND_RESULT = [
  { from: 'bank', kind: 'note', label: 'Shopper picks their bank and approves in their banking app' },
  { from: 'bank', to: 'shopper', kind: 'response', label: 'Shopper returns to your shopperResultUrl' },
  { from: 'bank', to: 'gateway', kind: 'response', label: 'The bank confirms the payment, usually within 90 seconds' },
]
const ORDER = { from: 'server', kind: 'note', label: 'Confirms the order once it’s approved' }

const SERVER_TO_SERVER = [
  { from: 'shopper', to: 'server', label: 'Chooses Pay by Bank at checkout' },
  { from: 'server', to: 'gateway', ...linked(PAYMENT, 'POST /v1/payments · ACI_INSTANTPAY · DB') },
  { from: 'gateway', to: 'server', kind: 'response', label: 'Pending, with a redirect to Token.io' },
  { from: 'server', to: 'bank', ...linked(REDIRECT, 'redirect.url') },
  ...BANK_AND_RESULT,
  { from: 'server', to: 'gateway', ...linked(STATUS, 'GET /v1/payments/{id}') },
  { from: 'gateway', to: 'server', kind: 'response', label: 'Approved, declined or still pending' },
  ORDER,
]

// COPYandPAY's widget: the server prepares a checkout, the widget takes the shopper to Token.io
const COPY_AND_PAY = [
  { from: 'shopper', to: 'server', label: 'Goes to checkout' },
  { from: 'server', to: 'gateway', step: 1, label: 'Prepare the checkout', detail: 'POST /v1/checkouts · DB' },
  { from: 'gateway', to: 'server', kind: 'response', label: 'Checkout ID' },
  { from: 'server', to: 'shopper', step: 2, label: 'Show the payment form', detail: 'paymentWidgets.js · ACI_INSTANTPAY' },
  { from: 'shopper', to: 'gateway', label: 'Chooses Pay by Bank and submits the form' },
  { from: 'gateway', to: 'bank', kind: 'response', label: 'The widget sends the shopper to Token.io' },
  ...BANK_AND_RESULT,
  { from: 'server', to: 'gateway', step: 3, label: 'Get the payment status', detail: 'GET /v1/checkouts/{id}/payment' },
  { from: 'gateway', to: 'server', kind: 'response', label: 'Approved, declined or still pending' },
  ORDER,
]

const FLOWS = [
  { value: 'server-to-server', label: 'Server to Server', messages: SERVER_TO_SERVER },
  { value: 'copy-and-pay', label: 'Copy & Pay', messages: COPY_AND_PAY, note: 'Copy & Pay for Pay by Bank is coming soon. This is how it will work.' },
]

function FlowToggle({ value, onChange }) {
  return (
    <RadioGroup value={value} onChange={onChange} aria-label="Integration" className="flex rounded-lg bg-zinc-900/5 p-0.5 dark:bg-white/5">
      {FLOWS.map((f) => (
        <Radio
          key={f.value}
          value={f.value}
          className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900 focus:outline-none data-checked:bg-white data-checked:text-zinc-900 data-checked:shadow-sm data-checked:ring-1 data-checked:ring-zinc-900/5 data-focus:ring-2 data-focus:ring-emerald-500 dark:text-zinc-400 dark:hover:text-white dark:data-checked:bg-zinc-800 dark:data-checked:text-white dark:data-checked:ring-white/10"
        >
          {f.label}
        </Radio>
      ))}
    </RadioGroup>
  )
}

export function OpenBankingTransactionFlow() {
  let [value, setValue] = useState(FLOWS[0].value)
  let flow = FLOWS.find((f) => f.value === value)
  return (
    <>
      <SequenceDiagram
        title={`Pay by Bank · ${flow.label}`}
        messages={flow.messages}
        lanes={LANES}
        actions={<FlowToggle value={value} onChange={setValue} />}
      />
      {flow.note && <p className="-mt-2 text-sm text-zinc-500 dark:text-zinc-400">{flow.note}</p>}
    </>
  )
}
