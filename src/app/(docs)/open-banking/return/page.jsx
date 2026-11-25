import { PayByBankArticle } from '@/components/PayByBankArticle'
import { ReturnBridge } from '@/components/ReturnBridge'

export const metadata = {
  title: 'Pay by Bank',
  robots: { index: false },
}

// Runs before the page paints: in a popup the demo opened, the page hides behind a short
// "you're back" panel (see tailwind.css)
const EMBED_SCRIPT = `try{if(window.self!==window.top||(window.opener&&window.opener!==window))document.documentElement.setAttribute('data-embedded','')}catch(e){document.documentElement.setAttribute('data-embedded','')}`

// The shopperResultUrl: Token.io sends the shopper here with ?id&resourcePath
export default function PayByBankReturnPage() {
  return (
    <PayByBankArticle mode="return">
      <script dangerouslySetInnerHTML={{ __html: EMBED_SCRIPT }} />
      <ReturnBridge />
    </PayByBankArticle>
  )
}
