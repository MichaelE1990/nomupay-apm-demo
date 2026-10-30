import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { ReturnBridge } from '@/components/ReturnBridge'
import { S2SFlow } from '@/components/S2SFlow'

export const metadata = {
  title: 'Server-to-server',
  robots: { index: false },
}

// Runs before the page paints: inside the payment drawer's frame, or in a popup
// the demo opened, the page hides behind a short "you're back" panel (see tailwind.css)
const EMBED_SCRIPT = `try{if(window.self!==window.top||(window.opener&&window.opener!==window))document.documentElement.setAttribute('data-embedded','')}catch(e){document.documentElement.setAttribute('data-embedded','')}`

// The shopperResultUrl: the gateway sends the shopper here with ?id&resourcePath
export default function ServerToServerReturnPage() {
  return (
    <Article>
      <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      <ReturnBridge />
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
