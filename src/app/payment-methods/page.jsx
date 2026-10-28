import { Article } from '@/components/Article'
import { Note } from '@/components/content'
import { ReqTag } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { BRANDS } from '@/lib/brands'

export const metadata = {
  title: 'Payment methods',
  description: 'Every payment method in the demo, with its countries, currencies, timeout and the fields it needs.',
}

const GROUPS = [
  {
    id: 'cards',
    region: 'Cards',
    title: 'Cards',
    intro: 'Cards run through the COPYandPAY widget on the card entity (CARD_ENTITY_ID, or ENTITY_ID when that isn’t set). Turn on Save payment details to get a registrationId back.',
  },
  {
    id: 'europe',
    region: 'Europe',
    title: 'Europe',
    intro: 'NomuPay Wallets methods processed by PPRO. On the test system they run against the PPRO simulator with testMode=EXTERNAL.',
  },
  {
    id: 'international',
    region: 'International',
    title: 'International',
    intro: 'NomuPay Wallets methods outside the European schemes. Most need billing.country to pick the market.',
  },
]

const statusStyles = {
  Certified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  Certification: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20',
  Card: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-400 dark:ring-sky-400/20',
}
const statusText = { Certified: 'Certified', Certification: 'In certification', Card: 'Card' }

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${statusStyles[status] || statusStyles.Card}`}>
      {statusText[status] || status}
    </span>
  )
}

function list(values, max) {
  if (!values.length) return 'Any'
  return values.length > max ? `${values.slice(0, max).join(' ')} +${values.length - max}` : values.join(' ')
}

function Fields({ brand }) {
  let rows = [...(brand.countryRequirement === 'M' ? [{ key: 'billing.country', req: 'M' }] : []), ...brand.fields]
  if (!rows.length) return <span className="text-zinc-400 dark:text-zinc-500">None</span>
  return (
    <ul role="list" className="space-y-1.5">
      {rows.map((f) => (
        <li key={f.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <code className="font-mono text-xs break-all text-zinc-900 dark:text-white">{f.key}</code>
          <ReqTag req={f.req} />
        </li>
      ))}
    </ul>
  )
}

function MethodTable({ brands, isCards }) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
      <table className="min-w-full divide-y divide-zinc-900/7.5 text-left text-sm dark:divide-white/10">
        <thead className="bg-zinc-50 dark:bg-white/2.5">
          <tr>
            <th scope="col" className="py-3 pr-3 pl-4 font-semibold text-zinc-900 sm:pl-5 dark:text-white">
              Method
            </th>
            {!isCards && (
              <th scope="col" className="hidden px-3 py-3 font-semibold text-zinc-900 lg:table-cell dark:text-white">
                Countries
              </th>
            )}
            <th scope="col" className="hidden px-3 py-3 font-semibold text-zinc-900 sm:table-cell dark:text-white">
              Currencies
            </th>
            {!isCards && (
              <th scope="col" className="hidden px-3 py-3 font-semibold text-zinc-900 md:table-cell dark:text-white">
                Timeout
              </th>
            )}
            <th scope="col" className="px-3 py-3 font-semibold text-zinc-900 dark:text-white">
              {isCards ? 'Flow' : 'Fields'}
            </th>
            <th scope="col" className="hidden py-3 pr-4 pl-3 text-right font-semibold text-zinc-900 sm:table-cell sm:pr-5 dark:text-white">
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">
          {brands.map((b) => (
            <tr key={b.code}>
              <td className="py-4 pr-3 pl-4 align-top sm:pl-5">
                <div className="font-medium text-zinc-900 dark:text-white">{b.name}</div>
                <div className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">{b.code}</div>
                <dl className="mt-2 space-y-1 text-xs text-zinc-500 sm:hidden dark:text-zinc-400">
                  <dt className="sr-only">Status</dt>
                  <dd>
                    <StatusPill status={b.status} />
                  </dd>
                  <dt className="sr-only">Currencies</dt>
                  <dd className="font-mono">{list(b.currencies, 6)}</dd>
                  {!isCards && (
                    <>
                      <dt className="sr-only">Timeout</dt>
                      <dd>Timeout {b.timeout}</dd>
                    </>
                  )}
                </dl>
              </td>
              {!isCards && (
                <td className="hidden max-w-48 px-3 py-4 align-top font-mono text-xs text-zinc-600 lg:table-cell dark:text-zinc-400">
                  {list(b.countries, 6)}
                </td>
              )}
              <td className="hidden max-w-40 px-3 py-4 align-top font-mono text-xs text-zinc-600 sm:table-cell dark:text-zinc-400">
                {list(b.currencies, 6)}
              </td>
              {!isCards && <td className="hidden px-3 py-4 align-top whitespace-nowrap text-zinc-600 md:table-cell dark:text-zinc-400">{b.timeout}</td>}
              <td className="px-3 py-4 align-top text-zinc-600 dark:text-zinc-400">
                {isCards ? <span className="text-sm">COPYandPAY only</span> : <Fields brand={b} />}
                {b.note && <p className="mt-2 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">{b.note}</p>}
              </td>
              <td className="hidden py-4 pr-4 pl-3 text-right align-top sm:table-cell sm:pr-5">
                <StatusPill status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PaymentMethodsPage() {
  return (
    <Article>
      <h1>Payment methods</h1>
      <p className="lead">
        What each method supports and what it needs in the request. The guides add the mandatory fields for you; this page is the reference
        behind them.
      </p>
      <Note>
        Methods marked <strong>In certification</strong> are still being certified with PPRO, so they may not be enabled on your entity yet.
        A <code>600.200.500</code> or an instant <code>800.100.152</code> usually means the method isn&rsquo;t switched on for the merchant.
      </Note>
      {GROUPS.map((group) => {
        let brands = BRANDS.filter((b) => b.region === group.region)
        return (
          <section key={group.id}>
            <Heading level={2} id={group.id}>
              {group.title}
            </Heading>
            <p>{group.intro}</p>
            <MethodTable brands={brands} isCards={group.region === 'Cards'} />
          </section>
        )
      })}
    </Article>
  )
}
