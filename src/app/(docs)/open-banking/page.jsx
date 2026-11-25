import '@fontsource-variable/inter'

import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import {
  DownloadPill,
  JourneySteps,
  PAY_BY_BANK_JOURNEY,
  PayByBankHero,
  SpecGrid,
  StepList,
  TickList,
  UpNext,
} from '@/components/openBanking'
import { COVERAGE_URL, PAY_BY_LINKS_URL, SALES_EMAIL, SETTINGS_FORM_URL } from '@/lib/openBanking'

export const metadata = {
  title: 'Get started with Pay by Bank',
  description: 'Pay by Bank lets shoppers pay straight from their bank account. How it works, its features and how to set up your account.',
}

// Features, laid out like the payment method facts on Adyen's site
const FEATURES = [
  { term: 'Category', details: 'Online Banking' },
  {
    term: 'Countries',
    details: (
      <>
        UK and Europe.{' '}
        <a href={COVERAGE_URL} target="_blank" rel="noreferrer">
          Bank coverage
        </a>
      </>
    ),
  },
  { term: 'Currencies', details: 'GBP, EUR' },
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
  { term: 'Other', details: <TickList items={['Refunds', 'Strong Customer Authentication (SCA)', 'No chargebacks']} /> },
]

// Account setup: apply (with the settings form), then integrate and go live
const SETUP = [
  {
    title: 'Application and KYC',
    text: (
      <>
        <a href={`mailto:${SALES_EMAIL}`}>Contact our sales team</a> to start your application, with the settings form filled in. Then complete
        our Know Your Customer (KYC) checks.
      </>
    ),
    action: <DownloadPill href={SETTINGS_FORM_URL} label="Download settings form" title="The Pay by Bank settings form (Word)" />,
  },
  {
    title: 'Integration',
    text: (
      <>
        Once your account is set up, integrate with Pay by links or the API, then go live. See <a href="/open-banking/integration">Integration</a>.
      </>
    ),
  },
]

export default function PayByBankPage() {
  return (
    <Article>
      <div className="grid grid-cols-1 items-center gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">
        <div className="min-w-0 *:first:mt-0 *:last:mb-0">
          <h1>Pay by Bank</h1>
          <p className="lead">
            Let shoppers pay straight from their bank account. They choose their bank, sign in to their banking app and approve the payment, with
            no card details to enter.
          </p>
        </div>
        <PayByBankHero />
      </div>

      <section className="my-10 rounded-3xl bg-zinc-50 px-6 py-8 ring-1 ring-zinc-900/5 *:first:mt-0 *:last:mb-0 sm:px-10 sm:py-10 xl:max-w-none dark:bg-white/2.5 dark:ring-white/10">
        <Heading level={2} id="how-it-works">
          How it works
        </Heading>
        <p className="max-w-3xl">
          Pay by Bank is our Payment Initiation Service (PIS), powered by Open Banking and delivered with our partner Token.io. Each payment is a
          one-off payment the shopper approves with their own bank, in three steps:
        </p>
        <JourneySteps steps={PAY_BY_BANK_JOURNEY} className="mb-0" />
      </section>

      <Heading level={2} id="features">
        Features
      </Heading>
      <SpecGrid items={FEATURES} />

      <Heading level={2} id="account-setup">
        Account setup
      </Heading>
      <p>Pay by Bank has its own account set-up, in two steps.</p>
      <StepList steps={SETUP} />

      <UpNext
        href="/open-banking/integration"
        title="Integration"
        text="Choose how shoppers pay: Pay by links from your Dashboard, or the API at your checkout."
      />
    </Article>
  )
}
