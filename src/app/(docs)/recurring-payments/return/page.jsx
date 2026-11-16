import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { RecurringFlow } from '@/components/RecurringFlow'
import { ReturnBridge } from '@/components/ReturnBridge'

export const metadata = {
  title: 'Nomupay Server to Server Recurring Payments',
  robots: { index: false },
}

// Runs before the page paints: inside the payment drawer's frame, or in a popup
// the demo opened, the page hides behind a short "you're back" panel (see tailwind.css)
const EMBED_SCRIPT = `try{if(window.self!==window.top||(window.opener&&window.opener!==window))document.documentElement.setAttribute('data-embedded','')}catch(e){document.documentElement.setAttribute('data-embedded','')}`

// The shopperResultUrl after 3-D Secure: the gateway sends the shopper here with ?id&resourcePath
export default function RecurringPaymentsReturnPage() {
  return (
    <Article>
      <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      <ReturnBridge />
      <h1>Nomupay Server to Server Recurring Payments</h1>
      <p className="lead">
        The shopper is back from 3-D Secure. The status step reads the result with the payment ID the gateway added to this address.
      </p>
      <Suspense>
        <RecurringFlow mode="return" />
      </Suspense>
    </Article>
  )
}
