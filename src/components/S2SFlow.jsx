'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BrandFacts, BrandFieldRows, BrandSelect, CartEditor, ErrorNote, FixedValue, MissingFieldsHint, ParamRow } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { FieldBox, PanelStatus, ReqText, Toggle, bareInputClass } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import { SelectMenu } from '@/components/select'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightJs, highlightJson } from '@/lib/highlight'
import { RETURN_MESSAGE, redirectMethod, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { buildPaymentParams, cartSpec, cartTotal, fieldSpecs, missingFields, withBrandDefaults, withRequiredExtras } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.s2s.v6'
const INITIAL = {
  flow: { mode: 'async', tx: 'DB' },
  form: {
    brands: ['IDEAL_VA'],
    amount: '10.00',
    currency: 'EUR',
    merchantTransactionId: '',
    fields: { 'customer.givenName': 'Test' },
    extras: { customer: false, cart: false },
    cart: [{ name: 'Gift card', quantity: '1', price: '10.00', merchantItemId: 'item-001' }],
  },
  payment: null,
  result: null,
  capture: null,
  refund: null,
  amounts: { capture: '', refund: '' },
  returned: false,
}

// The gateway allows two status requests a minute for each server-to-server payment
const STATUS_LIMIT = 2
const STATUS_WINDOW_MS = 60000
const THROTTLED_TEXT = 'The gateway allows two status checks a minute for each payment.'

const HELP_CENTRE_URL = 'https://support.nomupay.com/hc/en-gb/articles/52156192050193-Ecommerce-Payment-Methods'
// Shown instead of the demo's own values: the request carries the real ones
const SHOPPER_RESULT_URL_SHOWN = 'https://demo/paymentresult'
const ENTITY_SHOWN = '{entity_id}'

// Payment flows and their transaction flows, as in the server-to-server guide on docs.oppwa.com
const MODES = [
  {
    value: 'async',
    title: 'Asynchronous payment',
    description: 'The shopper is redirected to the payment brand to verify and complete the payment, then returns to your shopperResultUrl.',
    flows: [
      { value: 'DB', title: 'Debit', types: ['DB'] },
      { value: 'PA', title: 'Pre-authorization + Capture', types: ['PA', 'CP'] },
    ],
  },
  {
    value: 'sync',
    title: 'Synchronous payment',
    description: 'No redirect. The request carries the shopper’s mobile number, and the shopper confirms the payment in the payment brand’s app.',
    flows: [{ value: 'DB', title: 'Debit', types: ['DB'] }],
  },
]

// Request parameter groups, named as in the parameters reference on docs.oppwa.com
const FIELD_GROUPS = [
  { id: 'customer', title: 'Customer', test: (k) => k.startsWith('customer.') },
  { id: 'billing', title: 'Billing address', test: (k) => k.startsWith('billing.') },
  { id: 'shipping', title: 'Shipping address', test: (k) => k.startsWith('shipping.') },
  { id: 'bank', title: 'Bank account', test: (k) => k.startsWith('bankAccount.') },
  { id: 'virtual', title: 'Virtual account', test: (k) => k.startsWith('virtualAccount.') },
  { id: 'custom', title: 'Custom parameters', test: (k) => k.startsWith('customParameters[') },
]
function groupOf(key) {
  if (key.startsWith('cart.')) return 'cart'
  return FIELD_GROUPS.find((g) => g.test(key))?.id || 'basic'
}

// What the status response carries: the OPPWA "Payment Response Parameters", with the
// resultDetails names from the NomuPay Wallets integration sheet ("Response field mapping").
// req: A = always there, C = only in some responses
function responseGroups(flow) {
  return [
    {
      title: 'Basic payment',
      rows: [
        ['id', 'A', 'The payment’s ID. Use it to request the status again, and for a capture or refund.'],
        ['paymentType', 'A', 'DB, PA, CP or RF: the type of the transaction you requested.'],
        ['paymentBrand', 'A', 'The payment brand of the request.'],
        ['amount', 'A', 'The amount approved by the payment brand.'],
        ['currency', 'A', 'The currency of the request.'],
        ['descriptor', 'C', 'The descriptor: the payment’s short ID followed by the merchant name.'],
        ['merchantTransactionId', 'C', 'Your reference, when the request sent one.'],
      ],
    },
    {
      title: 'Result',
      rows: [
        ['result.code', 'A', 'The result of the request, for example 000.100.112 for a successful test payment or 000.200.000 while pending.'],
        ['result.description', 'A', 'What the result code means.'],
        ...(flow.mode === 'async'
          ? [
              ['redirect.url', 'C', 'Only while the payment is pending: the payment brand’s page to send the shopper to.', 'url'],
              ['redirect.parameters', 'C', 'Only while the payment is pending: the name and value pairs to pass with the redirect.', 'array'],
            ]
          : []),
      ],
    },
    {
      title: 'Result details',
      rows: [
        ['resultDetails.ExtendedDescription', 'C', 'The payment brand’s status, or the reason it gave.'],
        ['resultDetails.ConnectorTxID1', 'C', 'The gateway’s ID for the transaction (the same as id).'],
        ['resultDetails.ConnectorTxID2', 'C', 'The payment brand’s ID for this transaction. A refund gets a new one.'],
        ['resultDetails.ConnectorTxID3', 'C', 'The payment brand’s ID for the payment. It stays the same for every transaction on the payment, so it links a refund to its payment.'],
        ['resultDetails.AcquirerResponse', 'C', 'The status the payment brand returned.'],
        ['resultDetails.ConnectorReasonCode', 'C', 'The payment brand’s reason code, for example succeeded, required_next_step, or why it declined.'],
        ['resultDetails.AcquirerTimestamp', 'C', 'When the payment brand processed the transaction.'],
        ['resultDetails.ConnectorErrorField', 'C', 'Only on errors: the request field the payment brand rejected.'],
        ['resultDetails.ConnectorErrorFieldDetails', 'C', 'Only on errors: why that field was rejected.'],
      ],
    },
    {
      title: 'Other',
      rows: [
        ['customer, billing, cart', 'C', 'The customer, billing and cart details, when the request sent them.', 'object'],
        ['buildNumber', 'A', 'The gateway build that handled the request. Useful for support.'],
        ['timestamp', 'A', 'When the response was generated.'],
        ['ndc', 'A', 'An internal unique identifier for the request.'],
      ],
    },
  ]
}

// Filled values in one line, for a closed group's header
const preview = (...values) =>
  values
    .flat()
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .join(' · ')

const valueAt = (obj, path) => {
  if (!obj) return undefined
  if (path.startsWith('resultDetails.')) return obj.resultDetails?.[path.slice(14)]
  let v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
  return typeof v === 'object' && v !== null ? JSON.stringify(v) : v
}

// Who sends what to whom in the chosen flow; numbered requests link to their step
function sequence(flow, steps) {
  let by = Object.fromEntries(steps.map((s) => [s.key, s]))
  let step = (key, extra) => ({ step: by[key].step, href: by[key].id, label: by[key].title, ...extra })
  if (flow.mode === 'sync')
    return [
      { from: 'shopper', to: 'server', label: 'Places the order' },
      { from: 'server', to: 'gateway', ...step('send', { detail: 'POST /v1/payments · DB' }) },
      { from: 'gateway', to: 'server', kind: 'response', label: 'Pending, no redirect' },
      { from: 'gateway', to: 'brand', label: 'Payment request', detail: 'customer.mobile' },
      { from: 'brand', kind: 'note', label: 'Shopper approves in the app' },
      { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
      { from: 'gateway', to: 'server', kind: 'response', label: 'Payment result' },
      { from: 'server', to: 'gateway', ...step('manage', { detail: 'POST /v1/payments/{id} · RF', optional: true }) },
    ]
  return [
    { from: 'shopper', to: 'server', label: 'Places the order' },
    { from: 'server', to: 'gateway', ...step('send', { detail: `POST /v1/payments · ${flow.tx}` }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Pending, with redirect' },
    { from: 'server', to: 'brand', ...step('redirect', { detail: 'redirect.url' }) },
    { from: 'brand', kind: 'note', label: 'Shopper verifies and approves the payment' },
    { from: 'brand', to: 'shopper', kind: 'response', label: 'Shopper returns to your shopperResultUrl' },
    { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Payment result' },
    flow.tx === 'PA' && { from: 'server', to: 'gateway', ...step('capture', { detail: 'POST /v1/payments/{id} · CP' }) },
    { from: 'server', to: 'gateway', ...step('manage', { detail: 'POST /v1/payments/{id} · RF', optional: true }) },
  ].filter(Boolean)
}

function eligibleBrands(catalogue, flow) {
  return catalogue.filter((b) => (flow.mode !== 'sync' || b.sync) && (flow.tx !== 'PA' || b.paymentTypes.includes('PA')))
}

function withBrand(form, code, catalogue, mode) {
  let b = catalogue.find((x) => x.code === code)
  if (!b) return form
  let currency = b.currencies.includes(form.currency) ? form.currency : b.currencies[0]
  let { mode: _mode, ...next } = withBrandDefaults({ ...form, mode }, [code])
  return { ...next, currency }
}

// True inside the payment drawer's frame or a payment popup (see the return page)
function isEmbedded() {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-embedded')
}

function panelStatus(data, pendingText) {
  if (!data) return null
  return <PanelStatus status={data.status}>{data.status === 'pending' && pendingText ? pendingText : undefined}</PanelStatus>
}

// The steps for the chosen flow, as in the server-to-server guide on docs.oppwa.com
function flowSteps(flow) {
  return [
    {
      key: 'send',
      id: 'send-the-payment',
      title: flow.tx === 'PA' ? 'Pre-authorize payment' : 'Perform debit payment',
      summary: flow.tx === 'PA' ? 'Send the pre-authorization request with the brand’s fields.' : 'Send the debit request with the brand’s fields.',
      tag: 'POST',
      tx: [flow.tx],
    },
    flow.mode === 'async' && {
      key: 'redirect',
      id: 'redirect-shopper',
      title: 'Redirect shopper',
      summary: 'Send the shopper to the payment page to approve the payment.',
    },
    { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', summary: 'Find out if the payment was successful.', tag: 'GET' },
    flow.tx === 'PA' && { key: 'capture', id: 'capture-the-payment', title: 'Capture the payment', summary: 'Send the capture request.', tag: 'POST', tx: ['CP'] },
    { key: 'manage', id: 'manage-the-payment', title: 'Manage the payment', summary: 'Send a refund request.', tag: 'POST', tx: ['RF'], optional: true },
  ]
    .filter(Boolean)
    .map((s, i) => ({ ...s, step: i + 1 }))
}

function AmountRow({ id, value, onChange, readOnly, invalid }) {
  return (
    <FieldBox invalid={invalid}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={bareInputClass}
      />
    </FieldBox>
  )
}

export function S2SFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [drawerOpen, setDrawerOpen] = useState(false)
  let autoScrolled = useRef(false)

  let catalogue = useMemo(() => (config?.brands || []).filter((b) => b.type === 'wallet'), [config])
  let flow = state.flow || INITIAL.flow
  let form = state.form
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let eligible = useMemo(() => eligibleBrands(catalogue, flow), [catalogue, flow])
  let brand = eligible.find((b) => b.code === form.brands[0])
  let steps = flowSteps(flow)
  let stepOf = (key) => steps.find((s) => s.key === key)

  useSyncSections([{ id: 'payment-workflow', title: 'Payment workflow' }, ...steps.map((s) => ({ id: s.id, step: s.step, title: s.title, tag: s.tag }))])

  // Keep the chosen brand valid for the flow
  useEffect(() => {
    if (!ready || !eligible.length || brand) return
    setState((s) => ({ ...s, form: withBrand(s.form, eligible[0].code, catalogue, flow.mode) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, eligible, brand])

  // What gets sent: the brand's own fields (from the KB fields mapping), the flow's mode and
  // payment type, and the cart when the brand requires one
  let sendForm = useMemo(
    () => withRequiredExtras({ ...form, extras: { ...form.extras, customer: false }, mode: flow.mode, paymentType: flow.tx }),
    [form, flow],
  )
  let amount = sendForm.extras.cart ? cartTotal(form.cart) : form.amount
  let missing = useMemo(() => missingFields({ ...sendForm, amount }), [sendForm, amount])
  let previewParams = useMemo(() => {
    if (!config) return []
    return buildPaymentParams(
      { ...sendForm, amount, flow: 's2s', merchantTransactionId: form.merchantTransactionId || '{generated}' },
      { entityId: ENTITY_SHOWN, testMode: config.testMode, shopperResultUrl: SHOPPER_RESULT_URL_SHOWN },
    )
  }, [config, sendForm, form.merchantTransactionId, amount])

  let payment = state.payment
  let paymentId = payment?.response?.id
  let redirect = payment?.response?.redirect
  let returnResourcePath = search.get('resourcePath')
  let returnId = search.get('id')
  let resourcePath =
    (mode === 'return' && (returnResourcePath || (returnId ? `/v1/payments/${returnId}` : null))) || (paymentId ? `/v1/payments/${paymentId}` : null)
  let sentAmount = payment?.response?.amount || amount
  let sentCurrency = payment?.response?.currency || form.currency

  // Status requests made per payment in the last minute, to stay inside the gateway's limit
  let statusCalls = useRef({})
  function statusWait(path) {
    let now = Date.now()
    let recent = (statusCalls.current[path] || []).filter((t) => now - t < STATUS_WINDOW_MS)
    statusCalls.current[path] = recent
    return recent.length < STATUS_LIMIT ? 0 : recent[0] + STATUS_WINDOW_MS - now + 250
  }

  // Sent only when the merchant clicks: one GET, within the gateway's two-a-minute limit
  async function checkStatus(path = resourcePath) {
    if (!path) return null
    let ms = statusWait(path)
    if (ms > 0) {
      setError({ status: `${THROTTLED_TEXT} Try again in ${Math.ceil(ms / 1000)} seconds.` })
      return null
    }
    setBusy('status')
    setError({})
    try {
      statusCalls.current[path] = [...(statusCalls.current[path] || []), Date.now()]
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(path)}&entity=wallet`)
      // Too many requests says nothing about the payment: keep the last result
      if (data.status === 'throttled') {
        setError({ status: `${THROTTLED_TEXT} Wait a moment and check again.` })
        return null
      }
      setState((s) => ({ ...s, result: data }))
      return data
    } catch (e) {
      setError({ status: e.message })
      return null
    } finally {
      setBusy('')
    }
  }

  // Back on the return page after a full-page redirect: show step 2, where the redirect
  // is marked complete; the merchant sends the status request themselves
  useEffect(() => {
    if (mode !== 'return' || autoScrolled.current || !ready || !resourcePath || isEmbedded()) return
    autoScrolled.current = true
    setTimeout(() => document.getElementById('redirect-shopper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
  }, [mode, resourcePath, ready])

  let latest = useRef({})
  latest.current = { paymentId }

  // The return page in the drawer (or popup) tells this page when the shopper is back
  useEffect(() => {
    let allowed = [window.location.origin]
    try {
      if (config?.returnBase) allowed.push(new URL(config.returnBase).origin)
    } catch {}
    function onMessage(e) {
      if (!allowed.includes(e.origin) || e.data?.type !== RETURN_MESSAGE) return
      let { paymentId: current } = latest.current
      if (current && e.data.id && e.data.id !== current) return
      setDrawerOpen(false)
      setState((s) => ({ ...s, returned: true }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [config, setState])

  function setFlow(next) {
    if (next.mode === flow.mode && next.tx === flow.tx) return
    let list = eligibleBrands(catalogue, next)
    setState((s) => {
      let code = list.some((b) => b.code === s.form.brands[0]) ? s.form.brands[0] : list[0]?.code
      return {
        ...s,
        flow: next,
        form: code ? withBrand(s.form, code, catalogue, next.mode) : s.form,
        payment: null,
        result: null,
        capture: null,
        refund: null,
        returned: false,
      }
    })
    setError({})
  }

  async function sendPayment() {
    setBusy('payment')
    setError({})
    try {
      let data = await postJson('/api/payments', {
        ...sendForm,
        amount,
        merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId(),
      })
      // Stay on step 1 so the response can be read; the next step is ready below
      setState((s) => ({
        ...s,
        payment: { ...data, at: new Date().toISOString() },
        result: null,
        capture: null,
        refund: null,
        returned: false,
        amounts: { capture: '', refund: '' },
      }))
    } catch (e) {
      setError({ payment: e.message })
    } finally {
      setBusy('')
    }
  }

  // Capture needs an approved pre-authorization; a refund needs a successful debit or capture
  let approved = state.result?.status === 'success'
  let refundTargetId = flow.tx === 'PA' ? state.capture?.response?.id : approved ? paymentId : null
  let refundReady = flow.tx === 'PA' ? state.capture?.status === 'success' : approved

  async function backOffice(kind) {
    let paymentType = kind === 'capture' ? 'CP' : 'RF'
    let id = kind === 'capture' ? paymentId : refundTargetId
    let value = state.amounts?.[kind] || sentAmount
    setBusy(kind)
    setError({})
    try {
      let data = await postJson(`/api/payments/${id}`, { paymentType, amount: value, currency: sentCurrency })
      setState((s) => ({ ...s, [kind]: data }))
    } catch (e) {
      setError({ [kind]: e.message })
    } finally {
      setBusy('')
    }
  }

  function openWindow() {
    setDrawerOpen(false)
    if (!sendShopperToPopup(redirect)) setError({ redirect: 'The browser blocked the new window. Allow pop-ups for this site, or use the drawer.' })
  }

  let apiHost = config?.apiHost || 'eu-test.oppwa.com'
  let entityShown = ENTITY_SHOWN
  let requestCurl = config ? buildCurl({ url: `https://${apiHost}/v1/payments`, params: previewParams }) : ''
  let statusCurl = buildCurl({ method: 'GET', url: `https://${apiHost}${resourcePath || '/v1/payments/{id}'}`, params: [['entityId', entityShown]] })
  let snippet = redirectSnippet(redirect)
  let redirectHost = ''
  try {
    redirectHost = redirect?.url ? new URL(redirect.url).host : ''
  } catch {}
  let paidBrand = catalogue.find((b) => b.code === payment?.response?.paymentBrand)
  let paidBrandTitle = [paidBrand?.name || 'Payment page', payment?.response?.amount && `${payment.response.amount} ${payment.response.currency || ''}`]
    .filter(Boolean)
    .join(' · ')
  let backOfficeCurl = (id, type, kind) =>
    buildCurl({
      url: `https://${apiHost}/v1/payments/${id || '{id}'}`,
      params: [
        ['entityId', entityShown],
        ['amount', state.amounts?.[kind] || sentAmount],
        ['currency', sentCurrency],
        ['paymentType', type],
        ...(config?.testMode ? [['testMode', config.testMode]] : []),
      ],
    })
  let captureCurl = backOfficeCurl(paymentId, 'CP', 'capture')
  let refundCurl = backOfficeCurl(refundTargetId, 'RF', 'refund')
  let setAmount = (kind, v) => setState((s) => ({ ...s, amounts: { ...s.amounts, [kind]: v } }))
  let cart = cartSpec(form.brands)
  let cartRequired = Boolean(cart?.required.length)
  let send = stepOf('send')
  let redirectStep = stepOf('redirect')
  let status = stepOf('status')
  let capture = stepOf('capture')
  let manage = stepOf('manage')
  let modeInfo = MODES.find((m) => m.value === flow.mode)
  let flowInfo = modeInfo.flows.find((f) => f.value === flow.tx)

  // The chosen brand's own fields, shown in their parameter groups
  let specs = brand ? fieldSpecs([brand.code], flow.mode) : []
  let missingIn = (group) => missing.filter((k) => groupOf(k) === group).length
  let basicSpecs = specs.filter((x) => groupOf(x.key) === 'basic')
  let fieldRows = (group) => (
    <BrandFieldRows
      form={{ ...form, mode: flow.mode }}
      setForm={({ mode: _mode, ...f }) => setForm(f)}
      catalogue={catalogue}
      idPrefix="s2s"
      missing={missing}
      filter={(x) => groupOf(x.key) === group}
    />
  )
  let testModeGroup = (text) =>
    config?.testMode && (
      <ParamGroup title="Testing" preview={config.testMode}>
        <ParamRow name="testMode" req="T" control={<FixedValue>{config.testMode}</FixedValue>}>
          {text}
        </ParamRow>
      </ParamGroup>
    )
  let backOfficeGroups = (kind, type, text) => (
    <ParamGroups>
      <ParamGroup title="Basic payment" preview={preview(`${state.amounts?.[kind] || sentAmount} ${sentCurrency}`, type)}>
        <ParamRow
          name="amount"
          type="decimal"
          req="M"
          control={<AmountRow id={`s2s-${kind}-amount`} value={state.amounts?.[kind] || sentAmount} onChange={(v) => setAmount(kind, v)} />}
        >
          {text.amount}
        </ParamRow>
        <ParamRow name="currency" req="M" control={<FixedValue>{sentCurrency}</FixedValue>}>
          {text.currency}
        </ParamRow>
        <ParamRow name="paymentType" req="M" control={<FixedValue>{type}</FixedValue>}>
          {text.paymentType}
        </ParamRow>
      </ParamGroup>
      {testModeGroup(text.testMode)}
    </ParamGroups>
  )

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">Payment requests are off. Add ENTITY_ID and ACCESS_TOKEN in Vercel under Settings, Environment Variables, then redeploy.</Note>
      )}

      {/* Payment workflow: an overview, the use case to try, and the requests it makes */}
      <Heading level={2} id="payment-workflow">
        Payment workflow
      </Heading>
      <p>
        In a server-to-server integration the merchant server sends every request to the payment gateway itself. It initiates the payment with a
        POST request, redirects the shopper to the payment brand when the response asks for it, and gets the payment status with a GET request.
        Back-office requests on the same payment capture or refund it.
      </p>
      <h3>Use cases</h3>
      <p>Choose how the shopper completes the payment, then the transaction flow. The steps below follow your choice.</p>
      <FlowCards modes={MODES} mode={flow.mode} tx={flow.tx} onChange={setFlow} />
      <h3>Transaction flow model</h3>
      <p>
        The requests in this flow, between the shopper, the merchant server, the payment gateway and the payment brand. Numbered requests are the
        steps below.
      </p>
      <SequenceDiagram title={`${modeInfo.title} · ${flowInfo.title}`} messages={sequence(flow, steps)} />

      <hr />

      {/* Send the payment */}
      <Heading level={2} id={send.id} step={send.step} tag="POST" label="/v1/payments">
        {send.title}
      </Heading>
      <Row>
        <Col>
          <p>
            {flow.mode === 'sync'
              ? 'Initiate a server-to-server POST request with the required payment data, including the shopper’s mobile number. There’s no redirect: the payment brand asks the shopper to approve the payment in its app.'
              : flow.tx === 'PA'
                ? 'Initiate a server-to-server POST request with the required payment data, payment type PA and your shopperResultUrl. The response is pending and carries the redirect details for the next step. Once the shopper approves, the amount is reserved until you capture it.'
                : 'Initiate a server-to-server POST request with the required payment data and your shopperResultUrl. The response is pending and carries the redirect details for the next step.'}
          </p>
          <div className="not-prose mt-8">
            <label htmlFor="s2s-brand" className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
              Payment brand
            </label>
            <BrandSelect
              id="s2s-brand"
              brands={eligible}
              selected={brand ? [brand.code] : []}
              showDetails={false}
              compact
              onChange={([code]) =>
                setState((s) => ({ ...s, form: withBrand(s.form, code, catalogue, flow.mode), payment: null, result: null, capture: null, refund: null }))
              }
            />
          </div>
          <BrandFacts brand={brand} />
          <h3>Body parameters</h3>
          <p>
            Required and optional {brand ? `${brand.name} ` : ''}parameters. For further details refer to{' '}
            <a href={HELP_CENTRE_URL} target="_blank" rel="noreferrer">
              Ecommerce Payment Methods
            </a>
            .
          </p>
          <ParamGroups key={`${brand?.code}-${flow.mode}-${flow.tx}`}>
            <ParamGroup
              title="Basic payment"
              missing={missingIn('basic')}
              preview={preview(`${amount} ${form.currency}`, flow.tx, brand?.code, basicSpecs.map((x) => form.fields[x.key]))}
            >
              <ParamRow
                name="amount"
                type="decimal"
                req="M"
                control={<AmountRow id="s2s-amount" value={amount} readOnly={sendForm.extras.cart} onChange={(v) => setForm({ ...form, amount: v })} />}
              >
                The amount to charge, with two decimals.{sendForm.extras.cart ? ' Set by the cart total.' : ''}
              </ParamRow>
              <ParamRow
                name="currency"
                req="M"
                control={
                  <FieldBox>
                    <SelectMenu
                      id="s2s-currency"
                      variant="bare"
                      fullWidth
                      className="-mx-1.5"
                      aria-label="currency"
                      options={(brand?.currencies || ['EUR']).map((c) => ({ value: c, label: c }))}
                      value={form.currency}
                      onChange={(v) => setForm({ ...form, currency: v })}
                      searchPlaceholder="Search currencies"
                      renderValue={(o) => <span className="flex-auto text-left font-mono text-sm text-zinc-900 dark:text-white">{o?.value || form.currency}</span>}
                    />
                  </FieldBox>
                }
              >
                The three-letter ISO 4217 currency code.{brand ? ` ${brand.name} takes ${brand.currencies.join(', ')}.` : ''}
              </ParamRow>
              <ParamRow name="paymentBrand" req="M" control={<FixedValue>{brand?.code || '—'}</FixedValue>}>
                The payment brand selected above.
              </ParamRow>
              <ParamRow name="paymentType" req="M" control={<FixedValue>{flow.tx}</FixedValue>}>
                {flow.tx === 'PA' ? 'PA pre-authorizes the amount for a later capture.' : 'DB debits the shopper’s account.'} Set by the transaction flow.
              </ParamRow>
              <ParamRow
                name="merchantTransactionId"
                req="O"
                control={
                  <FieldBox>
                    <input
                      id="s2s-mtid"
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      placeholder="Generated if empty"
                      value={form.merchantTransactionId}
                      onChange={(e) => setForm({ ...form, merchantTransactionId: e.target.value })}
                      className={bareInputClass}
                    />
                  </FieldBox>
                }
              >
                Your reference for the payment, often used for reconciliation.
              </ParamRow>
              <ParamRow name="shopperResultUrl" type="url" req="M" control={<FixedValue>{SHOPPER_RESULT_URL_SHOWN}</FixedValue>}>
                Your page the shopper is sent back to after the payment brand. The gateway adds the payment’s id and resourcePath to it.
                {flow.mode === 'sync' ? ' Not used when there’s no redirect.' : ''}
              </ParamRow>
              {fieldRows('basic')}
            </ParamGroup>
            {FIELD_GROUPS.map((g) => {
              let list = specs.filter((x) => g.test(x.key))
              if (!list.length) return null
              return (
                <ParamGroup key={g.id} title={g.title} missing={missingIn(g.id)} preview={preview(list.map((x) => form.fields[x.key]))}>
                  {fieldRows(g.id)}
                </ParamGroup>
              )
            })}
            {cart && (
              <ParamGroup
                title="Cart"
                missing={missingIn('cart')}
                preview={sendForm.extras.cart ? `${form.cart.length} ${form.cart.length === 1 ? 'item' : 'items'} · ${cartTotal(form.cart)} ${form.currency}` : 'Not sent'}
              >
                <ParamRow
                  wide
                  name="cart.items[n]"
                  type="array"
                  req={cartRequired ? 'M' : 'O'}
                  control={
                    <div className="space-y-3">
                      {!cartRequired && (
                        <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                          <Toggle
                            checked={form.extras.cart}
                            label="Send cart items"
                            onChange={(v) => setForm({ ...form, extras: { ...form.extras, cart: v } })}
                          />
                          Send cart items
                        </label>
                      )}
                      {sendForm.extras.cart && <CartEditor form={form} setForm={setForm} missing={missing} />}
                    </div>
                  }
                >
                  The items in the order, each with its {cart.fields.join(', ')}. When you send a cart, the amount is the cart total.
                </ParamRow>
              </ParamGroup>
            )}
            {testModeGroup('Test only: EXTERNAL sends the payment to the PPRO simulator. Leave it out in production.')}
          </ParamGroups>
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
                <SendButton onClick={sendPayment} disabled={!config?.configured || !brand || missing.length > 0 || busy === 'payment'}>
                  {busy === 'payment' ? 'Sending…' : 'Send request'}
                </SendButton>
                <MissingFieldsHint missing={missing} />
                {payment && (
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => ({ ...INITIAL, flow: s.flow, form: s.form }))
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
            status={panelStatus(payment, redirect ? 'Pending redirect' : 'Pending')}
            code={payment ? JSON.stringify(payment.response, null, 2) : ''}
            html={payment ? highlightJson(payment.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>

      {/* Redirect the shopper (asynchronous only) */}
      {redirectStep && (
        <>
          <hr />
          <Heading level={2} id={redirectStep.id} step={redirectStep.step} label={redirect ? `${redirectMethod(redirect)} redirect.url` : 'redirect'}>
            {redirectStep.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Redirect the shopper to the redirect URL from step 1, passing its parameters with the method it gives. The payment brand guides the
                shopper through verifying and completing the payment, then sends them to your shopperResultUrl. Here the payment page opens in a
                drawer, so you stay on this page.
              </p>
              <h3>Response parameters</h3>
              <ParamGroups>
                <ParamGroup title="Redirect" preview={redirect ? preview(redirectMethod(redirect), redirectHost) : null}>
                  <Property split name="redirect.url" type="url" control={redirect && <FixedValue>{redirect.url}</FixedValue>}>
                    The payment brand’s page to send the shopper to.
                  </Property>
                  <Property split name="redirect.method" type="string" control={redirect && <FixedValue>{redirectMethod(redirect)}</FixedValue>}>
                    GET or POST. If it’s missing, use POST when there are parameters and GET when there aren’t.
                  </Property>
                  <Property
                    split
                    name="redirect.parameters"
                    type="array"
                    control={redirect && <FixedValue>{(redirect.parameters || []).map((x) => x.name).join(', ') || 'None'}</FixedValue>}
                  >
                    Name and value pairs to pass on unchanged: query parameters for GET, hidden form fields for POST.
                  </Property>
                </ParamGroup>
              </ParamGroups>
              {paymentId && payment?.status === 'pending' && !redirect && (
                <Note>There’s no redirect in this response, so the shopper approves the payment in their app. Check the status in the next step.</Note>
              )}
            </Col>
            <Col sticky>
              <CodeWindow
                title="JavaScript"
                label="Redirect details from step 1"
                code={snippet}
                html={highlightJs(snippet)}
                footer={
                  <SplitButton
                    primary={{ label: 'Redirect', onClick: () => setDrawerOpen(true), disabled: !redirect }}
                    secondary={{ label: 'Redirect in new window', icon: <NewWindowIcon className="size-3.5 flex-none" />, onClick: openWindow, disabled: !redirect }}
                  />
                }
              />
              <ErrorNote message={error.redirect} />
              {(state.returned || (mode === 'return' && resourcePath)) && (
                <div className="not-prose mt-4 flex items-start gap-2.5 rounded-xl bg-green-50/70 px-4 py-3 text-sm text-green-900 ring-1 ring-green-600/15 ring-inset dark:bg-green-400/5 dark:text-green-200 dark:ring-green-400/15">
                  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 size-4 flex-none text-green-600 dark:text-green-400">
                    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
                    <path d="m5.75 8.25 1.5 1.5 3-3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>
                    <span className="font-medium">Redirect complete.</span> Continue to{' '}
                    <a href={`#${status.id}`} className="font-medium underline decoration-green-600/30 underline-offset-2 hover:decoration-green-600">
                      step {status.step}
                    </a>{' '}
                    to retrieve the payment status.
                  </p>
                </div>
              )}
            </Col>
          </Row>
          <PaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} redirect={redirect} title={paidBrandTitle} onOpenWindow={openWindow} />
        </>
      )}

      {/* Payment status */}
      <hr />
      <Heading level={2} id={status.id} step={status.step} tag="GET" label={resourcePath || '/v1/payments/{id}'}>
        {status.title}
      </Heading>
      <Row>
        <Col>
          <p>
            {flow.mode === 'sync'
              ? `Send a GET request for the payment with your entityId to get the result. There’s no redirect, so the payment stays pending until the shopper approves it in the app${brand?.timeout ? ` or it times out after ${brand.timeout}` : ''}. On the test system the simulator approves it by itself within about 30 seconds.`
              : 'Once the payment is processed, the shopper is redirected to your shopperResultUrl with the id and resourcePath parameters. Send a GET request to the resourcePath with your entityId to get the payment result. A payment can stay pending for a while: check again, or rely on the webhook in production.'}{' '}
            The gateway allows two status checks a minute for each payment.
          </p>
          <h3>Response parameters</h3>
          <p>
            The same for every payment brand. What changes is the payment type, the redirect (only while an asynchronous payment is pending),
            the customer and cart details you sent, and the result details, which follow the payment’s state. Result details appear when the
            entity shows connector details in responses.
          </p>
          <ParamGroups>
            {responseGroups(flow).map((g) => (
              <ParamGroup
                key={g.title}
                title={g.title}
                preview={
                  state.result
                    ? preview(
                        g.rows
                          .filter(([name]) => !['id', 'ndc', 'buildNumber'].includes(name))
                          .slice(0, 3)
                          .map(([name]) => valueAt(state.result.response, name)),
                      )
                    : null
                }
              >
                {g.rows.map(([name, req, text, type = 'string']) => {
                  let value = valueAt(state.result?.response, name)
                  return (
                    <Property
                      split
                      key={name}
                      name={name}
                      type={type}
                      badge={<ReqText req={req} />}
                      control={value !== undefined && value !== '' ? <FixedValue>{String(value)}</FixedValue> : null}
                    >
                      {text}
                    </Property>
                  )
                })}
              </ParamGroup>
            ))}
          </ParamGroups>
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="GET"
            label={resourcePath || '/v1/payments/{id}'}
            code={statusCurl}
            html={highlightCurl(statusCurl)}
            footer={
              <SplitButton
                primary={{
                  label: busy === 'status' ? 'Sending…' : 'Send request',
                  onClick: () => checkStatus(),
                  disabled: !resourcePath || busy === 'status' || !config?.configured,
                }}
                secondary={{
                  label: 'Check status',
                  icon: <RefreshIcon className={clsx('size-3.5 flex-none', busy === 'status' && 'animate-spin')} />,
                  onClick: () => checkStatus(),
                  disabled: !state.result || busy === 'status',
                }}
              />
            }
          />
          <ErrorNote message={error.status} />
          <CodeWindow
            title="Response"
            status={panelStatus(state.result)}
            code={state.result ? JSON.stringify(state.result.response, null, 2) : ''}
            html={state.result ? highlightJson(state.result.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>

      {/* Capture (pre-authorization only) */}
      {capture && (
        <>
          <hr />
          <Heading level={2} id={capture.id} step={capture.step} tag="POST" label={`/v1/payments/${paymentId || '{id}'}`}>
            {capture.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Initiate a server-to-server POST request over the pre-authorized payment, with payment type CP, to take the money.
                {brand?.capture.length ? ` ${brand.name} allows ${brand.capture.join(' and ').toLowerCase()} captures.` : ''}
              </p>
              <h3>Body parameters</h3>
              {backOfficeGroups('capture', 'CP', {
                amount: 'The amount to capture: all of the pre-authorization, or part of it.',
                currency: 'The pre-authorization’s currency.',
                paymentType: 'CP captures the pre-authorization.',
                testMode: 'Test only: must match the pre-authorization, or the gateway rejects the capture.',
              })}
              {!approved && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the pre-authorization is approved.</p>}
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="POST"
                label={`/v1/payments/${paymentId || '{id}'}`}
                code={captureCurl}
                html={highlightCurl(captureCurl)}
                footer={
                  <SendButton onClick={() => backOffice('capture')} disabled={!approved || busy === 'capture'}>
                    {busy === 'capture' ? 'Sending…' : 'Send request'}
                  </SendButton>
                }
              />
              <ErrorNote message={error.capture} />
              <CodeWindow
                title="Response"
                status={panelStatus(state.capture)}
                code={state.capture ? JSON.stringify(state.capture.response, null, 2) : ''}
                html={state.capture ? highlightJson(state.capture.response) : ''}
                empty="Response Details"
              />
            </Col>
          </Row>
        </>
      )}

      {/* Manage the payment: refund */}
      <hr />
      <Heading level={2} id={manage.id} step={manage.step} tag="POST" label={`/v1/payments/${refundTargetId || '{id}'}`}>
        {manage.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Optional. Initiate a back-office server-to-server POST request over the {flow.tx === 'PA' ? 'captured' : 'debit'} payment, with payment
            type RF, to refund it in full or in part.
            {brand?.refunds.length ? ` ${brand.name} allows ${brand.refunds.join(', ').toLowerCase()} refunds.` : ''}
          </p>
          {brand && !brand.refunds.length ? (
            <Note>{brand.name} doesn’t support refunds through the API.</Note>
          ) : (
            <>
              <h3>Body parameters</h3>
              {backOfficeGroups('refund', 'RF', {
                amount: 'The amount to refund: all of it, or part of it.',
                currency: 'The payment’s currency.',
                paymentType: 'RF refunds the payment.',
                testMode: 'Test only: must match the original payment, or the gateway rejects the refund.',
              })}
              {!refundReady && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the {flow.tx === 'PA' ? 'capture' : 'payment'} is successful.</p>
              )}
              {state.refund?.status === 'pending' && (
                <Note>
                  The refund was accepted and is pending (000.200.001) while the payment brand processes it. The final result arrives by webhook in
                  production.
                </Note>
              )}
            </>
          )}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={`/v1/payments/${refundTargetId || '{id}'}`}
            code={refundCurl}
            html={highlightCurl(refundCurl)}
            footer={
              <SendButton onClick={() => backOffice('refund')} disabled={!refundReady || !brand?.refunds.length || busy === 'refund'}>
                {busy === 'refund' ? 'Sending…' : 'Send request'}
              </SendButton>
            }
          />
          <ErrorNote message={error.refund} />
          <CodeWindow
            title="Response"
            status={panelStatus(state.refund)}
            code={state.refund ? JSON.stringify(state.refund.response, null, 2) : ''}
            html={state.refund ? highlightJson(state.refund.response) : ''}
            empty="Response Details"
          />
        </Col>
      </Row>
    </>
  )
}
