import { Article } from '@/components/Article'
import { Button } from '@/components/Button'
import { CodeWindow } from '@/components/CodeWindow'
import { Properties, Property } from '@/components/content'
import { Guides } from '@/components/Guides'
import { Heading } from '@/components/Heading'
import { HeroPattern } from '@/components/HeroPattern'
import { requestCode } from '@/lib/highlight'

export const metadata = {
  title: 'Overview',
}

// Help Centre: where merchants find their credentials in the Nomupay Dashboard
const CREDENTIALS_URL = 'https://support.nomupay.com/hc/en-gb/articles/8918887969297-Credential-Management'

const example = requestCode({
  method: 'GET',
  url: 'https://eu-test.oppwa.com/v1/payments/{id}',
  params: [['entityId', '{entity_id}']],
})

export default function Home() {
  return (
    <Article>
      <HeroPattern />
      <h1>Nomupay Payment Methods</h1>
      <p className="lead">
        Try the payment methods merchants can offer through Nomupay, the way a merchant integrates them. Build each request, see exactly what’s
        sent, send it to the test gateway, and use the response in the next step.
      </p>

      <Heading level={2} id="getting-started">
        Getting started
      </Heading>
      <p className="lead">
        To get started, retrieve your test credentials from the Credentials section of your Nomupay Dashboard account. Every request to the gateway
        carries them, and the guides below show where each one goes. When your integration is ready to go live, swap in your live credentials.
      </p>
      <div className="not-prose mt-6 mb-16">
        <Button href={CREDENTIALS_URL} target="_blank" rel="noreferrer" variant="text" arrow="right">
          Retrieve your Test Credentials
        </Button>
      </div>

      <Heading level={2} id="credentials">
        Credentials
      </Heading>
      <p>
        Your credentials identify your merchant account and authenticate your requests. There are two, and every request to the gateway needs both.
      </p>
      <Properties>
        <Property name="entityId" type="string">
          Identifies your merchant entity. Send it as a parameter with every request: in the body of a POST, or the query of a GET.
        </Property>
        <Property name="Authorization" type="header">
          Your access token, sent in the Authorization header with the Bearer scheme.
        </Property>
      </Properties>
      <p>Here’s how to send both:</p>
      <CodeWindow title="Example request" variants={example} lineNumbers />
      <p>
        Send test requests to eu-test.oppwa.com with your test credentials. Live requests go to eu-prod.oppwa.com with your live credentials.
      </p>
      <p>
        Keep your access token on your server and never expose it in a browser or app. Only Dashboard users with High Level access can view
        credentials, and only once, so copy and store them securely. If yours are no longer visible, contact help@nomupay.com with your full name
        and email address to have them reactivated.
      </p>

      <Guides />
    </Article>
  )
}
