import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import { Callout, JourneySteps, PAY_BY_BANK_JOURNEY, PathCards, ServerIcon, StepList } from '@/components/openBanking'
import { PAY_BY_LINKS_URL } from '@/lib/openBanking'

export const metadata = {
  title: 'Pay by Bank with Pay by link',
  description: 'Create a Pay by Bank payment link in your Nomupay Dashboard and send it to your customer, with nothing to build.',
}

export default function PayByLinkPage() {
  return (
    <Article>
      <h1>Pay by link</h1>
      <p className="lead">
        Send your customer a link to pay by bank, straight from your Nomupay Dashboard. There’s nothing to build.
      </p>
      <Callout title="Before you start">
        Your account needs Pay by link as its integration type. See <a href="/open-banking/account-setup#settings">Account setup</a>.
      </Callout>

      <Heading level={2} id="create-a-link">
        Create a Pay by link
      </Heading>
      <StepList
        steps={[
          { title: 'Log in to your Nomupay Dashboard', text: 'Use the credentials we issued you.' },
          { title: 'Open Pay By Link', text: 'Select Pay By Link in the left-hand menu, then Create New PayByLink.' },
          {
            title: 'Enter the payment details',
            text: 'The amount, the currency (GBP or EUR) and a customer reference. Add an expiry date if the link shouldn’t stay open.',
          },
          { title: 'Choose the payment method', text: 'Under Payment Method, select OpenBanking.' },
          { title: 'Create and send the link', text: 'Select Create Link, then send the link to your customer.' },
        ]}
      />
      <p>
        Pay by Bank links work like any other Pay by link. To share, track or manage them, see{' '}
        <a href={PAY_BY_LINKS_URL} target="_blank" rel="noreferrer">
          Pay by Links
        </a>
        .
      </p>

      <Heading level={2} id="what-your-customer-sees">
        What your customer sees
      </Heading>
      <p>
        They open the link and pay in three steps, on a page from our partner Token.io. If your account offers cards on Pay by links too, they can
        choose to pay by card instead.
      </p>
      <JourneySteps steps={PAY_BY_BANK_JOURNEY} />

      <Heading level={2} id="next-steps">
        Next steps
      </Heading>
      <p>To take Pay by Bank at your own checkout, use the API.</p>
      <PathCards
        paths={[
          {
            href: '/open-banking/server-to-server',
            icon: ServerIcon,
            badge: 'API',
            title: 'Server to Server',
            text: 'Send the payment, send the shopper to their bank and get the result.',
            action: 'Try it on the test system',
          },
        ]}
      />
    </Article>
  )
}
