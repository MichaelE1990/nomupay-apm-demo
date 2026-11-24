import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { OpenBankingFlow } from '@/components/OpenBankingFlow'
import { ReturnBridge } from '@/components/ReturnBridge'

export const metadata = {
  title: 'Pay by Bank integration',
  robots: { index: false },
}

// Runs before the page paints: in a popup the demo opened, the page hides behind a short
// "you're back" panel (see tailwind.css)
const EMBED_SCRIPT = `try{if(window.self!==window.top||(window.opener&&window.opener!==window))document.documentElement.setAttribute('data-embedded','')}catch(e){document.documentElement.setAttribute('data-embedded','')}`

// The shopperResultUrl: Token.io sends the shopper here with ?id&resourcePath
export default function OpenBankingReturnPage() {
  return (
    <Article>
      <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      <ReturnBridge />
      <h1>Integration</h1>
      <p className="lead">The shopper is back from their bank. Get the payment status with the payment ID the gateway added to this address.</p>
      <Suspense>
        <OpenBankingFlow mode="return" />
      </Suspense>
    </Article>
  )
}
