import { Article } from '@/components/Article'
import { CardFlow } from '@/components/CardFlow'

export const metadata = {
  title: 'Server-to-server cards',
  description: 'Store a card with the initial payment, charge it again with a repeated payment (MIT), and see the card-on-file identifiers NomuPay returns.',
}

export default function ServerToServerCardsPage() {
  return (
    <Article>
      <h1>Server-to-server cards</h1>
      <p className="lead">
        Try card-on-file on the test gateway: store a Visa or Mastercard test card with the initial payment, charge it again with a repeated
        payment, and check the identifiers that come back.
      </p>
      <CardFlow />
    </Article>
  )
}
