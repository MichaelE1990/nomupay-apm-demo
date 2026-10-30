'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AmountFields, BrandSelect, ErrorNote, Extras, RequiredFields, ResultSummary } from '@/components/builder'
import { CodeWindow, SendButton } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { StatusBadge } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightJs, highlightJson } from '@/lib/highlight'
import { RETURN_MESSAGE, redirectMethod, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { buildPaymentParams, cartTotal } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.s2s.v3'
const INITIAL = {
  form: {
    brands: ['IDEAL_VA'],
    amount: '10.00',
    currency: 'EUR',
    merchantTransactionId: '',
    fields: {},
    extras: { customer: false, cart: false },
    cart: [{ name: 'Gift card', quantity: '1', price: '10.00' }],
  },
  payment: null,
  result: null,
  returned: false,
}

const PAYMENT_PATH = /^\/v1\/payments\/[0-9a-f]{32}$/

function withBrand(form, code, catalogue) {
  let b = catalogue.find((x) => x.code === code)
  if (!b) return form
  let fields = { ...form.fields }
  if (b.countryRequirement === 'M' && !b.countries.includes(fields['billing.country'])) fields['billing.country'] = b.countries[0]
  for (let f of b.fields) if (!fields[f.key] && f.sample) fields[f.key] = f.sample
  let currency = b.currencies.includes(form.currency) ? form.currency : b.currencies[0]
  return { ...form, brands: [code], fields, currency }
}

// True inside the payment drawer's frame or a payment popup (see the return page)
function isEmbedded() {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-embedded')
}

export function S2SFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [origin, setOrigin] = useState('https://your-site.example')
  let [drawerOpen, setDrawerOpen] = useState(false)
  let step3 = useRef(null)
  let autoChecked = useRef(false)

  useEffect(() => setOrigin(window.location.origin), [])

  let catalogue = (config?.brands || []).filter((b) => b.type === 'wallet')
  let form = state.form
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let brand = catalogue.find((b) => b.code === form.brands[0])
  let amount = form.extras.cart ? cartTotal(form.cart) : form.amount
  let shopperResultUrl = `${origin}/server-to-server/return`

  let previewParams = useMemo(() => {
    if (!config) return []
    return buildPaymentParams(
      { ...form, amount, flow: 's2s', merchantTransactionId: form.merchantTransactionId || '{generated}' },
      { entityId: config.entities?.wallet || '{entityId}', testMode: config.testMode, shopperResultUrl },
    )
  }, [config, form, amount, shopperResultUrl])

  let payment = state.payment
  let paymentId = payment?.response?.id
  let redirect = payment?.response?.redirect
  let returnResourcePath = search.get('resourcePath')
  let returnId = search.get('id')
  let resourcePath =
    (mode === 'return' && (returnResourcePath || (returnId ? `/v1/payments/${returnId}` : null))) || (paymentId ? `/v1/payments/${paymentId}` : null)

  async function checkStatus(path = resourcePath) {
    if (!path) return
    setBusy('status')
    setError({})
    try {
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(path)}&entity=wallet`)
      setState((s) => ({ ...s, result: data }))
    } catch (e) {
      setError({ status: e.message })
    } finally {
      setBusy('')
    }
  }

  // Back on the return page after a full-page redirect: read the result straight away.
  // Inside the drawer or a popup the opener does this instead.
  useEffect(() => {
    if (mode !== 'return' || autoChecked.current || !config?.configured || !ready || !resourcePath || isEmbedded()) return
    autoChecked.current = true
    checkStatus().then(() => step3.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, config, resourcePath, ready])

  // The return page in the drawer (or popup) posts here when the shopper is back
  let latest = useRef({})
  latest.current = { checkStatus, resourcePath }
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin || e.data?.type !== RETURN_MESSAGE) return
      let path = PAYMENT_PATH.test(e.data.resourcePath || '') ? e.data.resourcePath : latest.current.resourcePath
      setDrawerOpen(false)
      setState((s) => ({ ...s, returned: true }))
      latest.current.checkStatus(path).then(() => {
        setTimeout(() => step3.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [setState])

  async function sendPayment() {
    setBusy('payment')
    setError({})
    try {
      let data = await postJson('/api/payments', {
        ...form,
        amount,
        merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId(),
      })
      // Stay on step 1 so the response can be read; step 2 is ready below
      setState((s) => ({ ...s, payment: { ...data, at: new Date().toISOString() }, result: null, returned: false }))
    } catch (e) {
      setError({ payment: e.message })
    } finally {
      setBusy('')
    }
  }

  function openWindow() {
    setDrawerOpen(false)
    if (!sendShopperToPopup(redirect)) setError({ redirect: 'The browser blocked the new window. Allow pop-ups for this site, or use the drawer.' })
  }

  let apiHost = config?.apiHost || 'eu-test.oppwa.com'
  let requestCurl = config ? buildCurl({ url: `https://${apiHost}/v1/payments`, params: previewParams }) : ''
  let statusCurl = buildCurl({
    method: 'GET',
    url: `https://${apiHost}${resourcePath || '/v1/payments/{id}'}`,
    params: [['entityId', config?.entities?.wallet || '{entityId}']],
  })
  let snippet = redirectSnippet(redirect)
  let paidBrand = catalogue.find((b) => b.code === payment?.response?.paymentBrand)
  let paidBrandTitle = [paidBrand?.name || 'Payment page', payment?.response?.amount && `${payment.response.amount} ${payment.response.currency || ''}`]
    .filter(Boolean)
    .join(' · ')
  let paymentBadge = payment ? (
    <StatusBadge status={payment.status}>{payment.status === 'pending' ? 'Pending · redirect' : undefined}</StatusBadge>
  ) : null

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">
          Payment requests are off. Add <code>ENTITY_ID</code> and <code>ACCESS_TOKEN</code> in Vercel under Settings → Environment Variables, then redeploy.
        </Note>
      )}

      {/* Step 1 */}
      <Heading level={2} id="create-the-payment" step={1} tag="POST" label="/v1/payments">
        Create the payment
      </Heading>
      <Row>
        <Col>
          <p>
            Server-to-server sends one payment brand per request as <code>paymentBrand</code>. Your server collects any fields that brand needs, so
            pick one and fill in what it asks for.
          </p>
          <h3>Payment brand</h3>
          <BrandSelect id="s2s-brand" brands={catalogue} selected={form.brands} onChange={([code]) => setForm(withBrand(form, code, catalogue))} />
          <h3>Amount</h3>
          <AmountFields form={form} setForm={setForm} currencies={brand?.currencies || ['EUR']} cartDriven={form.extras.cart} idPrefix="s2s" />
          <h3>Fields for {brand?.name || 'this brand'}</h3>
          <RequiredFields form={form} setForm={setForm} catalogue={catalogue} idPrefix="s2s" />
          <h3>Extras</h3>
          <Extras form={form} setForm={setForm} idPrefix="s2s" />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label="/v1/payments"
            code={requestCurl}
            html={highlightCurl(requestCurl)}
            empty="Loading…"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendPayment} disabled={!config?.configured || !brand || busy === 'payment'}>
                  {busy === 'payment' ? 'Sending…' : 'Send request'}
                </SendButton>
                {payment && (
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => ({ ...INITIAL, form: s.form }))
                      setError({})
                    }}
                    className="ml-auto text-xs font-medium text-zinc-400 transition hover:text-white"
                  >
                    Start over
                  </button>
                )}
              </div>
            }
          />
          <ErrorNote message={error.payment} />
          <CodeWindow
            title="Response"
            status={paymentBadge}
            code={payment ? JSON.stringify(payment.response, null, 2) : ''}
            html={payment ? highlightJson(payment.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>

      <hr />

      {/* Step 2 */}
      <Heading level={2} id="redirect-the-shopper" step={2} label={redirect ? `${redirectMethod(redirect)} redirect.url` : 'redirect'}>
        Redirect the shopper
      </Heading>
      <Row>
        <Col>
          <p>
            A pending response carries a <code>redirect</code> object. Send the shopper to its <code>url</code> with its <code>parameters</code>,
            using the <code>method</code> it gives. Here the payment page opens in a drawer, so you stay on this page.
          </p>
          <Properties>
            <Property name="redirect.url" type="url">
              The payment brand&rsquo;s page the shopper goes to.
            </Property>
            <Property name="redirect.method" type="string">
              How to send them: <code>GET</code> or <code>POST</code>. When it&rsquo;s missing, use POST if there are parameters and GET if there
              aren&rsquo;t.
            </Property>
            <Property name="redirect.parameters" type="array">
              Name and value pairs to pass on unchanged: query parameters for GET, hidden form fields for POST.
            </Property>
            <Property name="shopperResultUrl" type="url">
              Your page the shopper comes back to. The gateway adds the payment <code>id</code> and <code>resourcePath</code> for step 3.
            </Property>
          </Properties>
          {paymentId && payment?.status === 'pending' && !redirect && (
            <Note>
              No redirect in this response: the shopper approves the payment in their app (for example MB WAY, or Bizum and Swish with a phone
              number). Check the result in step 3.
            </Note>
          )}
          {state.returned && <Note>The shopper came back to your shopperResultUrl. Step 3 has the result.</Note>}
        </Col>
        <Col sticky>
          <CodeWindow
            title="JavaScript"
            label="Redirect details from step 1"
            code={snippet}
            html={highlightJs(snippet)}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={() => setDrawerOpen(true)} disabled={!redirect}>
                  Redirect the shopper
                </SendButton>
                {redirect && (
                  <button type="button" onClick={openWindow} className="text-xs font-medium text-zinc-400 transition hover:text-white">
                    or open it in a new window
                  </button>
                )}
              </div>
            }
          />
          <ErrorNote message={error.redirect} />
        </Col>
      </Row>
      <PaymentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        redirect={redirect}
        title={paidBrandTitle}
        onOpenWindow={openWindow}
      />

      <hr />

      {/* Step 3 */}
      <div ref={step3} className="scroll-mt-24" />
      <Heading level={2} id="get-the-payment-result" step={3} tag="GET" label={resourcePath || '/v1/payments/{id}'}>
        Get the payment result
      </Heading>
      <Row>
        <Col>
          <p>
            Request the payment with your <code>entityId</code>. APMs often stay pending for a while after the shopper returns; check again, or
            rely on the webhook in production.
          </p>
          <ResultSummary result={state.result} emptyText={resourcePath ? 'Not checked yet.' : 'Comes after step 1.'} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="GET"
            label={resourcePath || '/v1/payments/{id}'}
            code={statusCurl}
            html={highlightCurl(statusCurl)}
            footer={
              <SendButton onClick={() => checkStatus()} disabled={!resourcePath || busy === 'status' || !config?.configured}>
                {busy === 'status' ? 'Checking…' : state.result ? 'Check again' : 'Check status'}
              </SendButton>
            }
          />
          <ErrorNote message={error.status} />
          <CodeWindow
            title="Response"
            status={state.result ? <StatusBadge status={state.result.status} /> : null}
            code={state.result ? JSON.stringify(state.result.response, null, 2) : ''}
            html={state.result ? highlightJson(state.result.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>
    </>
  )
}
