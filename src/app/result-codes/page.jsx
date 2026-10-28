import { Article } from '@/components/Article'
import { Note } from '@/components/content'
import { StatusBadge } from '@/components/forms'
import { classify, RESULT_CODES } from '@/lib/codes'

export const metadata = {
  title: 'Result codes',
  description: 'The result codes you are most likely to see while testing, and how the demo classifies them.',
}

const statusName = { success: 'Successful', pending: 'Pending', failed: 'Failed' }

export default function ResultCodesPage() {
  return (
    <Article>
      <h1>Result codes</h1>
      <p className="lead">
        Every response carries <code>result.code</code> and <code>result.description</code>. These are the codes you&rsquo;re most likely to
        see while testing APMs and cards, with what they mean in practice.
      </p>

      <div className="not-prose my-6 overflow-hidden rounded-2xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
        <table className="min-w-full divide-y divide-zinc-900/7.5 text-left text-sm dark:divide-white/10">
          <thead className="bg-zinc-50 dark:bg-white/2.5">
            <tr>
              <th scope="col" className="py-3 pr-3 pl-4 font-semibold text-zinc-900 sm:pl-5 dark:text-white">
                Code
              </th>
              <th scope="col" className="px-3 py-3 font-semibold text-zinc-900 dark:text-white">
                Meaning
              </th>
              <th scope="col" className="hidden py-3 pr-4 pl-3 text-right font-semibold text-zinc-900 sm:table-cell sm:pr-5 dark:text-white">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">
            {RESULT_CODES.map((c) => {
              let status = c.example === '000.200.100' ? 'pending' : classify(c.example)
              return (
                <tr key={c.example}>
                  <td className="py-4 pr-3 pl-4 align-top whitespace-nowrap sm:pl-5">
                    <code className="font-mono text-xs font-medium text-zinc-900 dark:text-white">{c.example}</code>
                    <div className="mt-2 sm:hidden">
                      <StatusBadge status={status}>{statusName[status]}</StatusBadge>
                    </div>
                  </td>
                  <td className="px-3 py-4 align-top">
                    <div className="font-medium text-zinc-900 dark:text-white">{c.title}</div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{c.meaning}</p>
                  </td>
                  <td className="hidden py-4 pr-4 pl-3 text-right align-top sm:table-cell sm:pr-5">
                    <StatusBadge status={status}>{statusName[status]}</StatusBadge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 id="how-the-demo-reads-codes">How the demo reads codes</h2>
      <p>The badges in the guides come from two patterns from the gateway documentation. Anything that matches neither counts as failed.</p>
      <div className="not-prose my-6 overflow-hidden rounded-2xl bg-zinc-900 shadow-md dark:ring-1 dark:ring-white/10">
        <pre className="overflow-x-auto p-4 text-xs/5 text-white dark:bg-white/2.5">
          <code>
            <span style={{ color: 'var(--shiki-token-comment)' }}>{'// Successful'}</span>
            {'\n/^(000\\.000\\.|000\\.100\\.1|000\\.[36]|000\\.400\\.[1][12]0)/\n\n'}
            <span style={{ color: 'var(--shiki-token-comment)' }}>{'// Pending: the shopper still has to finish, or the bank hasn’t confirmed yet'}</span>
            {'\n/^(000\\.200|800\\.400\\.5|100\\.400\\.500)/'}
          </code>
        </pre>
      </div>
      <Note>
        For a declined APM, the useful detail is usually in <code>resultDetails</code>: <code>ConnectorReasonCode</code>,{' '}
        <code>ExtendedDescription</code> and, for a bad parameter, <code>ConnectorErrorField</code>.
      </Note>
    </Article>
  )
}
