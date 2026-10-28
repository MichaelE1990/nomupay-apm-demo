import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { S2SFlow } from '@/components/S2SFlow'

export const metadata = {
  title: 'Server-to-server',
  robots: { index: false },
}

// The shopperResultUrl: the gateway sends the shopper here with ?id&resourcePath
export default function ServerToServerReturnPage() {
  return (
    <Article>
      <h1>Server-to-server</h1>
      <p className="lead">
        The shopper is back from the payment page. Step 3 reads the result with the payment <code>id</code> the gateway added to this URL.
      </p>
      <Suspense>
        <S2SFlow mode="return" />
      </Suspense>
    </Article>
  )
}
