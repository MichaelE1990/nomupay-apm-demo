import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { CopyAndPayFlow } from '@/components/CopyAndPayFlow'

export const metadata = {
  title: 'COPYandPAY',
  description: 'Create a checkout, render the payment form and get the result.',
}

export default function CopyAndPayPage() {
  return (
    <Article>
      <h1>COPYandPAY</h1>
      <p className="lead">
        Build the checkout your shop would create: choose payment methods, set the amount and add extras like customer details or cart items. Each step shows the request on the right and the response under it, and the next step uses what came back.
      </p>
      <Suspense>
        <CopyAndPayFlow />
      </Suspense>
    </Article>
  )
}
