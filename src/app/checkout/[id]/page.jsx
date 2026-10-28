import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Script from 'next/script'

import { Button } from '@/components/Button'
import { Tag } from '@/components/Tag'
import { getBrand } from '@/lib/brands'
import { API_BASE_URL, IS_TEST, publicBase } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Checkout',
  robots: { index: false },
}

// Runs before paymentWidgets.js loads. The MB WAY tidy-up follows the knowledge base example.
function widgetOptions(brands) {
  return `var wpwlOptions = {
  style: "plain",
  locale: "en",
  onReady: function () {
    if (${JSON.stringify(brands.includes('MBWAY'))}) {
      document.querySelectorAll(".wpwl-form-virtualAccount-MBWAY .wpwl-group-customerEmail").forEach(function (el) { el.remove() });
      document.querySelectorAll(".wpwl-form-virtualAccount-MBWAY > .wpwl-label").forEach(function (el) {
        if (/\\bou\\b/.test(el.textContent || "")) el.remove();
      });
    }
  }
};`
}

export default async function CheckoutPage({ params, searchParams }) {
  let { id } = await params
  let query = await searchParams
  if (!/^[0-9A-Za-z.\-]{10,64}$/.test(id)) notFound()

  let brands = String(query.brands || '')
    .split(/\s+/)
    .map((code) => getBrand(code)?.code)
    .filter(Boolean)
  if (!brands.length) notFound()
  let integrity = /^sha(256|384|512)-[A-Za-z0-9+/=]+$/.test(query.integrity || '') ? query.integrity : null
  let amount = /^\d{1,9}\.\d{2}$/.test(query.amount || '') ? query.amount : null
  let currency = /^[A-Z]{3}$/.test(query.currency || '') ? query.currency : null
  let base = publicBase({ headers: await headers() })

  return (
    <div className="mx-auto max-w-2xl pt-16 pb-10 lg:max-w-5xl">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Tag color={IS_TEST ? 'emerald' : 'amber'}>{IS_TEST ? 'TEST' : 'LIVE'}</Tag>
        <span className="h-0.5 w-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        <span className="font-mono text-xs text-zinc-400">paymentWidgets.js</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Checkout</h1>
      <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
        This is the page your shop would show. The payment form below is drawn by the COPYandPAY widget for checkout{' '}
        <code className="font-mono text-sm break-all text-zinc-900 dark:text-white">{id}</code>.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
        <section aria-label="Payment" className="min-w-0 rounded-2xl bg-white p-4 shadow-md ring-1 ring-zinc-900/7.5 sm:p-6 dark:ring-white/10">
          <script dangerouslySetInnerHTML={{ __html: widgetOptions(brands) }} />
          <form action={`${base}/copyandpay/return`} className="paymentWidgets" data-brands={brands.join(' ')} />
          <noscript>
            <p className="text-sm text-zinc-600">The payment form needs JavaScript.</p>
          </noscript>
        </section>

        <aside className="h-fit rounded-2xl p-5 ring-1 ring-zinc-900/7.5 dark:ring-white/10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-zinc-600 dark:text-zinc-400">Total</dt>
              <dd className="font-mono font-medium text-zinc-900 dark:text-white">
                {amount && currency ? `${amount} ${currency}` : '—'}
              </dd>
            </div>
            <div className="border-t border-zinc-900/5 pt-3 dark:border-white/5">
              <dt className="text-zinc-600 dark:text-zinc-400">Payment methods</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {brands.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/10 ring-inset dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/20"
                  >
                    {getBrand(code).name}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <Button href="/copyandpay#render-the-payment-form" variant="text" arrow="left">
              Back to the guide
            </Button>
          </div>
        </aside>
      </div>

      <Script
        src={`${API_BASE_URL}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
        {...(integrity ? { integrity, crossOrigin: 'anonymous' } : {})}
      />
    </div>
  )
}
