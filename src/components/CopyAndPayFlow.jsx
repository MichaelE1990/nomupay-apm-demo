'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AmountFields, BrandSelect, ErrorNote, Extras, RequiredFields, ResultSummary } from '@/components/builder'
import { CodeWindow, SendButton, SendLink } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { StatusBadge } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightHtml, highlightJson } from '@/lib/highlight'
import { buildPaymentParams, cartTotal, usesCard, usesWallet } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.copyandpay.v3'
const INITIAL = {
  form: {
    brands: ['IDEAL_VA', 'BCMC_VA'],
    amount: '10.00',
    currency: 'EUR',
    merchantTransactionId: '',
    fields: {},
    extras: { customer: false, cart: false },
    cart: [{ name: 'Gift card', quantity: '1', price: '10.00' }],
  },
  checkout: null,
  result: null,
}

function withBrandDefaults(form, brands, catalogue) {
  let fields = { ...form.fields }
  for (let code of brands) {
    let b = catalogue.find((x) => x.code === code)
    if (!b) continue
    if (b.countryRequirement === 'M' && !fields['billing.country']) fields['billing.country'] = b.countries[0]
    for (let f of b.fields) if (fields[f.key] === undefined && f.sample) fields[f.key] = f.sample
  }
  let currencies = currenciesFor(brands, catalogue)
  let currency = currencies.includes(form.currency) ? form.currency : currencies[0]
  return { ...form, brands, fields, currency }
}

function currenciesFor(brands, catalogue) {
  let list = []
  for (let code of brands) for (let c of catalogue.find((b) => b.code === code)?.currencies || []) if (!list.includes(c)) list.push(c)
  return list.length ? list : ['EUR']
}

export function CopyAndPayFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [origin, setOrigin] = useState('https://your-site.example')
  let step3 = useRef(null)
  let autoChecked = useRef(false)

  useEffect(() => setOrigin(window.location.origin), [])

  let catalogue = config?.brands || []
  let form = state.form
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let amount = form.extras.cart ? cartTotal(form.cart) : form.amount
  let cardSelected = usesCard(form.brands)
  let entityKind = cardSelected ? 'card' : 'wallet'

  let previewParams = useMemo(() => {
    if (!config) return []
    return buildPaymentParams(
      { ...form, amount, flow: 'copyandpay', merchantTransactionId: form.merchantTransactionId || '{generated}' },
      { entityId: config.entities?.[entityKind] || '{entityId}', testMode: config.testMode },
    )
  }, [config, form, amount, entityKind])

  let checkout = state.checkout
  let checkoutId = checkout?.response?.id
  let sent = checkout?.sent
  let returnResourcePath = search.get('resourcePath')
  let resourcePath = (mode === 'return' && returnResourcePath) || (checkoutId ? `/v1/checkouts/${checkoutId}/payment` : null)

  // Back from the payment page: read the result straight away
  useEffect(() => {
    if (mode !== 'return' || autoChecked.current || !config?.configured || !ready) return
    if (!resourcePath) return
    autoChecked.current = true
    checkStatus().then(() => step3.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, config, resourcePath, ready])

  async function sendCheckout() {
    setBusy('checkout')
    setError({})
    try {
      let data = await postJson('/api/checkouts', { ...form, amount, merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId() })
      // Stay on step 1 so the response can be read; step 2 is ready below
      setState((s) => ({
        ...s,
        checkout: { ...data, sent: { brands: form.brands, amount, currency: form.currency }, at: new Date().toISOString() },
        result: null,
      }))
    } catch (e) {
      setError({ checkout: e.message })
    } finally {
      setBusy('')
    }
  }

  async function checkStatus() {
    if (!resourcePath) return
    setBusy('status')
    setError({})
    try {
      let kind = checkout?.entity || 'wallet'
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(resourcePath)}&entity=${kind}`)
      setState((s) => ({ ...s, result: data }))
    } catch (e) {
      setError({ status: e.message })
    } finally {
      setBusy('')
    }
  }

  let returnUrl = `${origin}/copyandpay/return`
  let widgetBrands = (sent?.brands || form.brands).join(' ')
  let widgetSnippet = `<script>
  var wpwlOptions = { style: "plain", locale: "en" }
</script>
<script
  src="https://${config?.apiHost || 'eu-test.oppwa.com'}/v1/paymentWidgets.js?checkoutId=${checkoutId || '{checkout id}'}"${checkout?.response?.integrity ? `\n  integrity="${checkout.response.integrity}"\n  crossorigin="anonymous"` : ''}>
</script>

<form
  action="${returnUrl}"
  class="paymentWidgets"
  data-brands="${widgetBrands}">
</form>`
  let checkoutHref = checkoutId
    ? `/checkout/${encodeURIComponent(checkoutId)}?${new URLSearchParams({
        brands: widgetBrands,
        amount: sent?.amount || '',
        currency: sent?.currency || '',
        ...(checkout?.response?.integrity ? { integrity: checkout.response.integrity } : {}),
      })}`
    : null

  let statusCurl = buildCurl({
    method: 'GET',
    url: `https://${config?.apiHost || 'eu-test.oppwa.com'}${resourcePath || '/v1/checkouts/{id}/payment'}`,
    params: [['entityId', config?.entities?.[checkout?.entity || entityKind] || '{entityId}']],
  })
  let requestCurl = config ? buildCurl({ url: `https://${config.apiHost}/v1/checkouts`, params: previewParams }) : ''
  let walletOnCardEntity = cardSelected && usesWallet(form.brands) && config?.entities?.cardDedicated

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">
          Payment requests are off. Add <code>ENTITY_ID</code> and <code>ACCESS_TOKEN</code> in Vercel under Settings → Environment Variables, then redeploy.
        </Note>
      )}

      {/* Step 1 */}
      <Heading level={2} id="prepare-the-checkout" step={1} tag="POST" label="/v1/checkouts">
        Prepare the checkout
      </Heading>
      <Row>
        <Col>
          <p>
            Add the payment brands you want in your checkout, set the amount, and add any extras. The request on the right updates as you go;
            send it and the response appears underneath.
          </p>
          <h3>Payment brands</h3>
          <BrandSelect
            id="cp-brands"
            brands={catalogue}
            selected={form.brands}
            multiple
            currency={form.currency}
            onChange={(brands) => setForm(withBrandDefaults(form, brands, catalogue))}
          />
          {cardSelected && (
            <Note>
              Cards use the card entity{config?.entities?.cardDedicated ? ` (${config.entities.card})` : ', which is the main entity until CARD_ENTITY_ID is set'}. The
              widget only shows methods that are enabled on the entity used.
              {walletOnCardEntity ? ' The other payment brands appear only if that entity has them too.' : ''}
            </Note>
          )}
          <h3>Amount</h3>
          <AmountFields form={form} setForm={setForm} currencies={currenciesFor(form.brands, catalogue)} cartDriven={form.extras.cart} idPrefix="cp" />
          <h3>Fields for your payment brands</h3>
          <RequiredFields form={form} setForm={setForm} catalogue={catalogue} idPrefix="cp" />
          <h3>Extras</h3>
          <Extras form={form} setForm={setForm} idPrefix="cp" />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label="/v1/checkouts"
            code={requestCurl}
            html={highlightCurl(requestCurl)}
            empty="Loading…"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendCheckout} disabled={!config?.configured || !form.brands.length || busy === 'checkout'}>
                  {busy === 'checkout' ? 'Sending…' : 'Send request'}
                </SendButton>
                {checkout && (
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
          <ErrorNote message={error.checkout} />
          <CodeWindow
            title="Response"
            status={checkout ? <StatusBadge status={checkoutId ? 'success' : 'failed'}>{checkoutId ? 'Checkout created' : 'Not created'}</StatusBadge> : null}
            code={checkout ? JSON.stringify(checkout.response, null, 2) : ''}
            html={checkout ? highlightJson(checkout.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>

      <hr />

      {/* Step 2 */}
      <Heading level={2} id="render-the-payment-form" step={2} label="paymentWidgets.js">
        Render the payment form
      </Heading>
      <Row>
        <Col>
          <p>
            Take the <code>id</code> from the response and load the payment widget with it. The form&rsquo;s <code>action</code> is your result
            page, and <code>data-brands</code> lists the payment brands to show.
          </p>
          <Properties>
            <Property name="checkoutId" type="string">
              The <code>id</code> from the step 1 response, added to the <code>paymentWidgets.js</code> URL.
            </Property>
            <Property name="integrity" type="string">
              Returned when the request sends <code>integrity=true</code>. Add it to the script tag with <code>crossorigin=&quot;anonymous&quot;</code>.
            </Property>
            <Property name="data-brands" type="string">
              The payment brands to show in the widget, separated by spaces.
            </Property>
            <Property name="action" type="url">
              Your result page. The widget adds <code>id</code> and <code>resourcePath</code> when it sends the shopper back.
            </Property>
          </Properties>
        </Col>
        <Col sticky>
          <CodeWindow
            title="HTML"
            label="Checkout page"
            code={widgetSnippet}
            html={highlightHtml(widgetSnippet)}
            footer={<SendLink href={checkoutHref}>Open the checkout</SendLink>}
          />
        </Col>
      </Row>

      <hr />

      {/* Step 3 */}
      <div ref={step3} className="scroll-mt-24" />
      <Heading level={2} id="get-the-payment-result" step={3} tag="GET" label={resourcePath || '/v1/checkouts/{id}/payment'}>
        Get the payment result
      </Heading>
      <Row>
        <Col>
          <p>
            When the shopper finishes, the widget sends them to your result page with <code>id</code> and <code>resourcePath</code>. Request the{' '}
            <code>resourcePath</code> with your <code>entityId</code> to get the outcome. For pending APMs, check again or wait for the webhook.
          </p>
          <ResultSummary result={state.result} emptyText={resourcePath ? 'Not checked yet.' : 'Comes after the shopper completes the checkout.'} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="GET"
            label={resourcePath || '/v1/checkouts/{id}/payment'}
            code={statusCurl}
            html={highlightCurl(statusCurl)}
            footer={
              <SendButton onClick={checkStatus} disabled={!resourcePath || busy === 'status' || !config?.configured}>
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
