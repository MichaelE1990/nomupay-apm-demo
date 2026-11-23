import { Heading } from '@/components/Heading'
import { BankIcon, Callout, LinkIcon, ReceiptIcon, SettingColumns } from '@/components/openBanking'
import { SETTINGS_FORM_URL, SUPPORT_EMAIL } from '@/lib/openBanking'

// The account settings, from the Help Centre's Account Setup article. The Word form in
// public/downloads lists the same settings (scripts/settings-form.cjs builds it).
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

// The last section of the Integration page (and its return page)
export function OpenBankingSettings() {
  return (
    <>
      <hr />
      <Heading level={2} id="account-settings">
        Account settings
      </Heading>
      <p>
        How you can set up Pay by Bank for your business. We configure these during onboarding, and the{' '}
        <a href={SETTINGS_FORM_URL} download>
          settings form
        </a>{' '}
        (Word) helps you prepare them.
      </p>
      <SettingColumns groups={GROUPS} />
      <Callout title="Changing a setting">
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the setting you’d like to change and its new value.
      </Callout>
    </>
  )
}
