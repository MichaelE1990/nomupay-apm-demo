'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/Button'
import { AmountFields, ErrorNote, Extras, PaymentMethodPicker, RequiredFields, ResultSummary } from '@/components/builder'
import { CodeWindow, SendButton } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { Label, StatusBadge, TextInput } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightHtml, highlightJson } from '@/lib/highlight'
import { REPEAT_PAYMENT_PARAMS, buildPaymentParams, cartTotal, usesCard, usesWallet } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.copyandpay.v2'
const INITIAL = {
  form: {
    brands: ['IDEAL_VA', 'BCMC_VA'],
    amount: '10.00',
    currency: 'EUR',
    merchantTransactionId: '',
    fields: {},
    extras: { customer: false, cart: false, saveDetails: false },
    cart: [{ name: 'Gift card', quantity: '1', price: '10.00' }],
  },
  checkout: null,
  result: null,
  repeat: null,
  repeatForm: { amount: '10.00', currency: 'EUR' },
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
  let step2 = useRef(null)
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
      setState((s) => ({
        ...s,
        checkout: { ...data, sent: { brands: form.brands, amount, currency: form.currency, saveDetails: form.extras.saveDetails }, at: new Date().toISOString() },
        result: null,
        repeat: null,
        repeatForm: { amount, currency: form.currency },
      }))
      if (data.response?.id) setTimeout(() => step2.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
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

  let registrationId = state.result?.response?.registrationId
  async function payAgain() {
    setBusy('repeat')
    setError({})
    try {
      let data = await postJson(`/api/registrations/${registrationId}/payments`, { ...state.repeatForm, entity: checkout?.entity || 'card' })
      setState((s) => ({ ...s, repeat: data }))
    } catch (e) {
      setError({ repeat: e.message })
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

  let statusCurl = resourcePath
    ? buildCurl({ method: 'GET', url: `https://${config?.apiHost || ''}${resourcePath}`, params: [['entityId', config?.entities?.[checkout?.entity || 'wallet'] || '{entityId}']] })
    : ''
  let repeatParams = [
    ['entityId', config?.entities?.[checkout?.entity || 'card'] || '{entityId}'],
    ['amount', state.repeatForm.amount],
    ['currency', state.repeatForm.currency],
    ['paymentType', 'DB'],
    ...REPEAT_PAYMENT_PARAMS,
  ]
  let repeatCurl = buildCurl({ url: `https://${config?.apiHost || ''}/v1/registrations/${registrationId || '{registrationId}'}/payments`, params: repeatParams })
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
      <Heading level={2} id="prepare-the-checkout" tag="POST" label="/v1/checkouts">
        Prepare the checkout
      </Heading>
      <Row>
        <Col>
          <p>
            Add the payment methods you want in your checkout, set the amount, and add any extras. The request on the right updates as you go;
            send it and the response appears underneath.
          </p>
          <h3>Payment methods</h3>
          <PaymentMethodPicker
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
              {walletOnCardEntity ? ' NomuPay Wallets methods appear only if that entity has them too.' : ''}
            </Note>
          )}
          <h3>Amount</h3>
          <AmountFields form={form} setForm={setForm} currencies={currenciesFor(form.brands, catalogue)} cartDriven={form.extras.cart} idPrefix="cp" />
          <h3>Required by your payment methods</h3>
          <RequiredFields form={form} setForm={setForm} catalogue={catalogue} idPrefix="cp" />
          <h3>Extras</h3>
          <Extras
            form={form}
            setForm={setForm}
            allowSave
            saveHint={cardSelected ? 'Step 4 then charges the saved details again.' : 'Most useful with cards: add Visa or Mastercard above.'}
            idPrefix="cp"
          />
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
                <span className="text-xs text-zinc-400">The access token stays on the server. Entity ID shown masked.</span>
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
            empty="Send the request to see the response. The id in it is your checkout ID for step 2."
          />
        </Col>
      </Row>

      <hr />

      {/* Step 2 */}
      <div ref={step2} className="scroll-mt-24" />
      <Heading level={2} id="render-the-payment-form" label="paymentWidgets.js">
        Render the payment form
      </Heading>
      <Row>
        <Col>
          <p>
            Take the <code>id</code> from the response and load the payment widget with it as <code>checkoutId</code>. The form&rsquo;s{' '}
            <code>action</code> is your result page (the <code>shopperResultUrl</code>), and <code>data-brands</code> lists the payment methods to show.
          </p>
          <Properties>
            <Property name="checkoutId" type="string">
              {checkoutId ? <code>{checkoutId}</code> : 'Comes from step 1.'}
            </Property>
            <Property name="integrity" type="string">
              {checkout?.response?.integrity ? 'Returned because the request sent integrity=true. Add it to the script tag.' : 'Returned when the request sends integrity=true.'}
            </Property>
            <Property name="data-brands" type="string">
              <code>{widgetBrands || '—'}</code>
            </Property>
            <Property name="action" type="url">
              <code>{returnUrl}</code>. The widget adds <code>id</code> and <code>resourcePath</code> when it sends the shopper back.
            </Property>
          </Properties>
          <div className="not-prose flex flex-wrap items-center gap-3">
            {checkoutHref ? (
              <a
                href={checkoutHref}
                className="inline-flex justify-center gap-0.5 overflow-hidden rounded-full bg-zinc-900 px-3 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400"
              >
                Open the checkout
              </a>
            ) : (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Send step 1 first.</span>
            )}
          </div>
        </Col>
        <Col sticky>
          <CodeWindow title="HTML" label="checkout page" code={widgetSnippet} html={highlightHtml(widgetSnippet)} />
        </Col>
      </Row>

      <hr />

      {/* Step 3 */}
      <div ref={step3} className="scroll-mt-24" />
      <Heading level={2} id="get-the-payment-result" tag="GET" label={resourcePath || '/v1/checkouts/{id}/payment'}>
        Get the payment result
      </Heading>
      <Row>
        <Col>
          <p>
            When the shopper finishes, the widget sends them to your result page with <code>id</code> and <code>resourcePath</code>. Request the{' '}
            <code>resourcePath</code> with your <code>entityId</code> to get the outcome. For pending APMs, check again or wait for the webhook.
          </p>
          <ResultSummary result={state.result} emptyText={resourcePath ? 'Not checked yet.' : 'Comes after the shopper completes the checkout.'} />
          <div className="not-prose mt-6 flex flex-wrap items-center gap-3">
            <Button variant="filled" onClick={checkStatus} disabled={!resourcePath || busy === 'status' || !config?.configured} className="disabled:cursor-not-allowed disabled:opacity-50">
              {busy === 'status' ? 'Checking…' : state.result ? 'Check again' : 'Check status'}
            </Button>
          </div>
          <ErrorNote message={error.status} />
        </Col>
        <Col sticky>
          <CodeWindow title="Request" tag="GET" label={resourcePath || '/v1/checkouts/{id}/payment'} code={statusCurl} html={highlightCurl(statusCurl)} empty="Available once a checkout exists." />
          <CodeWindow
            title="Response"
            status={state.result ? <StatusBadge status={state.result.status} /> : null}
            code={state.result ? JSON.stringify(state.result.response, null, 2) : ''}
            html={state.result ? highlightJson(state.result.response) : ''}
            empty="Check the status to see the response."
          />
        </Col>
      </Row>

      <hr />

      {/* Step 4 */}
      <Heading level={2} id="pay-again-with-saved-details" tag="POST" label="/v1/registrations/{id}/payments">
        Pay again with saved details
      </Heading>
      <Row>
        <Col>
          <p>
            With <strong>Save payment details</strong> on, the result includes a <code>registrationId</code>. Charge it again without the shopper
            re-entering anything: a customer-initiated repeat payment sends <code>standingInstruction.mode=REPEATED</code>.
          </p>
          {registrationId ? (
            <>
              <Properties>
                <Property name="registrationId" type="string">
                  <code>{registrationId}</code>
                </Property>
              </Properties>
              <div className="not-prose grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rp-amount">
                    <code className="font-mono text-xs">amount</code>
                  </Label>
                  <TextInput id="rp-amount" value={state.repeatForm.amount} onChange={(e) => setState((s) => ({ ...s, repeatForm: { ...s.repeatForm, amount: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor="rp-currency">
                    <code className="font-mono text-xs">currency</code>
                  </Label>
                  <TextInput id="rp-currency" value={state.repeatForm.currency} onChange={(e) => setState((s) => ({ ...s, repeatForm: { ...s.repeatForm, currency: e.target.value.toUpperCase() } }))} />
                </div>
              </div>
              <ResultSummary result={state.repeat} emptyText="" />
              <ErrorNote message={error.repeat} />
            </>
          ) : (
            <Note>
              Turn on <strong>Save payment details</strong> in step 1, pay with a card, and check the result. The <code>registrationId</code> appears here.
            </Note>
          )}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={`/v1/registrations/${registrationId || '{id}'}/payments`}
            code={repeatCurl}
            html={highlightCurl(repeatCurl)}
            footer={
              <SendButton onClick={payAgain} disabled={!registrationId || busy === 'repeat'}>
                  {busy === 'repeat' ? 'Sending…' : 'Send request'}
                </SendButton>
            }
          />
          <CodeWindow
            title="Response"
            status={state.repeat ? <StatusBadge status={state.repeat.status} /> : null}
            code={state.repeat ? JSON.stringify(state.repeat.response, null, 2) : ''}
            html={state.repeat ? highlightJson(state.repeat.response) : ''}
            empty="Send the request to see the response."
          />
        </Col>
      </Row>
    </>
  )
}

