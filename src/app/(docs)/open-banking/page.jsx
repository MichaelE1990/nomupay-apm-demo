import '@fontsource-variable/inter'

import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import { PayByBankHero, SpecGrid, TickList } from '@/components/openBanking'
import { PayByBankSettings } from '@/components/PayByBankSettings'
import { COVERAGE_URL, PAY_BY_LINKS_URL, SALES_EMAIL } from '@/lib/openBanking'

export const metadata = {
  title: 'Get started with Pay by Bank',
  description: 'Pay by Bank lets shoppers pay straight from their bank account. Its features and how to set up your account.',
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

export default function PayByBankPage() {
  return (
    <Article>
      <h1>Pay by Bank</h1>
      <div className="mt-6 grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">
        <div className="min-w-0 *:first:mt-0 *:last:mb-0">
          <p className="lead">
            Let shoppers pay straight from their bank account. They choose their bank, sign in to their banking app and approve the payment, with
            no card details to enter.
          </p>
        </div>
        <PayByBankHero />
      </div>

      <Heading level={2} id="features">
        Features
      </Heading>
      <SpecGrid items={FEATURES} />

      <Heading level={2} id="account-setup">
        Account setup
      </Heading>
      <p>
        <a href={`mailto:${SALES_EMAIL}`}>Contact our sales team</a> to apply for Pay by Bank. They’ll agree your account settings with you, then
        you complete our Know Your Customer (KYC) checks. Once your account is set up, you can{' '}
        <a href="/open-banking/integration">start integrating</a>.
      </p>
      <PayByBankSettings />
    </Article>
  )
}
