import { Suspense } from 'react'

import { AftFlow } from '@/components/AftFlow'
import { Article } from '@/components/Article'
import { ReturnBridge } from '@/components/ReturnBridge'

export const metadata = {
  title: 'AFT Server to Server',
  robots: { index: false },
}

// Runs before the page paints: inside the payment drawer's frame, or in a popup
// the demo opened, the page hides behind a short "you're back" panel (see tailwind.css)
const EMBED_SCRIPT = `try{if(window.self!==window.top||(window.opener&&window.opener!==window))document.documentElement.setAttribute('data-embedded','')}catch(e){document.documentElement.setAttribute('data-embedded','')}`

// The shopperResultUrl after 3-D Secure: the gateway sends the shopper here with ?id&resourcePath
export default function AftServerToServerReturnPage() {
  return (
    <Article>
      <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      <ReturnBridge />
      <h1>Server to Server</h1>
      <p className="lead">The shopper is back from 3-D Secure. The status step reads the result with the payment ID the gateway added to this address.</p>
      <Suspense>
        <AftFlow mode="return" />
      </Suspense>
    </Article>
  )
}
