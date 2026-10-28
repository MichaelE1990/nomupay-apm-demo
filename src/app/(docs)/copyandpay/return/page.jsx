import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { CopyAndPayFlow } from '@/components/CopyAndPayFlow'

export const metadata = {
  title: 'COPYandPAY',
  robots: { index: false },
}

// The widget's form action: the shopper lands here with ?id&resourcePath
export default function CopyAndPayReturnPage() {
  return (
    <Article>
      <h1>COPYandPAY</h1>
      <p className="lead">
        The shopper is back from the payment page. Step 3 reads the result with the <code>resourcePath</code> the widget added to this URL.
      </p>
      <Suspense>
        <CopyAndPayFlow mode="return" />
      </Suspense>
    </Article>
  )
}
