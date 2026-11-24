import '@fontsource-variable/inter'

import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import {
  DownloadPill,
  JourneySteps,
  PAY_BY_BANK_JOURNEY,
  PayByBankBanner,
  PayByBankHero,
  SpecGrid,
  StepList,
  UpNext,
} from '@/components/openBanking'
import { COVERAGE_URL, OB_BRAND, PAY_BY_LINKS_URL, SALES_EMAIL, SETTINGS_FORM_URL } from '@/lib/openBanking'

export const metadata = {
  title: 'Get started with Pay by Bank',
  description: 'Pay by Bank lets shoppers pay straight from their bank account. How it works, its features and how to set up your account.',
}

const code = (t) => <code className="font-mono text-[0.8125rem] text-zinc-900 dark:text-white">{t}</code>

// Features, after the facts payment providers such as Adyen list for a payment method
const FEATURES = [
  { term: 'Payment type', details: 'Online banking: an account-to-account payment the shopper approves in their bank' },
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
  { term: 'Payment brand (API)', details: code(OB_BRAND) },
  {
    term: 'Payment types (API)',
    details: (
      <>
        Debit ({code('DB')}), Refund ({code('RF')})
      </>
    ),
  },
  { term: '3D Secure', details: 'Not needed: the shopper’s bank authenticates each payment' },
  { term: 'Chargebacks', details: 'None: there are no card chargebacks' },
  { term: 'Recurring', details: 'Not supported' },
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

      <PayByBankBanner />

      <Heading level={2} id="how-it-works">
        How it works
      </Heading>
      <p>
        Pay by Bank is our Payment Initiation Service (PIS), powered by Open Banking and delivered with our partner Token.io. Each payment is a
        one-off payment the shopper approves with their own bank, in three steps:
      </p>
      <JourneySteps steps={PAY_BY_BANK_JOURNEY} />

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
