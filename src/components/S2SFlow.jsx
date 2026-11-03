'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ErrorNote } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton, UrlLabel } from '@/components/CodeWindow'
import { Col, Note, Row } from '@/components/content'
import { StatusIcon } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { ParamDoc, ParamList, RequestProperties } from '@/components/params'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { Playground } from '@/components/Playground'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import {
  credentialsPayload,
  credentialsReady,
  newMerchantTransactionId,
  postJson,
  usePersistentState,
  useSessionCredentials,
} from '@/lib/flowState'
import { highlightJs, highlightJson, requestCode } from '@/lib/highlight'
import { REDIRECT_DOC, REQUEST_DOCS, RESPONSE_BASE, requestDoc } from '@/lib/paramDocs'
import { RETURN_MESSAGE, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
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

// paymentType values, as the parameters reference describes them
const PAYMENT_TYPES = {
  DB: 'DB, Debit: debits the account of the end customer and credits the merchant account.',
  PA: 'PA, Preauthorization: a stand-alone authorisation. A Capture (CP) with reference to the Preauthorisation (PA) will confirm the payment.',
  CP: 'CP, Capture: captures a preauthorized (PA) amount.',
  RF: 'RF, Refund: credits the account of the end customer with a reference to a prior Debit (DB) or Credit (CD) transaction.',
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

// The steps for the chosen flow, as in the server-to-server guide on docs.oppwa.com
function flowSteps(flow) {
  return [
    {
      key: 'send',
      id: 'send-the-payment',
      title: flow.tx === 'PA' ? 'Pre-authorize payment' : 'Perform debit payment',
      tag: 'POST',
    },
    flow.mode === 'async' && { key: 'redirect', id: 'redirect-shopper', title: 'Redirect shopper' },
    { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', tag: 'GET' },
    flow.tx === 'PA' && { key: 'capture', id: 'capture-the-payment', title: 'Capture the payment', tag: 'POST' },
    { key: 'manage', id: 'manage-the-payment', title: 'Manage the payment', tag: 'POST', optional: true },
  ]
    .filter(Boolean)
    .map((s, i) => ({ ...s, step: i + 1 }))
}

// What comes after a request, under its response (and after the redirect)
const NOTE_TONES = {
  success: 'bg-green-50/70 text-green-900 ring-green-600/15 dark:bg-green-400/5 dark:text-green-200 dark:ring-green-400/15',
  pending: 'bg-amber-50/60 text-amber-900 ring-amber-600/15 dark:bg-amber-400/5 dark:text-amber-200/90 dark:ring-amber-400/15',
  failed: 'bg-rose-50/60 text-rose-900 ring-rose-600/15 dark:bg-rose-400/5 dark:text-rose-200 dark:ring-rose-400/15',
}
const NOTE_ICONS = {
  success: 'text-green-600 dark:text-green-400',
  pending: 'text-amber-600 dark:text-amber-400',
  failed: 'text-rose-600 dark:text-rose-400',
}

function StepNote({ status, title, children }) {
  let tone = NOTE_TONES[status] ? status : 'failed'
  return (
    <div className={clsx('not-prose mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ring-1 ring-inset', NOTE_TONES[tone])}>
      <StatusIcon status={tone} className={clsx('mt-0.5 size-4 flex-none', NOTE_ICONS[tone])} />
      <p className="min-w-0">
        <span className="font-medium">{title}</span> {children}
      </p>
    </div>
  )
}

function StepLink({ step }) {
  if (!step) return null
  return (
    <a href={`#${step.id}`} className="font-medium underline decoration-current/30 underline-offset-2 hover:decoration-current">
      step {step.step}
    </a>
  )
}

const resultText = (data) => {
  let r = data?.response?.result
  return r ? `${r.description || ''}${r.code ? ` (${r.code})` : ''}`.trim() : data?.response?.raw || ''
}

// Response parameters for a payment: the payment response from the parameters
// reference, with the objects the request sent (customer, billing, cart…)
function responseDocs({ redirect, sentParams = [], backOffice }) {
  let objects = {}
  for (let [key] of sentParams) {
    let custom = key.match(/^customParameters\[(.+)\]$/)
    if (custom) {
      ;(objects.customParameters ||= []).push({ name: custom[1], ...REQUEST_DOCS.customParameters, req: 'C' })
      continue
    }
    let m = key.match(/^(customer|billing|shipping|bankAccount|virtualAccount)\.(.+)$/)
    if (m) (objects[m[1]] ||= []).push({ name: m[2], ...requestDoc(key), req: 'C' })
    let c = key.match(/^cart\.items\[0\]\.(\w+)$/)
    if (c) (objects.cart ||= []).push({ name: c[1], ...requestDoc(key), req: 'C' })
  }
  let objectDocs = Object.entries(objects).map(([name, children]) =>
    name === 'cart'
      ? { name, type: 'object', req: 'C', text: 'The cart, when the request sent one.', children: [{ name: 'items', type: 'array', req: 'C', text: 'The items in the cart.', children }] }
      : { name, type: 'object', req: 'C', text: `The ${name} details, when the request sent them.`, children },
  )
  let B = RESPONSE_BASE
  return [
    B.id,
    backOffice && {
      name: 'referencedId',
      format: 'AN32',
      pattern: '[a-zA-Z0-9]{32}',
      req: 'C',
      text: 'In case of referenced payment (e.g., Capture or Refund), this field shows which payment was referenced.',
      example: '8ac7a4a1a1a0e53501a1a12ca8c62c86',
    },
    B.paymentType,
    B.paymentBrand,
    B.amount,
    B.currency,
    B.descriptor,
    !backOffice && B.merchantTransactionId,
    B.result,
    B.resultDetails,
    redirect && B.redirect,
    ...objectDocs,
    B.buildNumber,
    B.timestamp,
    B.ndc,
  ].filter(Boolean)
}

function ResponseGroup({ docs, response }) {
  return (
    <ParamGroups>
      <ParamGroup title="Response parameters">
        {docs.map((d) => (
          <ParamDoc key={d.name} doc={d} value={response?.[d.name]} />
        ))}
      </ParamGroup>
    </ParamGroups>
  )
}

export function S2SFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [creds, setCreds] = useSessionCredentials()
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [drawerOpen, setDrawerOpen] = useState(false)
  let [playground, setPlayground] = useState({ open: false, focus: null })
  let autoScrolled = useRef(false)
  let openPlayground = (focus = null) => setPlayground({ open: true, focus })

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
  let sentValues = useMemo(() => Object.fromEntries(previewParams), [previewParams])

  let payment = state.payment
  let paymentId = payment?.response?.id
  let redirect = payment?.response?.redirect
  let returnResourcePath = search.get('resourcePath')
  let returnId = search.get('id')
  let resourcePath =
    (mode === 'return' && (returnResourcePath || (returnId ? `/v1/payments/${returnId}` : null))) || (paymentId ? `/v1/payments/${paymentId}` : null)
  let statusId = resourcePath?.match(/\/v1\/payments\/(\w+)/)?.[1]
  let sentAmount = payment?.response?.amount || amount
  let sentCurrency = payment?.response?.currency || form.currency

  // Requests go out with the demo's credentials, or the merchant's own from the Playground
  let credentials = credentialsPayload(creds)
  let credsOk = credentialsReady(creds)
  let canSend = Boolean(config && (config.configured || creds.useOwn) && credsOk)

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
      // POST to this demo's server, so your own credentials stay out of the URL; it sends the GET
      let data = await postJson('/api/status', { resourcePath: path, credentials })
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

  function setBrand(code) {
    setState((s) => ({ ...s, form: withBrand(s.form, code, catalogue, flow.mode), payment: null, result: null, capture: null, refund: null, returned: false }))
  }

  function resetPlayground() {
    setState((s) => ({
      ...s,
      form: withBrand({ ...INITIAL.form, brands: s.form.brands }, s.form.brands[0], catalogue, flow.mode),
      amounts: { capture: '', refund: '' },
    }))
  }

  async function sendPayment() {
    setBusy('payment')
    setError({})
    try {
      let data = await postJson('/api/payments', {
        ...sendForm,
        amount,
        merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId(),
        credentials,
      })
      // Stay on step 1 so the response can be read; the next step is ready below
      setState((s) => ({
        ...s,
        payment: { ...data, at: new Date().toISOString() },
        result: null,
        capture: null,
        refund: null,
        returned: false,
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
      let data = await postJson(`/api/payments/${id}`, { paymentType, amount: value, currency: sentCurrency, credentials })
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
  let base = `https://${apiHost}`
  let requestVariants = config ? requestCode({ url: `${base}/v1/payments`, params: previewParams }) : null
  let statusVariants = requestCode({ method: 'GET', url: `${base}/v1/payments/${statusId || '{id}'}`, params: [['entityId', ENTITY_SHOWN]] })
  let snippet = redirectSnippet(redirect)
  let paidBrand = catalogue.find((b) => b.code === payment?.response?.paymentBrand)
  let paidBrandTitle = [paidBrand?.name || 'Payment page', payment?.response?.amount && `${payment.response.amount} ${payment.response.currency || ''}`]
    .filter(Boolean)
    .join(' · ')
  let backOfficeParams = (type, kind) => [
    ['entityId', ENTITY_SHOWN],
    ['amount', state.amounts?.[kind] || sentAmount],
    ['currency', sentCurrency],
    ['paymentType', type],
    ...(config?.testMode ? [['testMode', config.testMode]] : []),
  ]
  let captureVariants = requestCode({ url: `${base}/v1/payments/${paymentId || '{id}'}`, params: backOfficeParams('CP', 'capture') })
  let refundVariants = requestCode({ url: `${base}/v1/payments/${refundTargetId || '{id}'}`, params: backOfficeParams('RF', 'refund') })
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
  let isAsync = flow.mode === 'async'

  // Body parameters for step 1: the basic payment parameters, the brand's own fields
  // (from the KB fields mapping) and its cart, with the formats from the reference
  let specs = brand ? fieldSpecs([brand.code], flow.mode) : []
  let doc = (key, extra = {}) => ({ name: key, ...requestDoc(key), ...extra })
  let bodyRows = [
    { doc: doc('amount', { req: 'M' }), value: amount, note: sendForm.extras.cart ? 'Set by the cart total.' : null },
    { doc: doc('currency', { req: 'M' }), value: form.currency, note: brand ? `${brand.name} takes ${brand.currencies.join(', ')}.` : null },
    { doc: doc('paymentBrand', { req: 'M' }), value: brand?.code },
    { doc: doc('paymentType', { req: 'M' }), value: flow.tx, note: PAYMENT_TYPES[flow.tx] },
    { doc: doc('merchantTransactionId', { req: 'C' }), value: form.merchantTransactionId, note: 'The demo generates one if you leave it empty.' },
    {
      doc: doc('shopperResultUrl', { req: isAsync ? 'M' : 'C' }),
      value: SHOPPER_RESULT_URL_SHOWN,
      note: isAsync ? 'The gateway adds the payment’s id and resourcePath to it.' : 'Not used when there’s no redirect.',
    },
    ...specs.map((spec) => ({
      doc: doc(spec.key, { req: spec.req }),
      value: String(form.fields[spec.key] ?? '').trim(),
      note: [spec.hint, spec.type === 'select' && spec.options.length <= 6 && `Values: ${spec.options.join(', ')}.`].filter(Boolean).join(' ') || null,
      missing: missing.includes(spec.key),
    })),
    ...(cart
      ? cart.fields.map((k) => ({
          doc: doc(`cart.items[n].${k}`, { req: cartRequired ? 'M' : 'O' }),
          value: sentValues[`cart.items[0].${k}`],
          missing: cartRequired && missing.some((m) => m === 'cart.items' || m.endsWith(`].${k}`)),
          note: k === 'name' && !cartRequired && !sendForm.extras.cart ? 'Not sent: switch the cart on in the Playground to send it.' : null,
        }))
      : []),
  ]
  let testModeRow = config?.testMode && (
    <ParamGroup title="Testing">
      <ParamDoc doc={{ name: 'testMode', ...REQUEST_DOCS.testMode, req: 'T' }} value={config.testMode} />
    </ParamGroup>
  )
  let pathId = (value, note) => <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
    <ParamDoc doc={{ ...REQUEST_DOCS.id, name: 'id', req: 'M' }} value={value} note={note} />
  </ParamList>
  let backOfficeGroups = (kind, type, notes) => (
    <ParamGroups>
      <ParamGroup title="Basic payment">
        <ParamDoc doc={doc('amount', { req: 'M' })} value={state.amounts?.[kind] || sentAmount} note={notes.amount} />
        <ParamDoc doc={doc('currency', { req: 'M' })} value={sentCurrency} note={notes.currency} />
        <ParamDoc doc={doc('paymentType', { req: 'M' })} value={type} note={PAYMENT_TYPES[type]} />
      </ParamGroup>
      {testModeRow}
    </ParamGroups>
  )
  let playgroundLink = (focus, text = 'Playground') => (
    <button type="button" onClick={() => openPlayground(focus)} className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
      {text}
    </button>
  )
  let sendHint = !canSend ? (
    <span className="text-xs text-zinc-400">
      {config && !config.configured && !creds.useOwn ? 'Add your test credentials in the ' : 'Enter your test credentials in the '}
      <button type="button" onClick={() => openPlayground('credentials')} className="font-medium text-zinc-200 underline decoration-white/30 underline-offset-2 hover:decoration-white">
        Playground
      </button>
    </span>
  ) : null

  let pg = {
    config,
    creds,
    setCreds,
    flow,
    setFlow,
    eligible,
    brand,
    onBrand: setBrand,
    catalogue,
    form,
    setForm,
    amount,
    cartDriven: sendForm.extras.cart,
    missing,
    cart,
    cartRequired,
    amounts: state.amounts || INITIAL.amounts,
    setAmount,
    sentAmount,
    sentCurrency,
    onReset: resetPlayground,
  }

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">
          The demo’s credentials aren’t set on this server. Use your own test credentials in the {playgroundLink('credentials')}, or add ENTITY_ID and
          ACCESS_TOKEN in Vercel under Settings, Environment Variables, then redeploy.
        </Note>
      )}

      {/* Payment workflow: an overview, the requests in the flow, and the use case to try */}
      <Heading level={2} id="payment-workflow">
        Payment workflow
      </Heading>
      <p>
        In a server-to-server integration the merchant server sends every request to the payment gateway itself. It initiates the payment with a
        POST request, redirects the shopper to the payment brand when the response asks for it, and gets the payment status with a GET request.
        Back-office requests on the same payment capture or refund it.
      </p>
      <h3>Transaction flow model</h3>
      <p>
        The requests in this flow, between the shopper, the merchant server, the payment gateway and the payment brand. Numbered requests are the
        steps below.
      </p>
      <SequenceDiagram title={`${modeInfo.title} · ${flowInfo.title}`} messages={sequence(flow, steps)} />
      <h3>Use cases</h3>
      <p>Choose how the shopper completes the payment, then the transaction flow. The steps below follow your choice.</p>
      <FlowCards modes={MODES} mode={flow.mode} tx={flow.tx} onChange={setFlow} />

      <hr />

      {/* Send the payment */}
      <Heading level={2} id={send.id} step={send.step} tag="POST">
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
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/payments" base={base} />
          <h3>Body parameters</h3>
          <p>
            Open the {playgroundLink('payment')} to choose the payment brand, currency and amount, fill in the brand’s fields, or use your own test
            credentials. The parameters below are for {brand ? brand.name : 'the chosen payment brand'}. For further details refer to{' '}
            <a href={HELP_CENTRE_URL} target="_blank" rel="noreferrer">
              Ecommerce Payment Methods
            </a>
            .
          </p>
          <ParamGroups key={`${brand?.code}-${flow.mode}-${flow.tx}`}>
            <ParamGroup title="Basic payment" missing={missing.length}>
              {bodyRows.map((r) => (
                <ParamDoc key={r.doc.name} doc={r.doc} value={r.value} note={r.note} missing={r.missing} onPlayground={() => openPlayground('fields')} />
              ))}
            </ParamGroup>
            {testModeRow}
          </ParamGroups>
          <h3>Response</h3>
          <p>
            The payment the gateway returns.{' '}
            {isAsync ? 'While it’s pending, redirect carries what the next step needs.' : 'There’s no redirect: it stays pending until the shopper approves.'}
          </p>
          <ResponseGroup docs={responseDocs({ redirect: isAsync, sentParams: previewParams })} response={payment?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/payments" />}
            variants={requestVariants}
            lineNumbers
            onPlayground={() => openPlayground()}
            empty="Loading…"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendPayment} disabled={!canSend || !brand || missing.length > 0 || busy === 'payment'}>
                  {busy === 'payment' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint ||
                  (missing.length > 0 && (
                    <span className="text-xs text-zinc-400">
                      Fill in {missing.length === 1 ? 'the required field' : `${missing.length} required fields`} in the{' '}
                      <button
                        type="button"
                        onClick={() => openPlayground('fields')}
                        className="font-medium text-zinc-200 underline decoration-white/30 underline-offset-2 hover:decoration-white"
                      >
                        Playground
                      </button>
                    </span>
                  ))}
                {payment && (
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => ({ ...INITIAL, flow: s.flow, form: s.form, amounts: s.amounts }))
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
            code={payment ? JSON.stringify(payment.response, null, 2) : ''}
            html={payment ? highlightJson(payment.response) : ''}
            empty="Response Details"
          />
          {payment &&
            (payment.status === 'pending' ? (
              redirect ? (
                <StepNote status="pending" title="Pending redirect.">
                  Continue to <StepLink step={redirectStep} /> to redirect the shopper.
                </StepNote>
              ) : (
                <StepNote status="pending" title="Pending.">
                  The shopper approves the payment in the app. Continue to <StepLink step={status} /> to retrieve the payment status.
                </StepNote>
              )
            ) : payment.status === 'success' ? (
              <StepNote status="success" title="Successful.">
                Continue to <StepLink step={status} /> to retrieve the payment status.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Rejected.">
                {resultText(payment)}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* Redirect the shopper (asynchronous only) */}
      {redirectStep && (
        <>
          <hr />
          <Heading level={2} id={redirectStep.id} step={redirectStep.step}>
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
              <p>The redirect object from step 1’s response.</p>
              <ParamGroups>
                <ParamGroup title="Redirect">
                  {REDIRECT_DOC.children.map((d) => (
                    <ParamDoc
                      key={d.name}
                      doc={d}
                      prefix="redirect."
                      value={d.name === 'method' ? redirect?.method : redirect?.[d.name]}
                    />
                  ))}
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
                <StepNote status="success" title="Redirect complete.">
                  Continue to <StepLink step={status} /> to retrieve the payment status.
                </StepNote>
              )}
            </Col>
          </Row>
          <PaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} redirect={redirect} title={paidBrandTitle} onOpenWindow={openWindow} />
        </>
      )}

      {/* Payment status */}
      <hr />
      <Heading level={2} id={status.id} step={status.step} tag="GET">
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
          <h3>Properties</h3>
          <RequestProperties method="GET" path="/v1/payments/{id}" base={base} />
          <h3>Path parameters</h3>
          {pathId(statusId, `The id from step ${send.step}’s response.`)}
          <h3>Response</h3>
          <p>
            The same for every payment brand. What changes is the payment type, the redirect (only while an asynchronous payment is pending), the
            customer and cart details you sent, and the result details, which follow the payment’s state.
          </p>
          <ResponseGroup docs={responseDocs({ redirect: isAsync, sentParams: previewParams })} response={state.result?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="GET"
            label={<UrlLabel base={base} path="/v1/payments/" id={statusId || ''} />}
            variants={statusVariants}
            lineNumbers
            onPlayground={() => openPlayground('credentials')}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SplitButton
                  primary={{
                    label: busy === 'status' ? 'Sending…' : 'Send request',
                    onClick: () => checkStatus(),
                    disabled: !resourcePath || busy === 'status' || !canSend,
                  }}
                  secondary={{
                    label: 'Check status',
                    icon: <RefreshIcon className={clsx('size-3.5 flex-none', busy === 'status' && 'animate-spin')} />,
                    onClick: () => checkStatus(),
                    disabled: !state.result || busy === 'status' || !canSend,
                  }}
                />
                {sendHint}
              </div>
            }
          />
          <ErrorNote message={error.status} />
          <CodeWindow
            title="Response"
            code={state.result ? JSON.stringify(state.result.response, null, 2) : ''}
            html={state.result ? highlightJson(state.result.response) : ''}
            empty="Response Details"
          />
          {state.result &&
            (state.result.status === 'success' ? (
              <StepNote status="success" title="Successful.">
                {capture ? (
                  <>
                    Continue to <StepLink step={capture} /> to capture the payment.
                  </>
                ) : (
                  <>
                    Optionally, continue to <StepLink step={manage} /> to refund it.
                  </>
                )}
              </StepNote>
            ) : state.result.status === 'pending' ? (
              <StepNote status="pending" title="Still pending.">
                {flow.mode === 'sync' ? 'The shopper hasn’t approved it yet. ' : ''}Check the status again in a moment.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Failed.">
                {resultText(state.result)}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* Capture (pre-authorization only) */}
      {capture && (
        <>
          <hr />
          <Heading level={2} id={capture.id} step={capture.step} tag="POST">
            {capture.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Initiate a server-to-server POST request over the pre-authorized payment, with payment type CP. The reserved funds are transferred from
                the shopper’s account to the merchant’s account.
                {brand?.capture.length ? ` ${brand.name} allows ${brand.capture.join(' and ').toLowerCase()} captures.` : ''}
              </p>
              <h3>Properties</h3>
              <RequestProperties method="POST" path="/v1/payments/{id}" base={base} />
              <h3>Path parameters</h3>
              {pathId(paymentId, 'The id of the pre-authorization, from step 1’s response.')}
              <h3>Body parameters</h3>
              <p>Set the capture amount in the {playgroundLink('back-office')}.</p>
              {backOfficeGroups('capture', 'CP', {
                amount: 'The amount to capture: all of the pre-authorization, or part of it.',
                currency: 'The pre-authorization’s currency.',
              })}
              <h3>Response</h3>
              <ResponseGroup docs={responseDocs({ backOffice: true })} response={state.capture?.response} />
              {!approved && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the pre-authorization is approved.</p>}
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="POST"
                label={<UrlLabel base={base} path="/v1/payments/" id={paymentId || ''} />}
                variants={captureVariants}
                lineNumbers
                onPlayground={() => openPlayground('back-office')}
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SendButton onClick={() => backOffice('capture')} disabled={!approved || busy === 'capture' || !canSend}>
                      {busy === 'capture' ? 'Sending…' : 'Send request'}
                    </SendButton>
                    {sendHint}
                  </div>
                }
              />
              <ErrorNote message={error.capture} />
              <CodeWindow
                title="Response"
                code={state.capture ? JSON.stringify(state.capture.response, null, 2) : ''}
                html={state.capture ? highlightJson(state.capture.response) : ''}
                empty="Response Details"
              />
              {state.capture &&
                (state.capture.status === 'success' ? (
                  <StepNote status="success" title="Captured.">
                    Optionally, continue to <StepLink step={manage} /> to refund it.
                  </StepNote>
                ) : state.capture.status === 'pending' ? (
                  <StepNote status="pending" title="Pending.">
                    The payment brand is processing the capture.
                  </StepNote>
                ) : (
                  <StepNote status="failed" title="Failed.">
                    {resultText(state.capture)}
                  </StepNote>
                ))}
            </Col>
          </Row>
        </>
      )}

      {/* Manage the payment: refund */}
      <hr />
      <Heading level={2} id={manage.id} step={manage.step} tag="POST">
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
              <h3>Properties</h3>
              <RequestProperties method="POST" path="/v1/payments/{id}" base={base} />
              <h3>Path parameters</h3>
              {pathId(refundTargetId, flow.tx === 'PA' ? 'The id of the capture, from its response.' : 'The id of the debit, from step 1’s response.')}
              <h3>Body parameters</h3>
              <p>Set the refund amount in the {playgroundLink('back-office')}.</p>
              {backOfficeGroups('refund', 'RF', {
                amount: 'The amount to refund: all of it, or part of it.',
                currency: 'The payment’s currency.',
              })}
              <h3>Response</h3>
              <ResponseGroup docs={responseDocs({ backOffice: true })} response={state.refund?.response} />
              {!refundReady && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the {flow.tx === 'PA' ? 'capture' : 'payment'} is successful.</p>
              )}
            </>
          )}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/payments/" id={refundTargetId || ''} />}
            variants={refundVariants}
            lineNumbers
            onPlayground={() => openPlayground('back-office')}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={() => backOffice('refund')} disabled={!refundReady || !brand?.refunds.length || busy === 'refund' || !canSend}>
                  {busy === 'refund' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint}
              </div>
            }
          />
          <ErrorNote message={error.refund} />
          <CodeWindow
            title="Response"
            code={state.refund ? JSON.stringify(state.refund.response, null, 2) : ''}
            html={state.refund ? highlightJson(state.refund.response) : ''}
            empty="Response Details"
          />
          {state.refund &&
            (state.refund.status === 'success' ? (
              <StepNote status="success" title="Refunded." />
            ) : state.refund.status === 'pending' ? (
              <StepNote status="pending" title="Refund pending.">
                The refund was accepted (000.200.001) while the payment brand processes it. The final result arrives by webhook in production.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Failed.">
                {resultText(state.refund)}
              </StepNote>
            ))}
        </Col>
      </Row>

      <Playground open={playground.open} focus={playground.focus} onClose={() => setPlayground((p) => ({ ...p, open: false }))} pg={pg} />
    </>
  )
}
