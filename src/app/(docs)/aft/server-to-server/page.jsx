import { Suspense } from 'react'

import { AftFlow } from '@/components/AftFlow'
import { Article } from '@/components/Article'

export const metadata = {
  title: 'AFT Server to Server',
  description: 'Send an Account Funding Transaction from your server: choose your MCC and what the funds are for, authenticate the shopper and get the result.',
}

export default function AftServerToServerPage() {
  return (
    <Article>
      <h1>Server to Server</h1>
      <p className="lead">
        Try an Account Funding Transaction (AFT) on the test gateway: choose your MCC and what the funds are for, send the card payment with the
        sender and recipient, authenticate the shopper and get the result.
      </p>
      <Suspense>
        <AftFlow />
      </Suspense>
    </Article>
  )
}
