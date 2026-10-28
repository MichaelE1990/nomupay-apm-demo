import { Suspense } from 'react'

import { Playground } from '@/components/playground/Playground'

export const metadata = {
  title: 'Checkout playground',
  robots: { index: false },
}

// The widget's form action: the shopper lands here with ?id&resourcePath
export default function PlaygroundReturnPage() {
  return (
    <Suspense>
      <Playground mode="return" />
    </Suspense>
  )
}
