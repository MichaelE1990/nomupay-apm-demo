import '@fontsource-variable/inter'

import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'
import { PayByBankHero, SpecGrid, TickList } from '@/components/openBanking'
import { PayByBankResources } from '@/components/PayByBankCheckout'
import { PayByBankSettings } from '@/components/PayByBankSettings'
import { COVERAGE_URL, PAY_BY_LINKS_URL, SALES_EMAIL } from '@/lib/openBanking'

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
    term: 'Setup & integration',
    details: (
      <>
        <a href="#getting-started">Set up by our team</a>, then integrate with{' '}
        <a href={PAY_BY_LINKS_URL} target="_blank" rel="noreferrer">
          Pay by link
        </a>{' '}
        (no code) or the <a href="#integrate-pay-by-bank">API</a>
      </>
    ),
  },
  { term: 'Other', details: <TickList items={['Refunds', 'Strong Customer Authentication (SCA)', 'No chargebacks']} /> },
  {
    id: 'resources',
    term: 'Resources',
    details: (
      <>
        <p className="mb-3">Token.io’s design reference, buttons, marks and fonts, free to use with Pay by Bank.</p>
        <PayByBankResources />
      </>
    ),
  },
]

// The chapters before the integration's, for the page's table of contents
const SECTIONS = [{ id: 'features', title: 'Features' }]

// Getting started: Pay by Bank's own setup, after Payment workflow. Token.io's questionnaire (sent
// by sales) covers the business details and logo, so the page only asks for preferences
const SETUP_SECTION = { id: 'getting-started', title: 'Getting started' }

function GettingStarted() {
  return (
    <>
      <Heading level={2} id={SETUP_SECTION.id}>
        {SETUP_SECTION.title}
      </Heading>
      <p>
        Pay by Bank has its own setup, even if you already take payments with us. Our partner Token.io approves your business, then we set up
        your account.
      </p>
      <ol>
        <li>
          <strong>Apply.</strong> <a href={`mailto:${SALES_EMAIL}`}>Contact our sales team</a>. They’ll send you the forms to fill in.
        </li>
        <li>
          <strong>Choose your settings.</strong> Most come from your application. You can also tell us your preferences, such as the countries
          shoppers can pay from.
          <div className="mt-3">
            <PayByBankSettings />
          </div>
        </li>
        <li>
          <strong>Get your credentials.</strong> We’ll email you when your account is ready. Your Entity ID and Access Token are in the
          Credentials tab of your Dashboard, and you can only view them once.
        </li>
        <li>
          <strong>Integrate.</strong> Follow the <a href="#integrate-pay-by-bank">steps below</a>, or send Pay by links from your Dashboard.
        </li>
      </ol>
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

      <hr />
      <Suspense>
        <OpenBankingFlow mode={mode} sections={SECTIONS} setup={<GettingStarted />} setupSection={SETUP_SECTION} />
      </Suspense>
    </Article>
  )
}
