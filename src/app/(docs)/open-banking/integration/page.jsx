import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'

export const metadata = {
  title: 'Pay by Bank integration',
  description: 'Take Pay by Bank with Pay by links from your Dashboard, or at your checkout with the API: send the payment, send the shopper to their bank and get the result.',
}

export default function OpenBankingIntegrationPage() {
  return (
    <Article>
      <h1>Integration</h1>
      <p className="lead">
        Choose how shoppers pay: from a Pay by link you send from your Dashboard, or at your own checkout with the API. Try the API on the test
        gateway.
      </p>
      <Suspense>
        <OpenBankingFlow />
      </Suspense>
    </Article>
  )
}
