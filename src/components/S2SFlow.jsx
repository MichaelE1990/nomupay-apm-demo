'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  BrandFacts,
  BrandFieldRows,
  BrandSelect,
  ErrorNote,
  Extras,
  FixedValue,
  MissingFieldsHint,
  ParamRow,
  ResultSummary,
} from '@/components/builder'
import { CodeWindow, SendButton } from '@/components/CodeWindow'
import { Col, Note, Properties, Property, Row } from '@/components/content'
import { FieldBox, PanelStatus, SegmentedControl, bareInputClass } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { useSyncSections } from '@/components/SectionProvider'
import { SelectMenu } from '@/components/select'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, highlightCurl, highlightJs, highlightJson } from '@/lib/highlight'
import { RETURN_MESSAGE, redirectMethod, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { buildPaymentParams, cartSpec, cartTotal, missingFields, withBrandDefaults, withRequiredExtras } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.s2s.v5'
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

const PAYMENT_PATH = /^\/v1\/payments\/[0-9a-f]{32}$/
// The gateway allows two status requests a minute for each server-to-server payment
const STATUS_LIMIT = 2
const STATUS_WINDOW_MS = 60000
const POLL_EVERY_MS = 30000
const THROTTLED_TEXT = 'The gateway allows two status checks a minute for each payment.'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const FLOW_TEXT = {
  async: 'The shopper is redirected to the payment brand’s page to approve the payment, then comes back to your shop.',
  sync: 'No redirect: the shopper approves the payment in their app (Bizum, Swish), or you send a SEPA mandate you already hold.',
  DB: 'Takes the money in one step.',
  PA: 'Reserves the amount first, then you capture it once the shopper has approved. Only PayPay supports it.',
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

function TxTag({ children }) {
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-zinc-700 ring-1 ring-zinc-900/15 ring-inset dark:text-zinc-300 dark:ring-white/15">
      {children}
    </span>
  )
}

function StepsOverview({ steps }) {
  return (
    <ol role="list" className="not-prose my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {steps.map((s) => (
        <li key={s.key}>
          <Link
            href={`#${s.id}`}
            className="flex h-full flex-col rounded-xl p-4 ring-1 ring-zinc-900/7.5 transition hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-white/2.5"
          >
            <span className="flex items-baseline gap-2">
              <span className="text-sm text-zinc-400 tabular-nums dark:text-zinc-500">{s.step}</span>
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">{s.title}</span>
              {s.optional && <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">Optional</span>}
            </span>
            <span className="mt-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">{s.summary}</span>
            {s.tx && (
              <span className="mt-3 flex gap-1.5 pl-5">
                {s.tx.map((t) => (
                  <TxTag key={t}>{t}</TxTag>
                ))}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ol>
  )
}

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
      {children}
    </label>
  )
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
  let [origin, setOrigin] = useState('https://your-site.example')
  let [drawerOpen, setDrawerOpen] = useState(false)
  let statusRef = useRef(null)
  let autoChecked = useRef(false)

  useEffect(() => setOrigin(window.location.origin), [])

  let catalogue = useMemo(() => (config?.brands || []).filter((b) => b.type === 'wallet'), [config])
  let flow = state.flow || INITIAL.flow
  let form = state.form
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let eligible = useMemo(() => eligibleBrands(catalogue, flow), [catalogue, flow])
  let brand = eligible.find((b) => b.code === form.brands[0])
  let steps = flowSteps(flow)
  let stepOf = (key) => steps.find((s) => s.key === key)

  useSyncSections([{ id: 'how-it-works', title: 'How it works' }, ...steps.map((s) => ({ id: s.id, step: s.step, title: s.title, tag: s.tag }))])

  // Keep the chosen brand valid for the flow
  useEffect(() => {
    if (!ready || !eligible.length || brand) return
    setState((s) => ({ ...s, form: withBrand(s.form, eligible[0].code, catalogue, flow.mode) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, eligible, brand])

  // What gets sent: the flow's mode and payment type, and the cart when the brand requires one
  let sendForm = useMemo(() => withRequiredExtras({ ...form, mode: flow.mode, paymentType: flow.tx }), [form, flow])
  let amount = sendForm.extras.cart ? cartTotal(form.cart) : form.amount
  let missing = useMemo(() => missingFields({ ...sendForm, amount }), [sendForm, amount])
  let returnBase = config?.returnBase || origin
  let shopperResultUrl = `${returnBase}/server-to-server/return`
  let previewParams = useMemo(() => {
    if (!config) return []
    return buildPaymentParams(
      { ...sendForm, amount, flow: 's2s', merchantTransactionId: form.merchantTransactionId || '{generated}' },
      { entityId: config.entities?.wallet || '{entityId}', testMode: config.testMode, shopperResultUrl },
    )
  }, [config, sendForm, form.merchantTransactionId, amount, shopperResultUrl])

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

  // quiet: background check (no busy state or errors); wait: hold until the limit allows it
  async function checkStatus(path = resourcePath, { quiet = false, wait = false } = {}) {
    if (!path) return null
    let ms = statusWait(path)
    if (ms > 0 && (quiet || !wait)) {
      if (!quiet) setError({ status: `${THROTTLED_TEXT} Try again in ${Math.ceil(ms / 1000)} seconds.` })
      return null
    }
    if (!quiet) {
      setBusy('status')
      setError({})
    }
    try {
      if (ms > 0) await sleep(ms)
      statusCalls.current[path] = [...(statusCalls.current[path] || []), Date.now()]
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(path)}&entity=wallet`)
      // Too many requests says nothing about the payment: keep the last result
      if (data.status === 'throttled') {
        if (!quiet) setError({ status: `${THROTTLED_TEXT} Wait a moment and check again.` })
        return null
      }
      setState((s) => ({ ...s, result: data }))
      return data
    } catch (e) {
      if (!quiet) setError({ status: e.message })
      return null
    } finally {
      if (!quiet) setBusy('')
    }
  }

  let scrollToStatus = () => setTimeout(() => statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)

  // Back on the return page after a full-page redirect: read the result straight away.
  // Inside the drawer or a popup the demo page does this instead.
  useEffect(() => {
    if (mode !== 'return' || autoChecked.current || !config?.configured || !ready || !resourcePath || isEmbedded()) return
    autoChecked.current = true
    checkStatus().then(scrollToStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, config, resourcePath, ready])

  let latest = useRef({})
  latest.current = { checkStatus, resourcePath, paymentId }

  // The return page in the drawer (or popup) tells this page when the shopper is back
  useEffect(() => {
    let allowed = [window.location.origin]
    try {
      if (config?.returnBase) allowed.push(new URL(config.returnBase).origin)
    } catch {}
    function onMessage(e) {
      if (!allowed.includes(e.origin) || e.data?.type !== RETURN_MESSAGE) return
      let { paymentId: current, resourcePath: path } = latest.current
      if (current && e.data.id && e.data.id !== current) return
      setDrawerOpen(false)
      setState((s) => ({ ...s, returned: true }))
      latest.current.checkStatus(PAYMENT_PATH.test(e.data.resourcePath || '') ? e.data.resourcePath : path, { wait: true }).then(scrollToStatus)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [config, setState])

  // While the drawer is open, also check the status every 30 seconds (inside the gateway's
  // limit): once the shopper approves or declines, the drawer closes even if the payment
  // page can't finish its redirect inside the frame
  useEffect(() => {
    if (!drawerOpen || !paymentId) return
    let stopped = false
    let path = `/v1/payments/${paymentId}`
    let last = Date.now()
    let timer = setInterval(async () => {
      if (stopped || Date.now() - last < POLL_EVERY_MS) return
      last = Date.now()
      let data = await latest.current.checkStatus(path, { quiet: true })
      if (!stopped && data && data.status !== 'pending') {
        stopped = true
        setDrawerOpen(false)
        setState((s) => ({ ...s, returned: true }))
        scrollToStatus()
      }
    }, 5000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [drawerOpen, paymentId, setState])

  function setFlow(patch) {
    let next = { ...flow, ...patch }
    if (next.mode === 'sync') next.tx = 'DB'
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
  let entityShown = config?.entities?.wallet || '{entityId}'
  let requestCurl = config ? buildCurl({ url: `https://${apiHost}/v1/payments`, params: previewParams }) : ''
  let statusCurl = buildCurl({ method: 'GET', url: `https://${apiHost}${resourcePath || '/v1/payments/{id}'}`, params: [['entityId', entityShown]] })
  let snippet = redirectSnippet(redirect)
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
  let send = stepOf('send')
  let redirectStep = stepOf('redirect')
  let status = stepOf('status')
  let capture = stepOf('capture')
  let manage = stepOf('manage')

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">Payment requests are off. Add ENTITY_ID and ACCESS_TOKEN in Vercel under Settings, Environment Variables, then redeploy.</Note>
      )}

      {/* How it works: the flow and the brand, before the steps */}
      <Heading level={2} id="how-it-works">
        How it works
      </Heading>
      <p>Choose how the payment runs and the payment brand. The steps below follow your choice.</p>
      <div className="not-prose my-6 grid grid-cols-1 gap-6">
        <div>
          <FieldLabel>Payment flow</FieldLabel>
          <SegmentedControl
            label="Payment flow"
            value={flow.mode}
            onChange={(v) => setFlow({ mode: v })}
            options={[
              { value: 'async', label: 'Asynchronous' },
              { value: 'sync', label: 'Synchronous' },
            ]}
          />
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{FLOW_TEXT[flow.mode]}</p>
        </div>
        <div>
          <FieldLabel>Transaction flow</FieldLabel>
          <SegmentedControl
            label="Transaction flow"
            value={flow.tx}
            onChange={(v) => setFlow({ tx: v })}
            options={[
              { value: 'DB', label: 'Debit' },
              {
                value: 'PA',
                label: 'Pre-authorization + Capture',
                disabled: flow.mode === 'sync',
                title: flow.mode === 'sync' ? 'No synchronous brand supports pre-authorization' : undefined,
              },
            ]}
          />
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{FLOW_TEXT[flow.tx]}</p>
        </div>
      </div>
      <div className="not-prose my-6">
        <FieldLabel htmlFor="s2s-brand">Payment brand</FieldLabel>
        <BrandSelect
          id="s2s-brand"
          brands={eligible}
          selected={brand ? [brand.code] : []}
          showDetails={false}
          onChange={([code]) =>
            setState((s) => ({ ...s, form: withBrand(s.form, code, catalogue, flow.mode), payment: null, result: null, capture: null, refund: null }))
          }
        />
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {eligible.length} payment {eligible.length === 1 ? 'brand supports' : 'brands support'} this flow.
        </p>
      </div>
      <StepsOverview steps={steps} />

      <hr />

      {/* Send the payment */}
      <Heading level={2} id={send.id} step={send.step} tag="POST" label="/v1/payments">
        {send.title}
      </Heading>
      <Row>
        <Col>
          <p>
            {flow.mode === 'sync'
              ? 'Send the debit request with the details that skip the redirect: the shopper’s mobile number for Bizum and Swish, or a SEPA mandate you already hold.'
              : flow.tx === 'PA'
                ? 'Send the pre-authorization request from your server. The amount is reserved once the shopper approves, and you capture it afterwards.'
                : 'Send the debit request from your server with the payment brand and the fields it needs. The response comes back pending, with a redirect for the next step.'}
          </p>
          {brand && (
            <>
              <h3>{brand.name}</h3>
              <BrandFacts brand={brand} />
            </>
          )}
          <h3>Request parameters</h3>
          <Properties>
            <ParamRow name="entityId" req="M" control={<FixedValue>{entityShown}</FixedValue>}>
              Your entity ID. The demo’s server adds the real one; it’s masked here.
            </ParamRow>
            <ParamRow
              name="amount"
              req="M"
              control={<AmountRow id="s2s-amount" value={amount} readOnly={sendForm.extras.cart} onChange={(v) => setForm({ ...form, amount: v })} />}
            >
              The amount to charge, with two decimals.{sendForm.extras.cart ? ' Set by the cart total below.' : ''}
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
              The three-letter currency code.{brand ? ` ${brand.name} takes ${brand.currencies.join(', ')}.` : ''}
            </ParamRow>
            <ParamRow name="paymentType" req="M" control={<FixedValue>{flow.tx}</FixedValue>}>
              {flow.tx === 'PA' ? 'PA pre-authorizes the amount for a later capture.' : 'DB debits the shopper straight away.'} Set by the transaction flow
              above.
            </ParamRow>
            <ParamRow name="paymentBrand" req="M" control={<FixedValue>{brand?.code || '—'}</FixedValue>}>
              The payment brand chosen above.
            </ParamRow>
            <ParamRow name="shopperResultUrl" type="url" req="M" control={<FixedValue>{shopperResultUrl}</FixedValue>}>
              Your page the shopper comes back to after paying.
            </ParamRow>
            {config?.testMode && (
              <ParamRow name="testMode" control={<FixedValue>{config.testMode}</FixedValue>}>
                Test only: sends the payment to the PPRO simulator. Leave it out in production.
              </ParamRow>
            )}
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
              Your own reference for the payment.
            </ParamRow>
            <BrandFieldRows
              form={{ ...form, mode: flow.mode }}
              setForm={({ mode: _mode, ...f }) => setForm(f)}
              catalogue={catalogue}
              idPrefix="s2s"
              missing={missing}
            />
          </Properties>
          <h3>Optional extras</h3>
          <Extras form={form} setForm={setForm} idPrefix="s2s" missing={missing} />
          {cart?.required.length > 0 && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">The cart is mandatory for {cart.required.join(', ')}.</p>}
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
            status={panelStatus(payment, redirect ? 'Pending · redirect' : 'Pending')}
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
                A pending response carries a redirect object. Send the shopper to its URL with its parameters, using the method it gives. Here the
                payment page opens in a drawer, so you stay on this page.
              </p>
              <Properties>
                <Property name="redirect.url" type="url">
                  The payment brand’s page to send the shopper to.
                </Property>
                <Property name="redirect.method" type="string">
                  How to send the shopper there: GET or POST. If it’s missing, use POST when there are parameters and GET when there aren’t.
                </Property>
                <Property name="redirect.parameters" type="array">
                  Name and value pairs to pass on unchanged: query parameters for GET, hidden form fields for POST.
                </Property>
                <Property name="shopperResultUrl" type="url">
                  Your page the shopper comes back to. The gateway adds the payment ID and resource path for the status check.
                </Property>
              </Properties>
              {paymentId && payment?.status === 'pending' && !redirect && (
                <Note>There’s no redirect in this response, so the shopper approves the payment in their app. Check the status in the next step.</Note>
              )}
              {state.returned && <Note>The shopper is back. The payment status is in the next step.</Note>}
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
          <PaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} redirect={redirect} title={paidBrandTitle} onOpenWindow={openWindow} />
        </>
      )}

      {/* Payment status */}
      <hr />
      <div ref={statusRef} className="scroll-mt-24" />
      <Heading level={2} id={status.id} step={status.step} tag="GET" label={resourcePath || '/v1/payments/{id}'}>
        {status.title}
      </Heading>
      <Row>
        <Col>
          <p>
            {flow.mode === 'sync'
              ? `There’s no redirect, so check the status while the shopper approves in their app. The payment stays pending until they do${brand?.timeout ? `, or until it times out after ${brand.timeout}` : ''}.`
              : 'When the shopper comes back, request the payment with your entity ID to get the outcome. Payments can stay pending for a while; check again, or rely on the webhook in production.'}{' '}
            The gateway allows two status checks a minute for each payment.
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
                When the pre-authorization is approved, capture it to take the money. Send the payment ID from step 1 with payment type CP.
                {brand?.capture.length ? ` ${brand.name} allows ${brand.capture.join(' and ').toLowerCase()} captures.` : ''}
              </p>
              <Properties>
                <ParamRow
                  name="amount"
                  req="M"
                  control={<AmountRow id="s2s-capture-amount" value={state.amounts?.capture || sentAmount} onChange={(v) => setAmount('capture', v)} />}
                >
                  The amount to capture: all of the pre-authorization, or part of it.
                </ParamRow>
                <ParamRow name="currency" req="M" control={<FixedValue>{sentCurrency}</FixedValue>}>
                  The pre-authorization’s currency.
                </ParamRow>
                <ParamRow name="paymentType" req="M" control={<FixedValue>CP</FixedValue>}>
                  CP captures the pre-authorization.
                </ParamRow>
                {config?.testMode && (
                  <ParamRow name="testMode" control={<FixedValue>{config.testMode}</FixedValue>}>
                    Test only: must match the pre-authorization, or the gateway rejects the capture.
                  </ParamRow>
                )}
              </Properties>
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
            Optional. Refund a successful {flow.tx === 'PA' ? 'capture' : 'payment'} in full or in part: send its ID with payment type RF.
            {brand?.refunds.length ? ` ${brand.name} allows ${brand.refunds.join(', ').toLowerCase()} refunds.` : ''}
          </p>
          {brand && !brand.refunds.length ? (
            <Note>{brand.name} doesn’t support refunds through the API.</Note>
          ) : (
            <>
              <Properties>
                <ParamRow
                  name="amount"
                  req="M"
                  control={<AmountRow id="s2s-refund-amount" value={state.amounts?.refund || sentAmount} onChange={(v) => setAmount('refund', v)} />}
                >
                  The amount to refund: all of it, or part of it.
                </ParamRow>
                <ParamRow name="currency" req="M" control={<FixedValue>{sentCurrency}</FixedValue>}>
                  The payment’s currency.
                </ParamRow>
                <ParamRow name="paymentType" req="M" control={<FixedValue>RF</FixedValue>}>
                  RF refunds the payment.
                </ParamRow>
                {config?.testMode && (
                  <ParamRow name="testMode" control={<FixedValue>{config.testMode}</FixedValue>}>
                    Test only: must match the original payment, or the gateway rejects the refund.
                  </ParamRow>
                )}
              </Properties>
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
