import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import {
  ChartIcon,
  CheckList,
  ClockIcon,
  FactList,
  FeatureGrid,
  HeadsetIcon,
  JourneySteps,
  LinkIcon,
  PAY_BY_BANK_JOURNEY,
  PathCards,
  ReceiptIcon,
  ServerIcon,
  SettingsIcon,
  ShieldIcon,
  StatGrid,
  TagIcon,
} from '@/components/openBanking'
import { COVERAGE_URL } from '@/lib/openBanking'

export const metadata = {
  title: 'Pay by Bank',
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

const FACTS = [
  { term: 'Payments', details: 'One-off payments that the shopper approves with their bank (debit, DB). There are no recurring payments.' },
  { term: 'Where shoppers pay', details: 'At your checkout, through the API, or with a Pay by link from your Nomupay Dashboard.' },
  { term: 'Currencies', details: 'GBP and EUR.' },
  {
    term: 'Countries and banks',
    details: (
      <>
        The UK and Europe. See the countries and banks on{' '}
        <a href={COVERAGE_URL} target="_blank" rel="noreferrer" className="font-medium text-emerald-600 dark:text-emerald-400">
          Token.io’s coverage map
        </a>
        .
      </>
    ),
  },
  { term: 'Refunds', details: 'Not available after a payment.' },
  { term: 'Card data', details: 'None. Shoppers approve in their bank, so you never handle card or bank details.' },
  { term: 'Partner', details: 'Delivered with our partner Token.io, which runs the connections to the banks.' },
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
      <FactList items={FACTS} />

      <Heading level={2} id="get-started">
        Get started
      </Heading>
      <p>Two steps: set up your account, then choose how shoppers pay.</p>
      <h3>1. Set up your account</h3>
      <PathCards
        paths={[
          {
            href: '/open-banking/account-setup',
            icon: SettingsIcon,
            badge: 'Start here',
            title: 'Account setup',
            text: 'Apply for Pay by Bank and agree the settings we configure for your account.',
          },
        ]}
        wide
      />
      <h3>2. Choose how shoppers pay</h3>
      <PathCards
        paths={[
          {
            href: '/open-banking/pay-by-link',
            icon: LinkIcon,
            badge: 'No code',
            title: 'Pay by link',
            text: 'Create a payment link in your Nomupay Dashboard and send it to your customer.',
          },
          {
            href: '/open-banking/server-to-server',
            icon: ServerIcon,
            badge: 'API',
            title: 'Server to Server',
            text: 'Add Pay by Bank to your checkout: send the payment, send the shopper to their bank and get the result.',
            action: 'Try it on the test system',
          },
        ]}
      />
    </Article>
  )
}
