'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ErrorNote } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton, UrlLabel } from '@/components/CodeWindow'
import { Col, Note, Row } from '@/components/content'
import { SegmentedControl, StatusBadge, Toggle } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { ParamDoc, ParamList, RequestProperties } from '@/components/params'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { DECLINE_OPTIONS, RecurringPlayground } from '@/components/RecurringPlayground'
import { StepLink, StepNote, resultText } from '@/components/S2SFlow'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import { SelectMenu } from '@/components/select'
import { credentialsPayload, credentialsReady, newMerchantTransactionId, postJson, usePersistentState, useSessionCredentials } from '@/lib/flowState'
import { highlightJs, highlightJson, requestCode } from '@/lib/highlight'
import { REDIRECT_DOC } from '@/lib/paramDocs'
import {
  AGREEMENTS,
  BROWSER_KEYS,
  CUSTOMER_KEYS,
  DECLINE_CODE,
  DECLINE_CODES,
  buildInitialParams,
  buildManageParams,
  buildRepeatedParams,
  collectBrowser,
  defaultForm,
  initialTransactionIdOf,
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

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="3.25" y="4.25" width="13.5" height="12.5" rx="2" strokeWidth="1.25" fill="none" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M3.25 8.25h13.5M7 2.75v3M13 2.75v3M6.75 11.25h1.5M11.75 11.25h1.5M6.75 14h1.5" />
    </svg>
  )
}

function CardIcon(props) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <rect x="2.75" y="4.75" width="14.5" height="10.5" rx="2" strokeWidth="1.25" fill="none" />
      <path fill="none" strokeWidth="1.25" strokeLinecap="round" d="M2.75 8.25h14.5M5.75 12.25h3" />
    </svg>
  )
}

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

function flowSteps(action) {
  return [
    { key: 'initial', id: 'send-the-initial-payment', title: 'Send the initial payment', tag: 'POST' },
    { key: 'authenticate', id: 'authenticate-the-shopper', title: 'Authenticate the shopper' },
    { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', tag: 'GET' },
    { key: 'repeated', id: 'send-a-subsequent-payment', title: 'Send a subsequent payment', tag: 'POST' },
    { key: 'manage', id: 'manage-the-registration', title: 'Manage the registration', tag: action === 'delete' ? 'DELETE' : 'POST', optional: true },
  ].map((s, i) => ({ ...s, step: i + 1 }))
}

function sequence(steps, paymentType, action) {
  let by = Object.fromEntries(steps.map((s) => [s.key, s]))
  let step = (key, extra) => ({ step: by[key].step, href: by[key].id, label: by[key].title, ...extra })
  return [
    { from: 'shopper', to: 'server', label: 'Agrees to the terms and enters the card' },
    { from: 'server', to: 'gateway', ...step('initial', { detail: `POST /v1/payments · ${paymentType} · INITIAL · CIT` }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Approved with a registrationId, or pending with a 3-D Secure redirect' },
    { from: 'server', to: 'issuer', ...step('authenticate', { detail: 'redirect.url', optional: true }) },
    { from: 'issuer', kind: 'note', label: 'Shopper authenticates with 3-D Secure' },
    { from: 'issuer', to: 'shopper', kind: 'response', label: 'Shopper returns to your shopperResultUrl' },
    { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Payment result and registrationId' },
    { from: 'server', kind: 'note', label: 'Stores the registrationId with the agreement' },
    { from: 'server', to: 'gateway', ...step('repeated', { detail: 'POST /v1/registrations/{id}/payments · REPEATED · MIT' }) },
    { from: 'gateway', to: 'issuer', label: 'Authorisation, shopper not present' },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Approved or declined' },
    { from: 'server', to: 'gateway', ...step('manage', { detail: `${action === 'delete' ? 'DELETE' : 'POST'} /v1/registrations/{id}`, optional: true }) },
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

// Every subsequent payment sent on this registration, newest first
function AttemptsTable({ attempts }) {
  if (!attempts.length) return null
  return (
    <div className="not-prose mt-10 xl:max-w-none">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Subsequent payments sent</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Newest first, on this registration</p>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
        <table className="min-w-full divide-y divide-zinc-900/7.5 text-left text-[0.8125rem] dark:divide-white/10">
          <thead className="bg-zinc-50 dark:bg-white/2.5">
            <tr>
              {['Time', 'Amount', 'card.holder sent', 'Result', 'Status'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap text-zinc-900 dark:text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">
            {attempts.map((a) => {
              let r = a.response?.result || {}
              return (
                <tr key={a.at}>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-400">{shortTime(a.at)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                    {a.amount} {a.currency}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-zinc-700 dark:text-zinc-300">{a.declineCode || '—'}</td>
                  <td className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                    <span className="font-mono text-xs">{r.code || a.error || '—'}</span>
                    {r.description && <span className="block text-xs text-zinc-500 dark:text-zinc-400">{r.description}</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={a.status === 'success' ? 'success' : a.status === 'pending' ? 'pending' : 'failed'}>
                      {a.status === 'success' ? 'Approved' : a.status === 'pending' ? 'Pending' : 'Declined'}
                    </StatusBadge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RecurringFlow({ mode = 'start' }) {
  let config = useConfig()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [creds, setCreds] = useSessionCredentials()
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
  }
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let action = form.manage?.action === 'delete' ? 'delete' : 'update'
  let steps = flowSteps(action)
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

  // The registration comes back on the initial response when it's approved straight away,
  // or on the status once a 3-D Secure payment completes
  let approvedResponse = state.result?.status === 'success' ? state.result.response : initial?.status === 'success' ? initial.response : null
  let registrationId = state.result?.response?.registrationId || initial?.response?.registrationId || ''
  let initialTxId = initialTransactionIdOf(approvedResponse) || initialTransactionIdOf(initial?.response)
  let agreedAmount = approvedResponse?.amount || initial?.response?.amount || form.amount
  let agreedCurrency = approvedResponse?.currency || initial?.response?.currency || form.currency
  let deregistered = state.manage?.action === 'delete' && state.manage?.status === 'success'

  // The subsequent payment
  let declineCode = form.repeated.decline ? (form.repeated.code === 'custom' ? form.repeated.custom.trim() : form.repeated.code) : ''
  let declineInvalid = form.repeated.decline && !DECLINE_CODE.test(declineCode)
  let repeatedInput = {
    type: flow.tx,
    recurringType: form.agreement.recurringType,
    amount: form.repeated.amount.trim() || agreedAmount,
    currency: agreedCurrency,
    initialTransactionId: form.repeated.sendInitialId ? initialTxId : '',
    declineCode,
    testMode: form.testMode,
  }
  let repeatedParams = buildRepeatedParams({ ...repeatedInput, merchantTransactionId: '{generated}' }, { entityId: ENTITY_SHOWN })
  let repeatedValues = Object.fromEntries(repeatedParams)
  let lastAttempt = state.attempts?.[0]

  // Manage the registration
  let manageInput = { action, card: { holder: form.manage.holder, expiryMonth: form.manage.expiryMonth, expiryYear: form.manage.expiryYear } }
  let manageParams = buildManageParams(manageInput, { entityId: ENTITY_SHOWN })
  let manageReady = action === 'delete' || manageParams.length > 1

  // Requests go out with the demo's credentials, or the merchant's own from the Playground
  let credentials = credentialsPayload(creds)
  let credsOk = credentialsReady(creds)
  let canSend = Boolean(config && (config.configured || creds.useOwn) && credsOk && config.environment === 'TEST')

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
      let data = await postJson('/api/status', { resourcePath: path, credentials, entity: 'card' })
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
        credentials,
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
    try {
      let data = await postJson(`/api/recurring/registrations/${registrationId}/payments`, {
        ...repeatedInput,
        merchantTransactionId: newMerchantTransactionId(),
        credentials,
      })
      setState((s) => ({
        ...s,
        attempts: [{ ...data, at, amount: repeatedInput.amount, currency: repeatedInput.currency, declineCode }, ...(s.attempts || [])].slice(0, MAX_ATTEMPTS),
      }))
    } catch (e) {
      setError({ repeated: e.message })
    } finally {
      setBusy('')
    }
  }

  async function sendManage() {
    setBusy('manage')
    setError({})
    try {
      let data = await postJson(`/api/recurring/registrations/${registrationId}`, { ...manageInput, credentials })
      setState((s) => ({ ...s, manage: { ...data, action } }))
    } catch (e) {
      setError({ manage: e.message })
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
  let repeatedVariants = requestCode({ url: `${base}/v1/registrations/${registrationId || '{id}'}/payments`, params: repeatedParams })
  let manageVariants = requestCode({
    method: action === 'delete' ? 'DELETE' : 'POST',
    url: `${base}/v1/registrations/${registrationId || '{id}'}`,
    params: manageParams,
  })
  let snippet = redirectSnippet(redirect)
  let drawerTitle = ['3-D Secure', initial?.response?.amount && `${initial.response.amount} ${initial.response.currency || ''}`].filter(Boolean).join(' · ')

  let first = stepOf('initial')
  let authenticate = stepOf('authenticate')
  let status = stepOf('status')
  let repeated = stepOf('repeated')
  let manage = stepOf('manage')
  let modeInfo = MODES.find((m) => m.value === flow.mode)
  let flowInfo = modeInfo.flows.find((f) => f.value === flow.tx)
  let agreement = AGREEMENTS[flow.tx]
  let needs = agreement?.needs || []

  let values = Object.fromEntries(initialParams)
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
        row('card.holder', { doc: { req: 'M' }, note: 'A decline code here (negative testing) declines the initial payment, so the card isn’t stored.' }),
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
  let sendHint = !canSend ? (
    <span className="text-xs text-zinc-400">
      {config && config.environment !== 'TEST'
        ? 'This guide only runs against the test system.'
        : config && !config.configured && !creds.useOwn
          ? 'Add your test credentials in the '
          : 'Enter your test credentials in the '}
      {config?.environment === 'TEST' && hintButton('credentials', 'Playground')}
    </span>
  ) : null
  // The {id} in the URL: a payment's id, or the registrationId of the stored card
  let pathId = (text, value, note) => (
    <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
      <ParamDoc doc={{ name: 'id', format: 'AN32', pattern: '[a-zA-Z0-9]{32}', req: 'M', text, example: '8ac7a4a19a5a1e4c019a5bd2f1b23c4d' }} value={value} note={note} />
    </ParamList>
  )

  let pg = {
    config,
    creds,
    setCreds,
    flow,
    setFlow,
    form,
    setForm,
    missing,
    onReset: resetPlayground,
    initialAmount: agreedAmount,
    initialCurrency: agreedCurrency,
  }

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
        {initial.response?.registrationId ? (
          <>
            The registrationId is <code className="font-mono">{initial.response.registrationId}</code>. Continue to <StepLink step={repeated} /> to charge it.
          </>
        ) : (
          <>
            No registrationId came back: check the entity can store cards. Continue to <StepLink step={status} /> to read the payment.
          </>
        )}
        {/* The gateway echoes the challengeIndicator it was sent; authentication results mean 3-D Secure ran */}
        {['eci', 'version', 'verificationId', 'dsTransactionId', 'authenticationStatus'].some((k) => initial.response?.threeDSecure?.[k]) ? (
          <> 3-D Secure ran without a challenge (ECI {initial.response.threeDSecure.eci || 'not given'}).</>
        ) : (
          <>
            {' '}
            There’s no threeDSecure object in the response, so 3-D Secure didn’t run on this entity and the challenge settings had no effect: ask
            for 3-D Secure to be enabled on the card channel.
          </>
        )}
      </StepNote>
    ) : (
      <StepNote status="failed" title="Declined, nothing stored.">
        {resultText(initial)}
        {initial.response?.result?.code === '100.150.203' && (
          <>
            {' '}
            The gateway rejected the registration before 3-D Secure started, which is why there was no challenge. The entity isn’t a card channel
            with registrations (tokenisation) set up
            {!creds.useOwn && !config?.entities?.cardDedicated ? (
              <>
                . No <code className="font-mono">CARD_ENTITY_ID</code> is set on this demo, so cards run on the APM channel. Set it in Vercel, or use a
                card channel’s test credentials in the {playgroundLink('credentials')}.
              </>
            ) : (
              <>. Check the entity is the card channel, in the {playgroundLink('credentials')}.</>
            )}
          </>
        )}
      </StepNote>
    ))

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">
          The demo’s credentials aren’t set on this server. Use your own test credentials in the {playgroundLink('credentials')}, or add CARD_ENTITY_ID
          and CARD_ACCESS_TOKEN (or ENTITY_ID and ACCESS_TOKEN) in Vercel under Settings, Environment Variables, then redeploy.
        </Note>
      )}
      {config && config.configured && !config.entities?.cardDedicated && !creds.useOwn && (
        <Note tone="amber">
          No CARD_ENTITY_ID is set, so these requests use the payment brands entity. If it can’t take cards, use your own card test credentials in the{' '}
          {playgroundLink('credentials')}.
        </Note>
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
      <h3>Transaction flow model</h3>
      <p>The requests in this flow, between the shopper, the merchant server, the payment gateway and the card issuer. Numbered requests are the steps below.</p>
      <SequenceDiagram title={`${modeInfo.title} · ${flowInfo.title}`} messages={sequence(steps, form.paymentType, action)} lanes={LANES} />
      <h3>Use cases</h3>
      <p>Choose the type of agreement. The steps below follow your choice.</p>
      <FlowCards modes={MODES} mode={flow.mode} tx={flow.tx} onChange={setFlow} label="Agreement" trayLabel="Agreement type" />
      <h3>Testing 3-D Secure</h3>
      <p>
        On the test system, 3-D Secure runs against a simulator. To get a challenge, use a challenge test card (Visa 4200000000000042, Mastercard
        5200000000000015), or force one with <code>customParameters[3DS2_flow]=challenge</code> or <code>threeDSecure.challengeIndicator=04</code>{' '}
        (see the{' '}
        <a href={THREEDS_TESTING_URL} target="_blank" rel="noreferrer">
          3D Secure Testing Guide
        </a>
        ). The demo sends 04 by default: it’s what the gateway uses for an initial payment that stores a card. Either way, the entity must be a card
        channel with 3-D Secure enabled.
      </p>
      <h3>Testing declines</h3>
      <p>
        On the test system, a payment is declined with any rejection result code you send as <code>card.holder</code> (see the{' '}
        <a href={NEGATIVE_TESTING_URL} target="_blank" rel="noreferrer">
          Negative Testing Integration Sheet
        </a>
        ). Send the initial payment with a normal holder name so the card is stored, then send the code on a subsequent payment in step{' '}
        {repeated.step}. Step {manage.step} tries two more failure cases: changing the stored card, and deleting the registration.
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
            (standingInstruction.mode INITIAL, source CIT) and createRegistration=true. If the card needs 3-D Secure, the response is pending with a
            redirect; otherwise it’s approved straight away and carries the registrationId.
          </p>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/payments" base={base} />
          <h3>Body parameters</h3>
          <p>
            Open the {playgroundLink('payment')} to choose a test card and the amount, change the agreement, or use your own test credentials. For
            further details refer to{' '}
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
            Only when step {first.step}’s response is pending with a redirect. Redirect the shopper to the redirect URL with its parameters, using
            the method it gives. The shopper authenticates with their card issuer (3-D Secure), then returns to your shopperResultUrl. Here the
            issuer’s page opens in a drawer, so you stay on this page.
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
            shopperResultUrl with the id and resourcePath parameters. Once the payment is approved, the response carries the registrationId and the
            scheme’s reference for the initial payment. {THROTTLED_TEXT}
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
            onPlayground={() => openPlayground('credentials')}
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
              <StepNote status="success" title="Approved.">
                {state.result.response?.registrationId ? (
                  <>
                    Card stored as <code className="font-mono">{state.result.response.registrationId}</code>. Continue to <StepLink step={repeated} />.
                  </>
                ) : (
                  'No registrationId on the payment: check the entity can store cards.'
                )}
              </StepNote>
            ) : state.result.status === 'pending' ? (
              <StepNote status="pending" title="Still pending.">
                The shopper hasn’t finished 3-D Secure yet. Check the status again in a moment.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Declined.">
                {resultText(state.result)}
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
            Secure, and the result comes back straight away. Send it as many times as you like to see how each decline comes back.
          </p>
          <div className="not-prose my-6 rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">Simulate a decline</p>
                <p className="text-xs/5 text-zinc-500 dark:text-zinc-400">
                  Sends the result code as <code className="font-mono">card.holder</code>, the test system’s negative testing trigger.
                </p>
              </div>
              <Toggle
                checked={form.repeated.decline}
                label="Simulate a decline"
                onChange={(decline) => setForm({ ...form, repeated: { ...form.repeated, decline } })}
              />
            </div>
            {form.repeated.decline && (
              <div className="space-y-2 border-t border-zinc-900/7.5 px-4 py-3 dark:border-white/10">
                <SelectMenu
                  id="decline-code"
                  aria-label="Decline result code"
                  options={DECLINE_OPTIONS}
                  value={form.repeated.code}
                  searchable
                  searchPlaceholder="Search codes"
                  onChange={(code) => setForm({ ...form, repeated: { ...form.repeated, code } })}
                />
                {form.repeated.code === 'custom' && (
                  <input
                    type="text"
                    aria-label="Custom result code"
                    placeholder="800.100.171"
                    value={form.repeated.custom}
                    onChange={(e) => setForm({ ...form, repeated: { ...form.repeated, custom: e.target.value } })}
                    className="block w-full rounded-lg bg-white px-3 py-1.5 font-mono text-[0.8125rem] text-zinc-900 outline-1 -outline-offset-1 outline-zinc-900/10 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-500 dark:bg-white/5 dark:text-white dark:outline-white/10"
                  />
                )}
                {declineInvalid && <p className="text-xs text-rose-700/80 dark:text-rose-300/75">Use a rejection code like 800.100.203. Success and pending codes (000.xxx.xxx) can’t be simulated.</p>}
              </div>
            )}
          </div>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/registrations/{id}/payments" base={base} />
          <h3>Path parameters</h3>
          {pathId('The registration (stored card) to use: the registrationId from the initial payment.', registrationId, null)}
          <h3>Body parameters</h3>
          <p>Set the amount, the initialTransactionId and the decline code in the {playgroundLink('subsequent')}.</p>
          <ParamGroups key={`rep-${flow.tx}-${form.repeated.decline}-${form.repeated.sendInitialId}`}>
            <ParamGroup title="Basic payment">
              <ParamDoc doc={recDoc('amount', { req: 'M' })} value={repeatedValues.amount} note="Can differ from the initial amount: a variable subscription, say." />
              <ParamDoc doc={recDoc('currency', { req: 'M' })} value={repeatedValues.currency} note="The initial payment’s currency." />
              <ParamDoc doc={recDoc('paymentType', { req: 'M' })} value="DB" note={PAYMENT_TYPES.DB} />
              <ParamDoc doc={recDoc('merchantTransactionId', { req: 'C' })} value="" note="The demo generates one for each payment." />
            </ParamGroup>
            <ParamGroup title="Recurring">
              <ParamDoc doc={recDoc('standingInstruction.mode', { req: 'M' })} value="REPEATED" />
              <ParamDoc doc={recDoc('standingInstruction.source', { req: 'M' })} value="MIT" />
              <ParamDoc doc={recDoc('standingInstruction.type', { req: 'M' })} value={flow.tx} note="The same as the initial payment." />
              <ParamDoc
                doc={recDoc('standingInstruction.recurringType', { req: form.paymentBrand === 'MASTER' ? 'M' : 'C' })}
                value={repeatedValues['standingInstruction.recurringType']}
              />
              <ParamDoc
                doc={recDoc('standingInstruction.initialTransactionId', { req: 'O' })}
                value={repeatedValues['standingInstruction.initialTransactionId']}
                note={
                  form.repeated.sendInitialId
                    ? initialTxId
                      ? 'Sent: from the initial payment’s response.'
                      : 'On, but the initial response hasn’t returned one yet.'
                    : 'Not sent: the platform stored it with the registration.'
                }
              />
            </ParamGroup>
            {form.repeated.decline && (
              <ParamGroup title="Negative testing" defaultOpen>
                <ParamDoc
                  doc={recDoc('card.holder', {
                    req: 'T',
                    text: 'Test system only: a rejection result code here makes the acquirer simulator decline the payment with that code. It can’t be a success or pending code (000.xxx.xxx).',
                  })}
                  value={declineCode}
                  note={DECLINE_CODES.find((d) => d.code === declineCode)?.description}
                />
              </ParamGroup>
            )}
            {form.testMode && (
              <ParamGroup title="Testing">
                <ParamDoc doc={recDoc('testMode', { req: 'T' })} value={form.testMode} />
              </ParamGroup>
            )}
          </ParamGroups>
          <h3>Response</h3>
          <ResponseGroup docs={REPEATED_RESPONSE_DOCS} response={lastAttempt?.response} />
          {!registrationId && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the initial payment is approved and the card is stored.</p>}
          {deregistered && <Note tone="amber">The registration was deleted in step {manage.step}. A payment on it now should be rejected: send one to see the code.</Note>}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/registrations/" id={registrationId || ''} />}
            variants={repeatedVariants}
            lineNumbers
            onPlayground={() => openPlayground('subsequent')}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendRepeated} disabled={!registrationId || !canSend || declineInvalid || busy === 'repeated'}>
                  {busy === 'repeated' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint}
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
          {lastAttempt &&
            (lastAttempt.status === 'success' ? (
              <StepNote status="success" title={lastAttempt.declineCode ? 'Approved, the decline code was ignored.' : 'Approved.'}>
                {lastAttempt.declineCode
                  ? `The gateway didn’t apply card.holder=${lastAttempt.declineCode} on this payment. Try the other routes in step ${manage.step}.`
                  : 'Turn on Simulate a decline and send it again to test a failure.'}
              </StepNote>
            ) : lastAttempt.status === 'pending' ? (
              <StepNote status="pending" title="Pending.">
                {resultText(lastAttempt)}
              </StepNote>
            ) : (
              <StepNote status="failed" title={lastAttempt.declineCode && lastAttempt.response?.result?.code === lastAttempt.declineCode ? 'Declined as simulated.' : 'Declined.'}>
                {resultText(lastAttempt)}
              </StepNote>
            ))}
        </Col>
      </Row>
      <AttemptsTable attempts={state.attempts || []} />

      {/* 5. Manage the registration */}
      <hr />
      <Heading level={2} id={manage.id} step={manage.step} tag={manage.tag}>
        {manage.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Optional. Update the stored card when the shopper gives you new details, or delete the registration when the agreement ends. Both are
            also ways to test how your integration handles a subsequent payment that fails.
          </p>
          <SegmentedControl
            className="not-prose my-6"
            label="Registration action"
            options={[
              { value: 'update', label: 'Update the stored card' },
              { value: 'delete', label: 'Delete the registration' },
            ]}
            value={action}
            onChange={(a) => setForm({ ...form, manage: { ...form.manage, action: a } })}
          />
          {action === 'update' ? (
            <p>
              Sends new card details over the registration. The registration tokens guide documents this request for extending the token’s
              retention; it doesn’t say whether new card details here change the stored card, so check the response and then send another
              subsequent payment in step {repeated.step}. Try a decline code as the new card.holder.
            </p>
          ) : (
            <p>
              Deregisters the stored card. A deleted registration can’t be used again, so a subsequent payment on it afterwards is rejected: a
              realistic failure to test, such as a shopper who cancelled.
            </p>
          )}
          <h3>Properties</h3>
          <RequestProperties method={action === 'delete' ? 'DELETE' : 'POST'} path="/v1/registrations/{id}" base={base} />
          <h3>Path parameters</h3>
          {pathId('The registration (stored card) to use: the registrationId from the initial payment.', registrationId, null)}
          {action === 'update' && (
            <>
              <h3>Body parameters</h3>
              <p>Set the new details in the {playgroundLink('manage')}. Empty fields aren’t sent.</p>
              <ParamGroups key="manage-update">
                <ParamGroup title="Card">
                  <ParamDoc doc={recDoc('card.holder', { req: 'O' })} value={form.manage.holder} />
                  <ParamDoc doc={recDoc('card.expiryMonth', { req: 'O' })} value={form.manage.expiryMonth} />
                  <ParamDoc doc={recDoc('card.expiryYear', { req: 'O' })} value={form.manage.expiryYear} />
                </ParamGroup>
              </ParamGroups>
            </>
          )}
          <h3>Response</h3>
          <ResponseGroup docs={MANAGE_RESPONSE_DOCS} response={state.manage?.response} />
          {!registrationId && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the card is stored.</p>}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag={action === 'delete' ? 'DELETE' : 'POST'}
            label={<UrlLabel base={base} path="/v1/registrations/" id={registrationId || ''} />}
            variants={manageVariants}
            lineNumbers
            onPlayground={() => openPlayground('manage')}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendManage} disabled={!registrationId || !canSend || !manageReady || busy === 'manage'}>
                  {busy === 'manage' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint ||
                  (!manageReady && <span className="text-xs text-zinc-400">Add a new card.holder or expiry in the {hintButton('manage', 'Playground')}</span>)}
              </div>
            }
          />
          <ErrorNote message={error.manage} />
          <CodeWindow
            title="Response"
            code={state.manage ? JSON.stringify(state.manage.response, null, 2) : ''}
            html={state.manage ? highlightJson(state.manage.response) : ''}
            empty="Response Details"
          />
          {state.manage &&
            (state.manage.status === 'success' ? (
              <StepNote status="success" title={state.manage.action === 'delete' ? 'Deleted.' : 'Accepted.'}>
                Send another payment in <StepLink step={repeated} /> to see how it’s handled now.
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
