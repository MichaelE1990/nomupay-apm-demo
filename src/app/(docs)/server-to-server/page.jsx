import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { S2SFlow } from '@/components/S2SFlow'

export const metadata = {
  title: 'Server-to-server',
  description: 'Send a payment brand payment from your server, redirect the shopper, read the result and refund it.',
}

export default function ServerToServerPage() {
  return (
    <Article>
      <h1>Server-to-server</h1>
      <p className="lead">
        Integrate payment brands with server-to-server requests: your server sends the payment data to the NomuPay gateway and handles the
        shopper redirect. Select a flow, then build and send each request and use its response in the next step.
      </p>
      <Suspense>
        <S2SFlow />
      </Suspense>
    </Article>
  )
}
