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
        Your server sends the payment straight to the gateway and handles the redirect itself. Choose the flow, build the request, send it, and use
        the response in the next step.
      </p>
      <Suspense>
        <S2SFlow />
      </Suspense>
    </Article>
  )
}
