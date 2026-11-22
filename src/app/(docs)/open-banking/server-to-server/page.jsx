import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'

export const metadata = {
  title: 'Pay by Bank Server to Server',
  description: 'Take Pay by Bank at your checkout with the API: send the payment, send the shopper to their bank and get the result.',
}

export default function OpenBankingServerToServerPage() {
  return (
    <Article>
      <h1>Server to Server</h1>
      <p className="lead">
        Take Pay by Bank at your checkout with the API: send the payment, send the shopper to their bank, and get the result. Try each request on
        the test gateway.
      </p>
      <Suspense>
        <OpenBankingFlow />
      </Suspense>
    </Article>
  )
}
