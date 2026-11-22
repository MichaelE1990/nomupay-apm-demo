import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import {
  ChartIcon,
  CheckList,
  ClockIcon,
  FeatureGrid,
  HeadsetIcon,
  JourneySteps,
  PAY_BY_BANK_JOURNEY,
  ReceiptIcon,
  ShieldIcon,
  SpecGrid,
  StatGrid,
  StepStrip,
  TagIcon,
} from '@/components/openBanking'
import { COVERAGE_URL, OB_BRAND, PAY_BY_LINKS_URL } from '@/lib/openBanking'

export const metadata = {
  title: 'Pay by Bank overview',
  description: 'Pay by Bank lets shoppers pay straight from their bank account. What it is, how it works, where it’s available and how to start.',
}

const STATS = [
  { value: '21', label: 'markets across the UK and Europe', source: 'Token.io' },
  { value: '567m', label: 'bank accounts reachable', source: 'Token.io' },
  { value: '95%+', label: 'payment success rate in top markets', source: 'Token.io' },
  { value: '3x', label: 'lower fraud than the wider industry', source: 'Open Banking Ltd' },
]

const BENEFITS = [
  { icon: TagIcon, title: 'Lower acceptance costs', text: 'No card scheme or interchange fees.' },
  { icon: ShieldIcon, title: 'Less fraud', text: 'The shopper’s own bank authenticates every payment, and there are no card chargebacks.' },
  { icon: ChartIcon, title: 'Higher completion', text: 'A short checkout, with no card details to type or share.' },
  { icon: ClockIcon, title: 'Faster access to funds', text: 'Payments settle in near real time, not T+2 or T+3.' },
  { icon: ReceiptIcon, title: 'Simpler reconciliation', text: 'Each payment arrives in full, with its own reference.' },
  { icon: HeadsetIcon, title: 'Launch support', text: 'Integration help, go-to-market advice and UX guidance from our team.' },
]

// The spec sheet under At a glance
const SPECS = [
  { term: 'Payment type', details: 'One-off debit (DB), approved by the shopper in their bank' },
  { term: 'Recurring payments', details: 'Not supported' },
  { term: 'Refunds', details: 'Not available after a payment' },
  { term: 'Currencies', details: 'GBP, EUR' },
  {
    term: 'Countries and banks',
    details: (
      <>
        UK and Europe.{' '}
        <a href={COVERAGE_URL} target="_blank" rel="noreferrer">
          Coverage map
        </a>
      </>
    ),
  },
  { term: 'Card data', details: 'None: you never handle card or bank details' },
  {
    term: 'Integration',
    details: (
      <>
        <a href={PAY_BY_LINKS_URL} target="_blank" rel="noreferrer">
          Pay by link
        </a>{' '}
        (no code) or the <a href="/open-banking/integration">API</a>
      </>
    ),
  },
  { term: 'Payment brand (API)', details: <code className="font-mono text-[0.8125rem] text-zinc-900 dark:text-white">{OB_BRAND}</code> },
  { term: 'Partner', details: 'Token.io, which runs the connections to the banks' },
]

const USE_CASES = ['Ecommerce checkout', 'Account top-ups', 'Bill payments, including the public sector', 'Loan and credit card repayments', 'Travel and B2B payments']

export default function PayByBankPage() {
  return (
    <Article>
      <h1>Pay by Bank</h1>
      <p className="lead">
        Let shoppers pay straight from their bank account. They choose their bank, sign in to their banking app and approve the payment, with no
        card details to enter.
      </p>

      <Heading level={2} id="how-it-works">
        How it works
      </Heading>
      <p>
        Pay by Bank is our Payment Initiation Service (PIS), powered by Open Banking and delivered with our partner Token.io. Each payment is a
        one-off payment the shopper approves with their own bank, in three steps:
      </p>
      <JourneySteps steps={PAY_BY_BANK_JOURNEY} />
      <StatGrid stats={STATS} footnote="The fraud figure is from Open Banking Ltd, Financial Crime within Open Banking Journeys, Dec 2025: 0.013% against 0.045% industry-wide." />

      <Heading level={2} id="why-pay-by-bank">
        Why Pay by Bank
      </Heading>
      <p>Offer it alongside cards, for shoppers who’d rather pay from their bank account.</p>
      <FeatureGrid features={BENEFITS} />
      <p>It works best for:</p>
      <CheckList items={USE_CASES} />

      <Heading level={2} id="at-a-glance">
        At a glance
      </Heading>
      <SpecGrid items={SPECS} />

      <Heading level={2} id="get-started">
        Get started
      </Heading>
      <StepStrip
        steps={[
          { title: 'Set up your account', text: 'Apply for Pay by Bank and agree your settings with us.', href: '/open-banking/account-setup', action: 'Account setup' },
          {
            title: 'Integrate',
            text: 'Send Pay by links from your Dashboard, or add Pay by Bank to your checkout with the API.',
            href: '/open-banking/integration',
            action: 'Integration',
          },
          { title: 'Go live', text: 'Take payments once we confirm your account is active.' },
        ]}
      />
    </Article>
  )
}
