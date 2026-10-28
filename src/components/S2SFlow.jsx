'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/Button'
import { AmountFields, ErrorNote, Extras, PaymentMethodPicker, RequiredFields, ResultSummary } from '@/components/builder'
import { CodeWindow, SendButton } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { StatusBadge } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightJs, highlightJson } from '@/lib/highlight'
import { redirectMethod, redirectShopper, redirectSnippet } from '@/lib/redirect'
import { buildPaymentParams, cartTotal } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.s2s.v2'
const INITIAL = {
  form: {
    brands: ['IDEAL_VA'],
    amount: '10.00',
    currency: 'EUR',
    merchantTransactionId: '',
    fields: {},
    extras: { customer: false, cart: false, saveDetails: false },
    cart: [{ name: 'Gift card', quantity: '1', price: '10.00' }],
  },
  payment: null,
  result: null,
}

function withBrand(form, code, catalogue) {
  let b = catalogue.find((x) => x.code === code)
  if (!b) return form
  let fields = { ...form.fields }
  if (b.countryRequirement === 'M' && !b.countries.includes(fields['billing.country'])) fields['billing.country'] = b.countries[0]
  for (let f of b.fields) if (!fields[f.key] && f.sample) fields[f.key] = f.sample
  let currency = b.currencies.includes(form.currency) ? form.currency : b.currencies[0]
  return { ...form, brands: [code], fields, currency }
}

export function S2SFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [origin, setOrigin] = useState('https://your-site.example')
  let step2 = useRef(null)
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
      { ...form, amount, flow: 's2s', merchantTransactionId: form.merchantTransactionId || '{generated}', extras: { ...form.extras, saveDetails: false } },
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

  useEffect(() => {
    if (mode !== 'return' || autoChecked.current || !config?.configured || !ready || !resourcePath) return
    autoChecked.current = true
    checkStatus().then(() => step3.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, config, resourcePath, ready])

  async function sendPayment() {
    setBusy('payment')
    setError({})
    try {
      let data = await postJson('/api/payments', {
        ...form,
        amount,
        extras: { ...form.extras, saveDetails: false },
        merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId(),
      })
      setState((s) => ({ ...s, payment: { ...data, at: new Date().toISOString() }, result: null }))
      if (data.response?.id) setTimeout(() => step2.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch (e) {
      setError({ payment: e.message })
    } finally {
      setBusy('')
    }
  }

  async function checkStatus() {
    if (!resourcePath) return
    setBusy('status')
    setError({})
    try {
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(resourcePath)}&entity=wallet`)
      setState((s) => ({ ...s, result: data }))
    } catch (e) {
      setError({ status: e.message })
    } finally {
      setBusy('')
    }
  }

  let requestCurl = config ? buildCurl({ url: `https://${config.apiHost}/v1/payments`, params: previewParams }) : ''
  let statusCurl = resourcePath
    ? buildCurl({ method: 'GET', url: `https://${config?.apiHost || ''}${resourcePath}`, params: [['entityId', config?.entities?.wallet || '{entityId}']] })
    : ''
  let snippet = redirect ? redirectSnippet(redirect) : ''
  let redirectParams = Array.isArray(redirect?.parameters) ? redirect.parameters : []
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
      <Heading level={2} id="create-the-payment" tag="POST" label="/v1/payments">
        Create the payment
      </Heading>
      <Row>
        <Col>
          <p>
            Server-to-server sends one payment method per request as <code>paymentBrand</code>. Your server collects any fields that method
            needs, so pick one and fill in what it asks for.
          </p>
          <h3>Payment method</h3>
          <PaymentMethodPicker
            brands={catalogue}
            selected={form.brands}
            allowCards={false}
            currency={form.currency}
            onChange={([code]) => setForm(withBrand(form, code, catalogue))}
          />
          <h3>Amount</h3>
          <AmountFields form={form} setForm={setForm} currencies={brand?.currencies || ['EUR']} cartDriven={form.extras.cart} idPrefix="s2s" />
          <h3>Required by {brand?.name || 'this method'}</h3>
          <RequiredFields form={form} setForm={setForm} catalogue={catalogue} idPrefix="s2s" />
          <h3>Extras</h3>
          <Extras form={form} setForm={setForm} allowSave={false} saveHint="Saved details run through COPYandPAY in this demo." idPrefix="s2s" />
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
                <span className="text-xs text-zinc-400">The access token stays on the server. Entity ID shown masked.</span>
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
            empty="Send the request to see the response. Pending payments come back with a redirect for step 2."
          />
        </Col>
      </Row>

      <hr />

      {/* Step 2 */}
      <div ref={step2} className="scroll-mt-24" />
      <Heading level={2} id="redirect-the-shopper" label={redirect ? `${redirectMethod(redirect)} redirect.url` : 'redirect'}>
        Redirect the shopper
      </Heading>
      <Row>
        <Col>
          <p>
            A pending response carries a <code>redirect</code> object. Send the shopper to <code>redirect.url</code> with the{' '}
            <code>parameters</code>, using the <code>method</code> it gives. When they finish, the gateway returns them to your{' '}
            <code>shopperResultUrl</code> with the payment <code>id</code>.
          </p>
          {redirect ? (
            <>
              <Properties>
                <Property name="redirect.url" type="url">
                  <span className="break-all">{redirect.url}</span>
                </Property>
                <Property name="redirect.method" type="string">
                  {redirectMethod(redirect)}
                  {!redirect.method ? ' (not given, so the demo picks it from the parameters)' : ''}
                </Property>
                <Property name="redirect.parameters" type="array">
                  {redirectParams.length ? `${redirectParams.length} to pass on: ${redirectParams.map((p) => p.name).join(', ')}` : 'None'}
                </Property>
                <Property name="shopperResultUrl" type="url">
                  <code>{shopperResultUrl}</code>
                </Property>
              </Properties>
              <div className="not-prose">
                <Button variant="filled" arrow="right" onClick={() => redirectShopper(redirect)}>
                  Redirect the shopper
                </Button>
              </div>
            </>
          ) : paymentId && payment?.status === 'pending' ? (
            <Note>
              No redirect in this response: the shopper approves the payment in their app (for example MB WAY or Bizum by phone number). Check
              the result in step 3.
            </Note>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Comes after a pending response in step 1.</p>
          )}
        </Col>
        <Col sticky>
          <CodeWindow title="JavaScript" label="redirect the shopper" code={snippet} html={highlightJs(snippet)} empty="The redirect snippet appears once step 1 returns a redirect." />
        </Col>
      </Row>

      <hr />

      {/* Step 3 */}
      <div ref={step3} className="scroll-mt-24" />
      <Heading level={2} id="get-the-payment-result" tag="GET" label={resourcePath || '/v1/payments/{id}'}>
        Get the payment result
      </Heading>
      <Row>
        <Col>
          <p>
            Request the payment with your <code>entityId</code>. APMs often stay pending for a while after the shopper returns; check again, or
            rely on the webhook in production.
          </p>
          <ResultSummary result={state.result} emptyText={resourcePath ? 'Not checked yet.' : 'Comes after step 1.'} />
          <div className="not-prose mt-6 flex flex-wrap items-center gap-3">
            <Button variant="filled" onClick={checkStatus} disabled={!resourcePath || busy === 'status' || !config?.configured} className="disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'status' ? 'Checking…' : state.result ? 'Check again' : 'Check status'}
            </Button>
          </div>
          <ErrorNote message={error.status} />
        </Col>
        <Col sticky>
          <CodeWindow title="Request" tag="GET" label={resourcePath || '/v1/payments/{id}'} code={statusCurl} html={highlightCurl(statusCurl)} empty="Available once a payment exists." />
          <CodeWindow
            title="Response"
            status={state.result ? <StatusBadge status={state.result.status} /> : null}
            code={state.result ? JSON.stringify(state.result.response, null, 2) : ''}
            html={state.result ? highlightJson(state.result.response) : ''}
            empty="Check the status to see the response."
          />
        </Col>
      </Row>
    </>
  )
}
