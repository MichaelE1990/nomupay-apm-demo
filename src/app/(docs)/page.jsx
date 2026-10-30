import { Article } from '@/components/Article'
import { Button } from '@/components/Button'
import { Note, Properties, Property } from '@/components/content'
import { StatusBadge } from '@/components/forms'
import { Guides } from '@/components/Guides'
import { Heading } from '@/components/Heading'
import { HeroPattern } from '@/components/HeroPattern'
import { Resources } from '@/components/Resources'
import { publicConfig } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Introduction',
}

export default function Home() {
  let config = publicConfig()
  return (
    <Article>
      <HeroPattern />
      <h1>NomuPay APM Demo</h1>
      <p className="lead">
        Test payment brands and cards the way a merchant integrates them. Build a request, see exactly what gets sent, send it to
        the test gateway, and use the response in the next step.
      </p>
      <div className="not-prose mt-6 mb-16 flex flex-wrap gap-3">
        <Button href="/server-to-server" arrow="right">
          Server-to-server guide
        </Button>
        <Button href="/copyandpay" variant="outline">
          COPYandPAY guide
        </Button>
      </div>

      <Heading level={2} id="environment">
        Environment
      </Heading>
      <p className="lead">
        Requests go from this deployment&rsquo;s server to the gateway below. The access token never reaches the browser, and entity IDs are
        masked on screen.
      </p>
      {!config.configured && (
        <Note tone="amber">
          No credentials yet. Add <code>ENTITY_ID</code> and <code>ACCESS_TOKEN</code> in Vercel under Settings → Environment Variables, then
          redeploy. The pages still show every request; only sending is off.
        </Note>
      )}
      <Properties>
        <Property name="environment" type="string" badge={<StatusBadge status={config.environment === 'TEST' ? 'success' : 'pending'}>{config.environment}</StatusBadge>}>
          Set by <code>API_HOST</code>: anything with &ldquo;test&rdquo; in it is the test system.
        </Property>
        <Property name="apiHost" type="string">
          <code>{config.apiHost}</code>
        </Property>
        <Property name="testMode" type="string">
          {config.testMode ? (
            <>
              <code>{config.testMode}</code>, sent with payment brand requests so the PPRO simulator handles them.
            </>
          ) : (
            'Not sent.'
          )}
        </Property>
        <Property name="ENTITY_ID" type="string" badge={<StatusBadge status={config.configured ? 'success' : 'failed'}>{config.configured ? 'Set' : 'Missing'}</StatusBadge>}>
          {config.entities.wallet ? <code>{config.entities.wallet}</code> : 'Not set.'} Used for payment brands.
        </Property>
        <Property
          name="CARD_ENTITY_ID"
          type="string"
          badge={<StatusBadge status={config.entities.cardDedicated ? 'success' : 'neutral'}>{config.entities.cardDedicated ? 'Set' : 'Optional'}</StatusBadge>}
        >
          {config.entities.cardDedicated ? (
            <>
              <code>{config.entities.card}</code> is used whenever a checkout includes cards.
            </>
          ) : (
            'Not set, so cards use ENTITY_ID. Add CARD_ENTITY_ID (and CARD_ACCESS_TOKEN if it differs) to test cards on their own entity.'
          )}
        </Property>
      </Properties>

      <Guides />

      <Resources />
    </Article>
  )
}
