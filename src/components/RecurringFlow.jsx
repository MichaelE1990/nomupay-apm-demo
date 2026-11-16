'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ErrorNote } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton, UrlLabel } from '@/components/CodeWindow'
import { Col, Note, Row } from '@/components/content'
import { StatusBadge, Toggle } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { ParamDoc, ParamList, RequestProperties } from '@/components/params'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { CalendarIcon, CardIcon, DECLINE_OPTIONS, RecurringPlayground } from '@/components/RecurringPlayground'
import { StepLink, StepNote, resultText } from '@/components/S2SFlow'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import { SelectMenu } from '@/components/select'
import { newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { highlightJs, highlightJson, requestCode } from '@/lib/highlight'
import { REDIRECT_DOC } from '@/lib/paramDocs'
import {
  AGREEMENTS,
  BROWSER_KEYS,
  CUSTOMER_KEYS,
  DECLINE_CODE,
  DECLINE_CODES,
  buildDeleteParams,
  buildInitialParams,
  buildRepeatedCardParams,
  buildRepeatedParams,
  collectBrowser,
  defaultForm,
  missingInitial,
} from '@/lib/recurring'
import { INITIAL_RESPONSE_DOCS, MANAGE_RESPONSE_DOCS, REPEATED_RESPONSE_DOCS, recDoc } from '@/lib/recurringDocs'
import { RETURN_MESSAGE, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.recurring.v1'
const INITIAL = {
  flow: { mode: 'scheduled', tx: 'RECURRING' },
  form: defaultForm(),
  initial: null,
  result: null,
  returned: false,
  attempts: [],
  manage: null,
}

// The gateway allows two status requests a minute for each payment
const STATUS_LIMIT = 2
const STATUS_WINDOW_MS = 60000
const THROTTLED_TEXT = 'The gateway allows two status checks a minute for each payment.'
const MAX_ATTEMPTS = 12

// Shown instead of the demo's own values: the request carries the real ones
const SHOPPER_RESULT_URL_SHOWN = 'https://demo/paymentresult'
const ENTITY_SHOWN = '{entity_id}'
const IP_SHOWN = '{shopper_ip}'
const NEGATIVE_TESTING_URL = 'https://support.nomupay.com/hc/en-gb/articles/29608579129233-Negative-Testing-Integration-Sheet'
const COF_URL = 'https://nomupay.docs.oppwa.com/cof'
const THREEDS_TESTING_URL = 'https://nomupay.docs.oppwa.com/tutorials/threeDSecure/TestingGuide'

// The fourth party here is the card issuer, not a payment brand
const LANES = [
  { id: 'shopper', label: 'Shopper', bar: 'bg-emerald-500 dark:bg-emerald-400' },
  { id: 'server', label: 'Merchant server', bar: 'bg-amber-500 dark:bg-amber-400' },
  { id: 'gateway', label: 'Payment gateway', bar: 'bg-sky-500 dark:bg-sky-400' },
  { id: 'issuer', label: 'Card issuer', bar: 'bg-violet-500 dark:bg-violet-400' },
]

// The use cases: scheduled agreements (subscription, installments) and unscheduled card on file
const MODES = [
  {
    value: 'scheduled',
    title: 'Scheduled payments',
    description: 'The merchant charges the stored card on a schedule the shopper agreed to: a subscription, or a set number of installments.',
    icon: CalendarIcon,
    pattern: { y: -6, squares: [[-1, 2], [1, 3]] },
    flows: [
      { value: 'RECURRING', title: 'Subscription', types: ['RECURRING'] },
      { value: 'INSTALLMENT', title: 'Installments', types: ['INSTALLMENT'] },
    ],
  },
  {
    value: 'unscheduled',
    title: 'Unscheduled card on file',
    description: 'The merchant charges the stored card when it’s needed, with no fixed schedule, such as a top-up when the balance runs low.',
    icon: CardIcon,
    pattern: { y: 16, squares: [[0, 1], [1, 3]] },
    flows: [{ value: 'UNSCHEDULED', title: 'Unscheduled', types: ['UNSCHEDULED'] }],
  },
]

const PAYMENT_TYPES = {
  DB: 'DB, Debit: debits the account of the end customer and credits the merchant account.',
  PA: 'PA, Preauthorization: a stand-alone authorisation. A Capture (CP) with reference to the Preauthorisation (PA) will confirm the payment.',
}

// What the demo found when it tested each decline route on the 3DV2 card channel (16 Nov 2026).
// Negative testing only runs on the acquirer simulator (testMode=EXTERNAL), and it reads the
// holder of the card being charged: for a payment on a registration, that's the stored holder.
const DECLINE_FINDINGS = [
  {
    route: 'Any payment, decline code as card.holder',
    testMode: 'Not sent or INTERNAL',
    result: 'Approved: Integrator Test Mode doesn’t simulate declines',
    works: false,
  },
  {
    route: 'Initial payment, decline code as card.holder',
    testMode: 'EXTERNAL',
    result: 'Declined with the code after 3-D Secure. The card is still stored in the registration',
    works: true,
  },
  {
    route: 'Subsequent payment on that registration (decline code stored as the holder)',
    testMode: 'EXTERNAL',
    result: 'Declined with the stored code, every time',
    works: true,
  },
  {
    route: 'Subsequent payment on a registration stored as John Doe, decline code as card.holder',
    testMode: 'EXTERNAL',
    result: 'Approved: the request’s card.holder is ignored, the stored holder is used',
    works: false,
  },
  {
    route: 'Subsequent payment with the card details, decline code as card.holder',
    testMode: 'EXTERNAL',
    result: 'Declined with the code',
    works: true,
  },
  {
    route: 'Subsequent payment on a deleted registration',
    testMode: 'Any',
    result: 'Rejected: 100.150.202 registration is already deregistered',
    works: true,
  },
  {
    route: 'Change the stored card holder (POST /v1/registrations/{id})',
    testMode: 'Any',
    result: 'Not supported: 404',
    works: false,
  },
]

function flowSteps() {
  return [
    { key: 'initial', id: 'send-the-initial-payment', title: 'Send the initial payment', tag: 'POST' },
    { key: 'authenticate', id: 'authenticate-the-shopper', title: 'Authenticate the shopper' },
    { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', tag: 'GET' },
    { key: 'repeated', id: 'send-a-subsequent-payment', title: 'Send a subsequent payment', tag: 'POST' },
    { key: 'delete', id: 'delete-the-registration', title: 'Delete the registration', tag: 'DELETE', optional: true },
  ].map((s, i) => ({ ...s, step: i + 1 }))
}

function sequence(steps, paymentType) {
  let by = Object.fromEntries(steps.map((s) => [s.key, s]))
  let step = (key, extra) => ({ step: by[key].step, href: by[key].id, label: by[key].title, ...extra })
  return [
    { from: 'shopper', to: 'server', label: 'Agrees to the terms and enters the card' },
    { from: 'server', to: 'gateway', ...step('initial', { detail: `POST /v1/payments · ${paymentType} · INITIAL · CIT` }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Pending with a 3-D Secure redirect, or approved' },
    { from: 'server', to: 'issuer', ...step('authenticate', { detail: 'redirect.url', optional: true }) },
    { from: 'issuer', kind: 'note', label: 'Shopper authenticates with 3-D Secure' },
    { from: 'issuer', to: 'shopper', kind: 'response', label: 'Shopper returns to your shopperResultUrl' },
    { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Payment result and registrationId' },
    { from: 'server', kind: 'note', label: 'Stores the registrationId with the agreement' },
    { from: 'server', to: 'gateway', ...step('repeated', { detail: 'POST /v1/registrations/{id}/payments · REPEATED · MIT' }) },
    { from: 'gateway', to: 'issuer', label: 'Authorisation, shopper not present' },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Approved or declined' },
    { from: 'server', to: 'gateway', ...step('delete', { detail: 'DELETE /v1/registrations/{id}', optional: true }) },
  ]
}

// True inside the payment drawer's frame or a payment popup (see the return page)
function isEmbedded() {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute('data-embedded')
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

function shortTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

const th = 'px-3 py-2.5 text-left font-semibold whitespace-nowrap text-zinc-900 dark:text-white'
const td = 'px-3 py-2.5 align-top text-zinc-700 dark:text-zinc-300'

// A small Tailwind UI style table
function Table({ head, children, caption }) {
  return (
    <div className="not-prose my-6 xl:max-w-none">
      {caption}
      <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
        <table className="min-w-full divide-y divide-zinc-900/7.5 text-[0.8125rem] dark:divide-white/10">
          <thead className="bg-zinc-50 dark:bg-white/2.5">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function DeclineFindings() {
  return (
    <Table head={['Payment', 'testMode', 'Result on the test system']}>
      {DECLINE_FINDINGS.map((f) => (
        <tr key={f.route}>
          <td className={td}>{f.route}</td>
          <td className={clsx(td, 'font-mono text-xs whitespace-nowrap')}>{f.testMode}</td>
          <td className={td}>
            <span className="flex items-start gap-2">
              <StatusBadge status={f.works ? 'success' : 'failed'}>{f.works ? 'Declines' : 'No'}</StatusBadge>
              <span>{f.result}</span>
            </span>
          </td>
        </tr>
      ))}
    </Table>
  )
}

// Every subsequent payment sent in this agreement, newest first
function AttemptsTable({ attempts }) {
  if (!attempts.length) return null
  return (
    <Table
      head={['Time', 'Sent with', 'Amount', 'card.holder', 'testMode', 'Result', 'Status']}
      caption={
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Subsequent payments sent</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Newest first, in this agreement</p>
        </div>
      }
    >
      {attempts.map((a) => {
        let r = a.response?.result || {}
        return (
          <tr key={a.at}>
            <td className={clsx(td, 'font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>{shortTime(a.at)}</td>
            <td className={clsx(td, 'whitespace-nowrap')}>{a.route === 'card' ? 'Card details' : 'Registration'}</td>
            <td className={clsx(td, 'font-mono text-xs whitespace-nowrap')}>
              {a.amount} {a.currency}
            </td>
            <td className={clsx(td, 'font-mono text-xs whitespace-nowrap')}>{a.route === 'card' ? a.declineCode : <span className="font-sans text-zinc-500 dark:text-zinc-400">Stored</span>}</td>
            <td className={clsx(td, 'font-mono text-xs whitespace-nowrap')}>{a.testMode || '—'}</td>
            <td className={td}>
              <span className="font-mono text-xs">{r.code || a.error || '—'}</span>
              {r.description && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{r.description}</span>}
            </td>
            <td className={clsx(td, 'whitespace-nowrap')}>
              <StatusBadge status={a.status === 'success' ? 'success' : a.status === 'pending' ? 'pending' : 'failed'}>
                {a.status === 'success' ? 'Approved' : a.status === 'pending' ? 'Pending' : 'Declined'}
              </StatusBadge>
            </td>
          </tr>
        )
      })}
    </Table>
  )
}

const inputClass =
  'block w-full rounded-lg bg-white px-3 py-1.5 font-mono text-[0.8125rem] text-zinc-900 outline-1 -outline-offset-1 outline-zinc-900/10 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-500 dark:bg-white/5 dark:text-white dark:outline-white/10'

export function RecurringFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [drawerOpen, setDrawerOpen] = useState(false)
  let [playground, setPlayground] = useState({ open: false, focus: null })
  let [browser, setBrowser] = useState(null)
  let autoScrolled = useRef(false)
  let openPlayground = (focus = null) => setPlayground({ open: true, focus })

  useEffect(() => setBrowser(collectBrowser()), [])

  let flow = state.flow || INITIAL.flow
  // Saved settings from an earlier visit, with any fields added since filled from the defaults
  let saved = state.form || {}
  let form = {
    ...INITIAL.form,
    ...saved,
    threeDS: { ...INITIAL.form.threeDS, ...saved.threeDS },
    customer: { ...INITIAL.form.customer, ...saved.customer, fields: { ...INITIAL.form.customer.fields, ...saved.customer?.fields } },
    repeated: { ...INITIAL.form.repeated, ...saved.repeated },
  }
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let setRepeated = (patch) => setForm({ ...form, repeated: { ...form.repeated, ...patch } })
  let steps = flowSteps()
  let stepOf = (key) => steps.find((s) => s.key === key)

  useSyncSections([{ id: 'recurring-workflow', title: 'Recurring workflow' }, ...steps.map((s) => ({ id: s.id, step: s.step, title: s.title, tag: s.tag }))])

  // What the initial payment sends, for the preview and the request
  let initialInput = useMemo(
    () => ({
      type: flow.tx,
      paymentBrand: form.paymentBrand,
      card: form.card,
      amount: form.amount,
      currency: form.currency,
      paymentType: form.paymentType,
      merchantTransactionId: form.merchantTransactionId,
      merchantCustomerId: form.merchantCustomerId,
      agreement: form.agreement,
      customer: form.customer,
      threeDS: form.threeDS,
      browser: browser || {},
      testMode: form.testMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow.tx, state.form, browser],
  )
  let missing = useMemo(() => missingInitial(initialInput), [initialInput])
  let initialParams = useMemo(
    () =>
      buildInitialParams(
        { ...initialInput, merchantTransactionId: form.merchantTransactionId || '{generated}' },
        { entityId: ENTITY_SHOWN, shopperResultUrl: SHOPPER_RESULT_URL_SHOWN, ip: IP_SHOWN },
      ),
    [initialInput, form.merchantTransactionId],
  )

  let initial = state.initial
  let paymentId = initial?.response?.id
  let redirect = initial?.response?.redirect
  let returnResourcePath = search.get('resourcePath')
  let returnId = search.get('id')
  let resourcePath =
    (mode === 'return' && (returnResourcePath || (returnId ? `/v1/payments/${returnId}` : null))) || (paymentId ? `/v1/payments/${paymentId}` : null)
  let statusId = resourcePath?.match(/\/v1\/payments\/(\w+)/)?.[1]

  // The registration comes back with the initial payment (even while it's pending 3-D
  // Secure), but is only good to charge once that payment is approved
  let approvedResponse = state.result?.status === 'success' ? state.result.response : initial?.status === 'success' ? initial.response : null
  let registrationId = approvedResponse?.registrationId || state.result?.response?.registrationId || initial?.response?.registrationId || ''
  let approved = Boolean(approvedResponse)
  // On the test system the card is stored even when the initial payment is declined, which is
  // how you get a registration that declines (a decline code as its holder, with testMode EXTERNAL)
  let declinedInitial = state.result?.status === 'failed' || initial?.status === 'failed'
  let chargeable = Boolean(registrationId) && (approved || declinedInitial)
  let agreedAmount = approvedResponse?.amount || initial?.response?.amount || form.amount
  let agreedCurrency = approvedResponse?.currency || initial?.response?.currency || form.currency
  let deregistered = state.manage?.status === 'success'

  // The subsequent payment. Negative testing runs on the acquirer simulator (testMode EXTERNAL)
  // and reads the holder of the card charged: on the registration that's the stored holder, so a
  // simulated decline goes with the card details
  let decline = form.repeated.decline
  let declineCode = decline ? (form.repeated.code === 'custom' ? form.repeated.custom.trim() : form.repeated.code) : ''
  let declineInvalid = decline && !DECLINE_CODE.test(declineCode)
  let route = decline ? 'card' : 'registration'
  let repeatedAmount = form.repeated.amount.trim() || agreedAmount
  let repeatedInput = {
    type: flow.tx,
    recurringType: form.agreement.recurringType,
    amount: repeatedAmount,
    currency: agreedCurrency,
    testMode: form.testMode,
  }
  let cardInput = {
    ...repeatedInput,
    paymentBrand: form.paymentBrand,
    card: { number: form.card.number, expiryMonth: form.card.expiryMonth, expiryYear: form.card.expiryYear },
    holder: declineCode,
    testMode: 'EXTERNAL',
  }
  let repeatedParams =
    route === 'card'
      ? buildRepeatedCardParams({ ...cardInput, merchantTransactionId: '{generated}' }, { entityId: ENTITY_SHOWN })
      : buildRepeatedParams({ ...repeatedInput, merchantTransactionId: '{generated}' }, { entityId: ENTITY_SHOWN })
  let repeatedValues = Object.fromEntries(repeatedParams)
  let lastAttempt = state.attempts?.[0]

  // The demo always runs on the test system's card channel, with its own access token
  let canSend = Boolean(config && config.configured && config.environment === 'TEST')

  // Status requests per payment in the last minute, to stay inside the gateway's limit
  let statusCalls = useRef({})
  function statusWait(path) {
    let now = Date.now()
    let recent = (statusCalls.current[path] || []).filter((t) => now - t < STATUS_WINDOW_MS)
    statusCalls.current[path] = recent
    return recent.length < STATUS_LIMIT ? 0 : recent[0] + STATUS_WINDOW_MS - now + 250
  }

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
      let data = await postJson('/api/status', { resourcePath: path, entity: 'recurring' })
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

  // Back on the return page after a full-page 3-D Secure redirect: show step 2
  useEffect(() => {
    if (mode !== 'return' || autoScrolled.current || !ready || !resourcePath || isEmbedded()) return
    autoScrolled.current = true
    setTimeout(() => document.getElementById('authenticate-the-shopper')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
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

  let resetRun = (s) => ({ ...s, initial: null, result: null, returned: false, attempts: [], manage: null })

  function setFlow(next) {
    if (next.mode === flow.mode && next.tx === flow.tx) return
    setState((s) => {
      let recurringType = next.tx === 'UNSCHEDULED' ? '' : s.form.agreement?.recurringType || 'SUBSCRIPTION'
      return resetRun({ ...s, flow: next, form: { ...s.form, agreement: { ...s.form.agreement, recurringType } } })
    })
    setError({})
  }

  function resetPlayground() {
    setState((s) => ({ ...s, form: defaultForm() }))
  }

  async function sendInitial() {
    setBusy('initial')
    setError({})
    try {
      let data = await postJson('/api/recurring/payments', {
        ...initialInput,
        merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId(),
      })
      // A new initial payment starts a new agreement: clear the steps after it
      setState((s) => ({ ...resetRun(s), initial: { ...data, at: new Date().toISOString() } }))
    } catch (e) {
      setError({ initial: e.message })
    } finally {
      setBusy('')
    }
  }

  async function sendRepeated() {
    setBusy('repeated')
    setError({})
    let at = new Date().toISOString()
    let sentRoute = route
    try {
      let data =
        sentRoute === 'card'
          ? await postJson('/api/recurring/card-payments', { ...cardInput, merchantTransactionId: newMerchantTransactionId() })
          : await postJson(`/api/recurring/registrations/${registrationId}/payments`, { ...repeatedInput, merchantTransactionId: newMerchantTransactionId() })
      setState((s) => ({
        ...s,
        attempts: [
          { ...data, at, route: sentRoute, amount: repeatedInput.amount, currency: repeatedInput.currency, declineCode, testMode: sentRoute === 'card' ? 'EXTERNAL' : form.testMode },
          ...(s.attempts || []),
        ].slice(0, MAX_ATTEMPTS),
      }))
    } catch (e) {
      setError({ repeated: e.message })
    } finally {
      setBusy('')
    }
  }

  async function sendDelete() {
    setBusy('delete')
    setError({})
    try {
      let data = await postJson(`/api/recurring/registrations/${registrationId}`, { action: 'delete' })
      setState((s) => ({ ...s, manage: data }))
    } catch (e) {
      setError({ delete: e.message })
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
  let initialVariants = config ? requestCode({ url: `${base}/v1/payments`, params: initialParams }) : null
  let statusVariants = requestCode({ method: 'GET', url: `${base}/v1/payments/${statusId || '{id}'}`, params: [['entityId', ENTITY_SHOWN]] })
  let repeatedPath = route === 'card' ? '/v1/payments' : `/v1/registrations/${registrationId || '{id}'}/payments`
  let repeatedVariants = requestCode({ url: `${base}${repeatedPath}`, params: repeatedParams })
  let deleteVariants = requestCode({ method: 'DELETE', url: `${base}/v1/registrations/${registrationId || '{id}'}`, params: buildDeleteParams({ entityId: ENTITY_SHOWN }) })
  let snippet = redirectSnippet(redirect)
  let drawerTitle = ['3-D Secure', initial?.response?.amount && `${initial.response.amount} ${initial.response.currency || ''}`].filter(Boolean).join(' · ')

  let first = stepOf('initial')
  let authenticate = stepOf('authenticate')
  let status = stepOf('status')
  let repeated = stepOf('repeated')
  let remove = stepOf('delete')
  let modeInfo = MODES.find((m) => m.value === flow.mode)
  let flowInfo = modeInfo.flows.find((f) => f.value === flow.tx)
  let agreement = AGREEMENTS[flow.tx]
  let needs = agreement?.needs || []

  let values = Object.fromEntries(initialParams)
  let storedDecline = DECLINE_CODE.test(form.card.holder.trim()) && form.testMode === 'EXTERNAL'
  let row = (key, extra = {}) => ({ doc: recDoc(key, extra.doc), value: extra.value ?? values[key], note: extra.note, missing: missing.includes(key) })
  let groups = [
    {
      title: 'Basic payment',
      rows: [
        row('amount', { doc: { req: 'M' } }),
        row('currency', { doc: { req: 'M' } }),
        row('paymentBrand', { doc: { req: 'M' }, note: 'VISA or MASTER.' }),
        row('paymentType', { doc: { req: 'M' }, note: PAYMENT_TYPES[form.paymentType] }),
        row('merchantTransactionId', { doc: { req: 'C' }, value: form.merchantTransactionId, note: 'The demo generates one if you leave it empty.' }),
        row('shopperResultUrl', { doc: { req: 'C' }, note: 'Where the shopper comes back to after 3-D Secure. The gateway adds the payment’s id and resourcePath to it.' }),
      ],
    },
    {
      title: 'Card',
      rows: [
        row('card.number', { doc: { req: 'M' } }),
        row('card.holder', {
          doc: { req: 'M' },
          note: storedDecline
            ? `A decline code, with testMode EXTERNAL: this payment declines with ${form.card.holder.trim()}, the card is still stored, and every payment on the registration declines the same way.`
            : 'A name. To make payments on the registration decline, store a decline code here with testMode EXTERNAL (see Testing declines).',
        }),
        row('card.expiryMonth', { doc: { req: 'M' } }),
        row('card.expiryYear', { doc: { req: 'M' } }),
        row('card.cvv', { doc: { req: 'M' } }),
      ],
    },
    {
      title: 'Recurring',
      rows: [
        row('standingInstruction.mode', { doc: { req: 'M' } }),
        row('standingInstruction.source', { doc: { req: 'M' } }),
        row('standingInstruction.type', { doc: { req: 'M' }, note: agreement?.text }),
        row('standingInstruction.recurringType', { doc: { req: form.paymentBrand === 'MASTER' ? 'M' : 'C' } }),
        needs.includes('frequency') && row('standingInstruction.frequency', { doc: { req: 'C' } }),
        needs.includes('expiry') && row('standingInstruction.expiry', { doc: { req: 'C' } }),
        needs.includes('numberOfInstallments') && row('standingInstruction.numberOfInstallments', { doc: { req: 'C' } }),
        row('createRegistration', { doc: { req: 'M' } }),
        row('customer.merchantCustomerId', { doc: { req: 'O' } }),
      ].filter(Boolean),
    },
    form.customer.on && {
      title: 'Customer & billing',
      rows: CUSTOMER_KEYS.map((k) => row(k, { doc: { req: 'C' } })),
    },
    (form.threeDS.browser || form.threeDS.flow || form.threeDS.enrolled || form.threeDS.challengeIndicator) && {
      title: '3-D Secure',
      rows: [
        form.threeDS.challengeIndicator &&
          row('threeDSecure.challengeIndicator', {
            doc: { req: 'O' },
            note: form.threeDS.challengeIndicator === '04' ? 'Sent as 04: the gateway’s default for an initial CIT, sent here so it’s visible.' : null,
          }),
        ...(form.threeDS.browser
          ? [
              row('customer.ip', { doc: { req: 'M' }, note: 'Added on the server from the shopper’s request.' }),
              ...BROWSER_KEYS.map((k) => row(k, { doc: { req: k.endsWith('screenColorDepth') ? 'O' : 'M' } })),
              form.threeDS.challengeWindow && row('customer.browser.challengeWindow', { doc: { req: 'O' } }),
            ]
          : []),
        form.threeDS.enrolled && row('customParameters[3DS2_enrolled]', { doc: { req: 'T' } }),
        form.threeDS.flow && row('customParameters[3DS2_flow]', { doc: { req: 'T' } }),
      ].filter(Boolean),
    },
    form.testMode && { title: 'Testing', rows: [row('testMode', { doc: { req: 'T' } })] },
  ].filter(Boolean)

  let playgroundLink = (focus, text = 'Playground') => (
    <button type="button" onClick={() => openPlayground(focus)} className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
      {text}
    </button>
  )
  let hintButton = (focus, text) => (
    <button type="button" onClick={() => openPlayground(focus)} className="font-medium text-zinc-200 underline decoration-white/30 underline-offset-2 hover:decoration-white">
      {text}
    </button>
  )
  let sendHint =
    config && !canSend ? (
      <span className="text-xs text-zinc-400">
        {config.environment !== 'TEST' ? 'This guide only runs against the test system.' : 'The demo’s ACCESS_TOKEN isn’t set on this server.'}
      </span>
    ) : null
  // The {id} in the URL: a payment's id, or the registrationId of the stored card
  let pathId = (text, value, note) => (
    <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
      <ParamDoc doc={{ name: 'id', format: 'AN32', pattern: '[a-zA-Z0-9]{32}', req: 'M', text, example: '8ac7a4a19a5a1e4c019a5bd2f1b23c4d' }} value={value} note={note} />
    </ParamList>
  )

  let pg = { flow, setFlow, form, setForm, missing, onReset: resetPlayground }

  let threeDsRan = ['eci', 'version', 'authenticationStatus'].some((k) => (state.result?.response || initial?.response)?.threeDSecure?.[k])
  let initialNote =
    initial &&
    (initial.status === 'pending' ? (
      redirect ? (
        <StepNote status="pending" title="Pending 3-D Secure.">
          Continue to <StepLink step={authenticate} /> to send the shopper to authenticate.
        </StepNote>
      ) : (
        <StepNote status="pending" title="Pending.">
          Continue to <StepLink step={status} /> to get the payment status.
        </StepNote>
      )
    ) : initial.status === 'success' ? (
      <StepNote status="success" title="Approved, card stored.">
        The registrationId is <code className="font-mono">{initial.response?.registrationId}</code>. Continue to <StepLink step={repeated} /> to charge it.
      </StepNote>
    ) : (
      <StepNote status="failed" title={initial.response?.registrationId ? 'Declined, card stored.' : 'Declined, nothing to charge.'}>
        {resultText(initial)}
      </StepNote>
    ))

  // How the last subsequent payment came out, against what was asked for
  let attemptNote = lastAttempt && (() => {
    let code = lastAttempt.response?.result?.code
    if (lastAttempt.status === 'success')
      return (
        <StepNote status="success" title="Approved.">
          {lastAttempt.route === 'registration' && lastAttempt.testMode !== 'EXTERNAL'
            ? 'Sent without testMode EXTERNAL, so Integrator Test Mode approved it. Turn on Simulate a decline to see a declined payment.'
            : 'Turn on Simulate a decline and send it again to see how a declined payment comes back.'}
        </StepNote>
      )
    if (lastAttempt.status === 'pending')
      return (
        <StepNote status="pending" title="Pending.">
          {resultText(lastAttempt)}
        </StepNote>
      )
    if (code === '100.150.202')
      return (
        <StepNote status="failed" title="Rejected: the registration was deleted.">
          {resultText(lastAttempt)} This is how a payment on a cancelled agreement comes back.
        </StepNote>
      )
    return (
      <StepNote status="failed" title={lastAttempt.declineCode && code === lastAttempt.declineCode ? 'Declined as simulated.' : 'Declined.'}>
        {resultText(lastAttempt)}
      </StepNote>
    )
  })()

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">The demo’s ACCESS_TOKEN isn’t set on this server. Add it in Vercel under Settings, Environment Variables, then redeploy.</Note>
      )}

      {/* Recurring workflow: an overview, the requests in the flow, and the use case to try */}
      <Heading level={2} id="recurring-workflow">
        Recurring workflow
      </Heading>
      <p>
        A recurring integration has two phases. The <strong>initial payment</strong> is cardholder-initiated (CIT): the shopper is present, enters
        the card and authenticates it with 3-D Secure, and the payment stores the card in a registration. Every <strong>subsequent payment</strong>{' '}
        is merchant-initiated (MIT): your server charges the registration without the shopper, with no CVV or 3-D Secure. The{' '}
        <code>standingInstruction</code> parameters tell the card scheme which phase each payment is in. For further details refer to{' '}
        <a href={COF_URL} target="_blank" rel="noreferrer">
          Card on File
        </a>
        .
      </p>
      <p>
        The requests run on the test system’s card channel with 3-D Secure 2 (Demo Channel - 3DV2). Set up the card, the shopper and 3-D Secure in
        the {playgroundLink(null)}.
      </p>
      <h3>Transaction flow model</h3>
      <p>The requests in this flow, between the shopper, the merchant server, the payment gateway and the card issuer. Numbered requests are the steps below.</p>
      <SequenceDiagram title={`${modeInfo.title} · ${flowInfo.title}`} messages={sequence(steps, form.paymentType)} lanes={LANES} />
      <h3>Use cases</h3>
      <p>Choose the type of agreement. The steps below follow your choice.</p>
      <FlowCards modes={MODES} mode={flow.mode} tx={flow.tx} onChange={setFlow} label="Agreement" trayLabel="Agreement type" />
      <h3>Testing 3-D Secure</h3>
      <p>
        On the test system, 3-D Secure runs against a simulator. The demo sends <code>threeDSecure.challengeIndicator=04</code>, which forces a
        challenge: it’s what the gateway uses for an initial payment that stores a card. For a frictionless flow, set the indicator to 02 or the
        simulator flow to frictionless in the Playground. The test cards are in the{' '}
        <a href={THREEDS_TESTING_URL} target="_blank" rel="noreferrer">
          3D Secure Testing Guide
        </a>
        .
      </p>
      <h3>Testing declines</h3>
      <p>
        On the test system, a payment is declined with a rejection result code as the card holder (see the{' '}
        <a href={NEGATIVE_TESTING_URL} target="_blank" rel="noreferrer">
          Negative Testing Integration Sheet
        </a>
        ). Two things decide whether it’s applied:
      </p>
      <ul>
        <li>
          <strong>testMode=EXTERNAL.</strong> It sends the payment to the acquirer simulator, which applies the code. Without it, or with INTERNAL,
          the payment runs in Integrator Test Mode, which approves everything.
        </li>
        <li>
          <strong>The holder of the card charged.</strong> A payment on a registration charges the stored card, so the simulator reads the holder
          stored with the initial payment and ignores any <code>card.holder</code> in the request. A stored card can’t be changed.
        </li>
      </ul>
      <p>This is what each route did on this channel:</p>
      <DeclineFindings />
      <p>So there are two ways to see a declined subsequent payment:</p>
      <ul>
        <li>
          <strong>On the registration.</strong> Store a decline code as the card holder: in the{' '}
          {playgroundLink('testing', 'Playground’s Testing section')}, choose Set up 800.100.203. The initial payment declines with the code, then every payment on the registration in
          step {repeated.step} declines the same way.
        </li>
        <li>
          <strong>With the card details.</strong> Keep an approved registration and turn on <strong>Simulate a decline</strong> in step{' '}
          {repeated.step}: the demo sends that payment with the card details, the code and testMode=EXTERNAL.
        </li>
      </ul>
      <p>
        To see a payment on a cancelled agreement, delete the registration in step {remove.step}, then send another payment in step {repeated.step}.
      </p>

      <hr />

      {/* 1. The initial payment */}
      <Heading level={2} id={first.id} step={first.step} tag="POST">
        {first.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Initiate a server-to-server POST request with the card, the agreement as an initial cardholder-initiated payment
            (standingInstruction.mode INITIAL, source CIT) and createRegistration=true. The response is pending with a 3-D Secure redirect, and
            already carries the registrationId: charge it only once the payment is approved.
          </p>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/payments" base={base} />
          <h3>Body parameters</h3>
          <p>
            Open the {playgroundLink('payment')} to choose a test card and the amount, change the agreement, or set up 3-D Secure. For further details
            refer to{' '}
            <a href={COF_URL} target="_blank" rel="noreferrer">
              Card on File
            </a>
            .
          </p>
          <ParamGroups key={`${flow.tx}-${form.customer.on}-${form.threeDS.browser}`}>
            {groups.map((g) => (
              <ParamGroup key={g.title} title={g.title} missing={g.rows.filter((r) => r.missing).length}>
                {g.rows.map((r) => (
                  <ParamDoc key={r.doc.name} doc={r.doc} value={r.value} note={r.note} missing={r.missing} onPlayground={() => openPlayground('payment')} />
                ))}
              </ParamGroup>
            ))}
          </ParamGroups>
          <h3>Response</h3>
          <p>The payment the gateway returns. Store the registrationId: every subsequent payment uses it.</p>
          <ResponseGroup docs={INITIAL_RESPONSE_DOCS} response={initial?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/payments" />}
            variants={initialVariants}
            lineNumbers
            onPlayground={() => openPlayground()}
            empty="Loading…"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendInitial} disabled={!canSend || missing.length > 0 || busy === 'initial'}>
                  {busy === 'initial' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint ||
                  (missing.length > 0 && (
                    <span className="text-xs text-zinc-400">
                      Fill in {missing.length === 1 ? 'the required field' : `${missing.length} required fields`} in the {hintButton('payment', 'Playground')}
                    </span>
                  ))}
                {initial && (
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => resetRun(s))
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
          <ErrorNote message={error.initial} />
          <CodeWindow
            title="Response"
            code={initial ? JSON.stringify(initial.response, null, 2) : ''}
            html={initial ? highlightJson(initial.response) : ''}
            empty="Response Details"
          />
          {initialNote}
        </Col>
      </Row>

      {/* 2. 3-D Secure */}
      <hr />
      <Heading level={2} id={authenticate.id} step={authenticate.step}>
        {authenticate.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Redirect the shopper to the redirect URL from step {first.step}’s response, with its parameters and the method it gives. The shopper
            authenticates with their card issuer (3-D Secure), then returns to your shopperResultUrl. Here the issuer’s page opens in a drawer, so
            you stay on this page.
          </p>
          <h3>Response parameters</h3>
          <p>The redirect object from step {first.step}’s response.</p>
          <ParamGroups>
            <ParamGroup title="Redirect">
              {REDIRECT_DOC.children.map((d) => (
                <ParamDoc key={d.name} doc={d} prefix="redirect." value={d.name === 'method' ? redirect?.method : redirect?.[d.name]} />
              ))}
            </ParamGroup>
          </ParamGroups>
          {initial && !redirect && initial.status === 'success' && (
            <Note>No 3-D Secure was needed: the payment was approved straight away. Skip to step {repeated.step}.</Note>
          )}
        </Col>
        <Col sticky>
          <CodeWindow
            title="JavaScript"
            label={`Redirect details from step ${first.step}`}
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
            <StepNote status="success" title="Authentication complete.">
              Continue to <StepLink step={status} /> to get the payment status.
            </StepNote>
          )}
        </Col>
      </Row>
      <PaymentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} redirect={redirect} title={drawerTitle} onOpenWindow={openWindow} />

      {/* 3. Payment status */}
      <hr />
      <Heading level={2} id={status.id} step={status.step} tag="GET">
        {status.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Send a GET request for the payment with your entityId to get the result. After 3-D Secure, the shopper comes back to your
            shopperResultUrl with the id and resourcePath parameters. Once the payment is approved, the registrationId is ready to charge.{' '}
            {THROTTLED_TEXT}
          </p>
          <h3>Properties</h3>
          <RequestProperties method="GET" path="/v1/payments/{id}" base={base} />
          <h3>Path parameters</h3>
          {pathId('The identifier of the payment, from its response.', statusId, `The id from step ${first.step}’s response.`)}
          <h3>Response</h3>
          <ResponseGroup docs={INITIAL_RESPONSE_DOCS.filter((d) => d.name !== 'redirect')} response={state.result?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="GET"
            label={<UrlLabel base={base} path="/v1/payments/" id={statusId || ''} />}
            variants={statusVariants}
            lineNumbers
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SplitButton
                  primary={{ label: busy === 'status' ? 'Sending…' : 'Send request', onClick: () => checkStatus(), disabled: !resourcePath || busy === 'status' || !canSend }}
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
              <StepNote status="success" title="Approved, card stored.">
                {threeDsRan && state.result.response?.threeDSecure?.flow ? `3-D Secure ${state.result.response.threeDSecure.flow} (ECI ${state.result.response.threeDSecure.eci}). ` : ''}
                The registrationId <code className="font-mono">{state.result.response?.registrationId}</code> is ready. Continue to{' '}
                <StepLink step={repeated} />.
              </StepNote>
            ) : state.result.status === 'pending' ? (
              <StepNote status="pending" title="Still pending.">
                The shopper hasn’t finished 3-D Secure yet. Check the status again in a moment.
              </StepNote>
            ) : (
              <StepNote status="failed" title={registrationId ? 'Declined, card stored.' : 'Declined, nothing to charge.'}>
                {resultText(state.result)}
                {registrationId && (
                  <>
                    {' '}
                    The test system still stored the card in the registration, so you can charge it in <StepLink step={repeated} />. In production, don’t
                    charge a registration whose initial payment was declined.
                  </>
                )}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* 4. Subsequent payment */}
      <hr />
      <Heading level={2} id={repeated.id} step={repeated.step} tag="POST">
        {repeated.title}
      </Heading>
      <Row>
        <Col>
          <p>
            When a payment is due, initiate a server-to-server POST request over the registration, with the agreement as a repeated
            merchant-initiated payment (standingInstruction.mode REPEATED, source MIT). The shopper isn’t there, so there’s no CVV and no 3-D
            Secure, and the result comes back straight away. Send it as many times as you like.
          </p>
          <div className="not-prose my-6 divide-y divide-zinc-900/7.5 rounded-xl ring-1 ring-zinc-900/7.5 dark:divide-white/10 dark:ring-white/10">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <label htmlFor="repeated-amount" className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900 dark:text-white">Amount</span>
                <span className="block text-xs/5 text-zinc-500 dark:text-zinc-400">Empty: the initial amount. A subscription can vary.</span>
              </label>
              <div className="flex w-36 flex-none items-center gap-2">
                <input
                  id="repeated-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder={agreedAmount}
                  value={form.repeated.amount}
                  onChange={(e) => setRepeated({ amount: e.target.value })}
                  className={inputClass}
                />
                <span className="font-mono text-xs text-zinc-400">{agreedCurrency}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Simulate a decline</p>
                <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                  {storedDecline
                    ? `Not needed: the registration’s stored holder is ${form.card.holder.trim()}, so payments on it already decline.`
                    : 'Sends this payment with the card details and a decline code.'}
                </p>
              </div>
              <Toggle checked={decline} label="Simulate a decline" onChange={(on) => setRepeated({ decline: on })} />
            </div>
            {decline && (
              <div className="space-y-2 px-4 py-3">
                <SelectMenu
                  id="decline-code"
                  aria-label="Decline result code"
                  options={DECLINE_OPTIONS}
                  value={form.repeated.code}
                  searchable
                  searchPlaceholder="Search codes"
                  onChange={(code) => setRepeated({ code })}
                />
                {form.repeated.code === 'custom' && (
                  <input
                    type="text"
                    aria-label="Custom result code"
                    placeholder="800.100.171"
                    value={form.repeated.custom}
                    onChange={(e) => setRepeated({ custom: e.target.value })}
                    className={inputClass}
                  />
                )}
                {declineInvalid && (
                  <p className="text-xs text-rose-700/80 dark:text-rose-300/75">Use a rejection code like 800.100.203. Success and pending codes (000.xxx.xxx) can’t be simulated.</p>
                )}
                <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                  A payment on the registration charges the stored card, and the test system reads its stored holder ({form.card.holder || 'the initial'}),
                  not one in the request. So this sends <code className="font-mono">POST /v1/payments</code> with the card from step {first.step}, the
                  code as <code className="font-mono">card.holder</code> and <code className="font-mono">testMode=EXTERNAL</code>, as a merchant that
                  stores cards itself would. The declined response looks the same as one on the registration.
                </p>
              </div>
            )}
          </div>
          <h3>Properties</h3>
          <RequestProperties method="POST" path={route === 'card' ? '/v1/payments' : '/v1/registrations/{id}/payments'} base={base} />
          {route === 'registration' && (
            <>
              <h3>Path parameters</h3>
              {pathId('The registration (stored card) to use: the registrationId from the initial payment.', registrationId, null)}
            </>
          )}
          <h3>Body parameters</h3>
          <ParamGroups key={`rep-${flow.tx}-${route}`}>
            <ParamGroup title="Basic payment">
              <ParamDoc doc={recDoc('amount', { req: 'M' })} value={repeatedValues.amount} note="Can differ from the initial amount: a variable subscription, say." />
              <ParamDoc doc={recDoc('currency', { req: 'M' })} value={repeatedValues.currency} note="The initial payment’s currency." />
              {route === 'card' && <ParamDoc doc={recDoc('paymentBrand', { req: 'M' })} value={repeatedValues.paymentBrand} />}
              <ParamDoc doc={recDoc('paymentType', { req: 'M' })} value="DB" note={PAYMENT_TYPES.DB} />
              <ParamDoc doc={recDoc('merchantTransactionId', { req: 'C' })} value="" note="The demo generates one for each payment." />
            </ParamGroup>
            {route === 'card' && (
              <ParamGroup title="Card" defaultOpen>
                <ParamDoc doc={recDoc('card.number', { req: 'M' })} value={repeatedValues['card.number']} note={`The card from step ${first.step}.`} />
                <ParamDoc
                  doc={recDoc('card.holder', {
                    req: 'T',
                    text: 'Test system only: a rejection result code here makes the acquirer simulator decline the payment with that code (negative testing). It can’t be a success or pending code (000.xxx.xxx).',
                  })}
                  value={declineCode}
                  note={DECLINE_CODES.find((d) => d.code === declineCode)?.description}
                />
                <ParamDoc doc={recDoc('card.expiryMonth', { req: 'M' })} value={repeatedValues['card.expiryMonth']} />
                <ParamDoc doc={recDoc('card.expiryYear', { req: 'M' })} value={repeatedValues['card.expiryYear']} note="No CVV: the shopper isn’t there." />
              </ParamGroup>
            )}
            <ParamGroup title="Recurring">
              <ParamDoc doc={recDoc('standingInstruction.mode', { req: 'M' })} value="REPEATED" />
              <ParamDoc doc={recDoc('standingInstruction.source', { req: 'M' })} value="MIT" />
              <ParamDoc doc={recDoc('standingInstruction.type', { req: 'M' })} value={flow.tx} note="The same as the initial payment." />
              <ParamDoc
                doc={recDoc('standingInstruction.recurringType', { req: form.paymentBrand === 'MASTER' ? 'M' : 'C' })}
                value={repeatedValues['standingInstruction.recurringType']}
              />
              {route === 'card' && (
                <ParamDoc
                  doc={recDoc('standingInstruction.initialTransactionId', { req: 'C' })}
                  value=""
                  note="Not sent: the test system doesn’t return one on the initial payment. In production, send the one the initial payment returned."
                />
              )}
            </ParamGroup>
            {(route === 'card' || form.testMode) && (
              <ParamGroup title="Testing" defaultOpen={route === 'card'}>
                <ParamDoc
                  doc={recDoc('testMode', { req: 'T' })}
                  value={repeatedValues.testMode}
                  note={
                    route === 'card'
                      ? 'EXTERNAL: the acquirer simulator applies the decline code.'
                      : repeatedValues.testMode === 'EXTERNAL'
                        ? `From the Playground. The acquirer simulator applies the stored holder${storedDecline ? ` (${form.card.holder.trim()})` : ''}.`
                        : 'From the Playground.'
                  }
                />
              </ParamGroup>
            )}
          </ParamGroups>
          <h3>Response</h3>
          <ResponseGroup docs={REPEATED_RESPONSE_DOCS} response={lastAttempt?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={route === 'card' ? <UrlLabel base={base} path="/v1/payments" /> : <UrlLabel base={base} path="/v1/registrations/" id={registrationId || ''} />}
            variants={repeatedVariants}
            lineNumbers
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendRepeated} disabled={!(decline ? approved || declinedInitial : chargeable) || !canSend || declineInvalid || busy === 'repeated'}>
                  {busy === 'repeated' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint ||
                  (!chargeable && <span className="text-xs text-zinc-400">Available once the initial payment has a result (step {status.step}).</span>)}
              </div>
            }
          />
          <ErrorNote message={error.repeated} />
          <CodeWindow
            title="Response"
            code={lastAttempt ? JSON.stringify(lastAttempt.response, null, 2) : ''}
            html={lastAttempt ? highlightJson(lastAttempt.response) : ''}
            empty="Response Details"
          />
          {attemptNote}
        </Col>
      </Row>
      <AttemptsTable attempts={state.attempts || []} />

      {/* 5. Delete the registration */}
      <hr />
      <Heading level={2} id={remove.id} step={remove.step} tag="DELETE">
        {remove.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Optional. When the agreement ends, or the shopper cancels it, delete the stored card with a DELETE request on the registration. A
            subsequent payment on it afterwards is rejected with 100.150.202, which is how a payment on a cancelled agreement comes back.
          </p>
          <p>
            There’s no request to change a stored card: when the shopper’s card changes, store the new card with a new initial payment, then delete
            the old registration.
          </p>
          <h3>Properties</h3>
          <RequestProperties method="DELETE" path="/v1/registrations/{id}" base={base} />
          <h3>Path parameters</h3>
          {pathId('The registration (stored card) to delete.', registrationId, null)}
          <h3>Response</h3>
          <ResponseGroup docs={MANAGE_RESPONSE_DOCS} response={state.manage?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="DELETE"
            label={<UrlLabel base={base} path="/v1/registrations/" id={registrationId || ''} />}
            variants={deleteVariants}
            lineNumbers
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendDelete} disabled={!registrationId || !canSend || deregistered || busy === 'delete'}>
                  {busy === 'delete' ? 'Sending…' : deregistered ? 'Deleted' : 'Send request'}
                </SendButton>
                {sendHint || (!registrationId && <span className="text-xs text-zinc-400">Available once the card is stored.</span>)}
              </div>
            }
          />
          <ErrorNote message={error.delete} />
          <CodeWindow
            title="Response"
            code={state.manage ? JSON.stringify(state.manage.response, null, 2) : ''}
            html={state.manage ? highlightJson(state.manage.response) : ''}
            empty="Response Details"
          />
          {state.manage &&
            (state.manage.status === 'success' ? (
              <StepNote status="success" title="Deleted.">
                Send another payment in <StepLink step={repeated} />, with Simulate a decline off, to see it rejected with 100.150.202.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Rejected.">
                {resultText(state.manage)}
              </StepNote>
            ))}
        </Col>
      </Row>

      <RecurringPlayground open={playground.open} focus={playground.focus} onClose={() => setPlayground((p) => ({ ...p, open: false }))} pg={pg} />
    </>
  )
}
