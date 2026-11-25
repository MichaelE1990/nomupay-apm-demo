import '@fontsource-variable/inter'

import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'
import { PayByBankHero, SpecGrid, TickList } from '@/components/openBanking'
import { PayByBankResources } from '@/components/PayByBankCheckout'
import { PayByBankSettings } from '@/components/PayByBankSettings'
import { COVERAGE_URL, SALES_EMAIL } from '@/lib/openBanking'

// The Pay by Bank article: what it is and its features, how it works and how to get set up, then the
// API integration.
// The page and its return page (the shopperResultUrl) both render it.

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
    term: 'Integration method',
    details: (
      <ul className="space-y-1">
        <li>Pay by link</li>
        <li>API</li>
      </ul>
    ),
  },
  {
    term: 'Other',
    details: (
      <TickList
        items={[
          ['Refunds', true],
          ['Chargebacks', false],
          ['3D Secure', false],
        ]}
      />
    ),
  },
  { id: 'resources', term: 'Resources', details: <PayByBankResources /> },
]

// The chapters before the integration's, for the page's table of contents
const SECTIONS = [{ id: 'features', title: 'Features' }]

// Getting started: Pay by Bank's own setup, after Payment workflow. Token.io's questionnaire (sent
// by sales) covers the business details and logo, so the page only mentions the preferences
const SETUP_SECTION = { id: 'getting-started', title: 'Getting started' }

function GettingStarted() {
  return (
    <>
      <Heading level={2} id={SETUP_SECTION.id}>
        {SETUP_SECTION.title}
      </Heading>
      <p>
        Pay by Bank has its own setup, even if you already take payments with us. To get started,{' '}
        <a href={`mailto:${SALES_EMAIL}`}>contact our sales team</a> and tell us your <PayByBankSettings>integration preferences</PayByBankSettings>.
      </p>
    </>
  )
}

export function PayByBankArticle({ mode = 'start', children }) {
  return (
    <Article>
      {children}
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

      <Suspense>
        <OpenBankingFlow mode={mode} sections={SECTIONS} setup={<GettingStarted />} setupSection={SETUP_SECTION} />
      </Suspense>
    </Article>
  )
}
