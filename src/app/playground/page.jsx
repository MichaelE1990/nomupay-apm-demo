import { Suspense } from 'react'

import { Playground } from '@/components/playground/Playground'

export const metadata = {
  title: 'Checkout playground',
  description: 'Configure a checkout, see the real COPYandPAY form, and watch the API calls that build it.',
}

export default function PlaygroundPage() {
  return (
    <Suspense>
      <Playground />
    </Suspense>
  )
}
