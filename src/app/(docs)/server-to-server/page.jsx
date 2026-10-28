import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { S2SFlow } from '@/components/S2SFlow'

export const metadata = {
  title: 'Server-to-server',
  description: 'Send an APM payment straight to /v1/payments, redirect the shopper and read the result.',
}

export default function ServerToServerPage() {
  return (
    <Article>
      <h1>Server-to-server</h1>
      <p className="lead">
        Your server sends the payment directly with <code>paymentBrand</code>, and you handle the redirect yourself. Build the request, send it,
        then use the <code>redirect</code> and <code>id</code> from the response.
      </p>
      <Suspense>
        <S2SFlow />
      </Suspense>
    </Article>
  )
}
