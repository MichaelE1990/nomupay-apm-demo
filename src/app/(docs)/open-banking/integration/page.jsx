import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'

export const metadata = {
  title: 'Pay by Bank integration',
  description: 'Add Pay by Bank to your checkout with our API: show the option, send the payment, send the shopper to their bank and get the result.',
}

export default function OpenBankingIntegrationPage() {
  return (
    <Article>
      <h1>Integration</h1>
      <p className="lead">
        Add Pay by Bank to your checkout with our API, and try each request on our test environment.
      </p>
      <Suspense>
        <OpenBankingFlow />
      </Suspense>
    </Article>
  )
}
