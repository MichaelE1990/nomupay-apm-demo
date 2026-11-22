import { Article } from '@/components/Article'
import { Heading } from '@/components/Heading'
import { BankIcon, Callout, LinkIcon, ReceiptIcon, SettingColumns, StepList, UpNext } from '@/components/openBanking'
import { SALES_EMAIL, SUPPORT_EMAIL } from '@/lib/openBanking'

export const metadata = {
  title: 'Pay by Bank account setup',
  description: 'How to apply for Pay by Bank, and the settings Nomupay configures for your account.',
}

const mail = (address) => <a href={`mailto:${address}`}>{address}</a>

// The configuration settings, from the Help Centre's Account Setup article
const GROUPS = [
  {
    icon: BankIcon,
    title: 'Your business',
    items: [
      { term: 'Business name', details: 'Your business’s legal name.' },
      { term: 'Display name', details: 'The name shoppers see when they pay, on the page where they choose their bank.' },
      { term: 'Logo', details: 'Shown to shoppers when they choose Pay by Bank.' },
      { term: 'Domain name', details: 'The full address of the website you take payments on, such as https://www.mysite.co.uk/.' },
    ],
  },
  {
    icon: ReceiptIcon,
    title: 'Your payouts',
    items: [
      { term: 'Currencies', details: 'GBP, EUR or both.' },
      { term: 'Account details', details: 'Where we pay your funds: an account number and sort code for GBP, an IBAN for EUR.' },
    ],
  },
  {
    icon: LinkIcon,
    title: 'Your checkout',
    items: [
      { term: 'Integration type', details: 'Pay by link from your Nomupay Dashboard, or the API.' },
      { term: 'Pay by link payment methods', details: 'Pay by Bank only, or Pay by Bank and cards. For Pay by links only.' },
      { term: 'Default country', details: 'The country already selected when the shopper starts paying.' },
      { term: 'Destination countries', details: 'The countries shoppers can pay from.' },
    ],
  },
]

export default function AccountSetupPage() {
  return (
    <Article>
      <h1>Account setup</h1>
      <p className="lead">
        Pay by Bank has its own account set-up. Apply through our sales team, agree your settings during onboarding, and we’ll tell you when you
        can take payments.
      </p>

      <Heading level={2} id="apply">
        Apply for Pay by Bank
      </Heading>
      <StepList
        steps={[
          { title: 'Contact our sales team', text: <>Email {mail(SALES_EMAIL)} to start your application.</> },
          { title: 'Complete onboarding', text: 'Complete the Know Your Customer (KYC) checks, and agree the settings below with us.' },
          { title: 'Wait for confirmation', text: 'We confirm when your Pay by Bank account is active and ready to take payments.' },
          { title: 'Start taking payments', text: <>Send Pay by links from your Dashboard, or integrate the API. See <a href="/open-banking/integration">Integration</a>.</> },
        ]}
      />

      <Heading level={2} id="settings">
        Settings we configure
      </Heading>
      <p>We set these up for your account during onboarding, so have them ready to apply.</p>
      <SettingColumns groups={GROUPS} />
      <Callout title="Changing a setting">
        Email {mail(SUPPORT_EMAIL)} with the setting you’d like to change and its new value.
      </Callout>

      <UpNext
        href="/open-banking/integration"
        title="Integration"
        text="Choose how shoppers pay: Pay by links from your Dashboard, or the API at your checkout."
      />
    </Article>
  )
}
