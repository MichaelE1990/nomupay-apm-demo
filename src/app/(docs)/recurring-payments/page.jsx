import { Suspense } from 'react'

import { Article } from '@/components/Article'
import { RecurringFlow } from '@/components/RecurringFlow'

export const metadata = {
  title: 'Nomupay Server to Server Recurring Payments',
  description: 'Store a card with an initial payment, charge it again without the shopper, and simulate declines on the subsequent payments.',
}

export default function RecurringPaymentsPage() {
  return (
    <Article>
      <h1>Nomupay Server to Server Recurring Payments</h1>
      <p className="lead">
        Try a recurring card integration on the test gateway: store the card with an initial payment, then charge it again without the shopper,
        and see how a declined subsequent payment comes back.
      </p>
      <Suspense>
        <RecurringFlow />
      </Suspense>
    </Article>
  )
}
