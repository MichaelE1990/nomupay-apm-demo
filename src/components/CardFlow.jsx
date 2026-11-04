'use client'

import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'

import { CardPlayground } from '@/components/CardPlayground'
import { ErrorNote } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton, UrlLabel } from '@/components/CodeWindow'
import { Col, Note, Row } from '@/components/content'
import { StatusIcon } from '@/components/forms'
import { Heading } from '@/components/Heading'
import { ParamDoc, ParamList, RequestProperties } from '@/components/params'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import {
  DEFAULT_CARD_FORM,
  DEFAULT_REPEATED,
  TEST_CARDS,
  buildCaptureParams,
  buildInitialParams,
  buildRepeatedParams,
  cofIdentifiers,
  initialError,
  readBrowserData,
  repeatedError,
} from '@/lib/cards'
import { credentialsPayload, credentialsReady, newMerchantTransactionId, postJson, usePersistentState, useSessionCredentials } from '@/lib/flowState'
import { highlightJs, highlightJson, requestCode } from '@/lib/highlight'
import { CARD_RESPONSE, CARD_RESULT_DETAILS, REDIRECT_DOC, REQUEST_DOCS, RESPONSE_BASE, requestDoc } from '@/lib/paramDocs'
import { RETURN_MESSAGE, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.cards.v1'
const INITIAL = {
  tx: 'DB',
  form: DEFAULT_CARD_FORM,
  repeated: DEFAULT_REPEATED,
  payment: null,
  result: null,
  capture: null,
  mit: null,
  returned: false,
}

const ENTITY_SHOWN = '{entity_id}'
const SHOPPER_RESULT_URL_SHOWN = 'https://demo/paymentresult'
const IP_SHOWN = '{shopper_ip}'
const COF_SHEET = 'https://paymentknowledgebase.com/spaces/PS/pages/93127627/Credential+on+File+COF+integration+sheet'
const NOMUPAY_SHEET = 'https://paymentknowledgebase.com/spaces/PS/pages/138577049/NomuPay+Integration+Sheet'
const TOKENS_DOC = 'https://nomupay.docs.oppwa.com/integrations/server-to-server/registrationtokens#duringPayment'

const STATUS_LIMIT = 2
const STATUS_WINDOW_MS = 60000

const PAYMENT_TYPES = {
  DB: 'DB, Debit: debits the account of the end customer and credits the merchant account.',
  PA: 'PA, Preauthorization: a stand-alone authorisation. A Capture (CP) with reference to the Preauthorisation (PA) will confirm the payment.',
  CP: 'CP, Capture: captures a preauthorized (PA) amount.',
}

const MODES = [
  {
    value: 'external',
    icon: 'sync',
    title: 'External 3D Secure',
    description: 'The request carries the 3D Secure results from your own MPI, as in the docs sample. No redirect.',
    flows: [
      { value: 'DB', title: 'Debit', types: ['DB'] },
      { value: 'PA', title: 'Pre-authorization + Capture', types: ['PA', 'CP'] },
    ],
  },
  {
    value: 'gateway',
    icon: 'async',
    title: 'Gateway 3D Secure',
    description: 'The gateway runs 3D Secure. The shopper may be redirected to authenticate before the payment completes.',
    flows: [
      { value: 'DB', title: 'Debit', types: ['DB'] },
      { value: 'PA', title: 'Pre-authorization + Capture', types: ['PA', 'CP'] },
    ],
  },
]

function flowSteps(tx, threeDS) {
  return [
    { key: 'initial', id: 'initial-payment', title: tx === 'PA' ? 'Pre-authorize the initial payment' : 'Perform the initial payment', tag: 'POST' },
    threeDS === 'gateway' && { key: 'authenticate', id: 'authenticate-shopper', title: 'Authenticate the shopper' },
    threeDS === 'gateway' && { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', tag: 'GET' },
    tx === 'PA' && { key: 'capture', id: 'capture-the-payment', title: 'Capture the payment', tag: 'POST' },
    { key: 'repeated', id: 'repeated-payment', title: 'Send the repeated payment', tag: 'POST' },
    { key: 'ids', id: 'card-on-file-identifiers', title: 'Card-on-file identifiers' },
  ]
    .filter(Boolean)
    .map((s, i) => ({ ...s, step: s.key === 'ids' ? undefined : i + 1 }))
}

function sequence(tx, threeDS, steps) {
  let by = Object.fromEntries(steps.map((s) => [s.key, s]))
  let step = (key, extra) => ({ step: by[key].step, href: by[key].id, label: by[key].title, ...extra })
  return [
    { from: 'shopper', to: 'server', label: 'Enters card details and agrees to store the card' },
    { from: 'server', to: 'gateway', ...step('initial', { detail: `POST /v1/payments · ${tx} · createRegistration · INITIAL / CIT` }) },
    ...(threeDS === 'gateway'
      ? [
          { from: 'gateway', to: 'server', kind: 'response', label: 'Pending, with 3D Secure redirect' },
          { from: 'server', to: 'shopper', ...step('authenticate', { detail: 'redirect.url' }) },
          { from: 'shopper', kind: 'note', label: 'Authenticates with the card issuer' },
          { from: 'gateway', to: 'brand', label: 'Authorisation (CIT)' },
          { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
          { from: 'gateway', to: 'server', kind: 'response', label: 'Result, registrationId and scheme IDs' },
        ]
      : [
          { from: 'gateway', to: 'brand', label: 'Authorisation (CIT)', detail: 'threeDSecure.* from your MPI' },
          { from: 'brand', to: 'gateway', kind: 'response', label: 'Approved, with scheme transaction ID and TLID' },
          { from: 'gateway', to: 'server', kind: 'response', label: 'Result, registrationId and scheme IDs' },
        ]),
    tx === 'PA' && { from: 'server', to: 'gateway', ...step('capture', { detail: 'POST /v1/payments/{id} · CP' }) },
    { from: 'shopper', kind: 'note', label: 'Later: shopper not present' },
    { from: 'server', to: 'gateway', ...step('repeated', { detail: 'POST /v1/registrations/{id}/payments · DB · REPEATED / MIT' }) },
    { from: 'gateway', to: 'brand', label: 'Authorisation (MIT)', detail: 'scheme IDs added from the registration' },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Repeated payment result' },
  ].filter(Boolean)
}

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

function StepLink({ step, text }) {
  if (!step) return null
  return (
    <a href={`#${step.id}`} className="font-medium underline decoration-current/30 underline-offset-2 hover:decoration-current">
      {text || `step ${step.step}`}
    </a>
  )
}

const resultText = (data) => {
  let r = data?.response?.result
  return r ? `${r.description || ''}${r.code ? ` (${r.code})` : ''}`.trim() : data?.response?.raw || ''
}

// Requirement shown for each body parameter
function requirement(key, brand) {
  if (key === 'testMode') return 'T'
  if (key === 'standingInstruction.recurringType') return brand === 'MASTER' ? 'M' : 'C'
  if (/^(card\.|paymentBrand$|paymentType$|amount$|currency$|createRegistration$|standingInstruction\.(type|mode|source)$)/.test(key)) return 'M'
  if (/^(standingInstruction\.|threeDSecure\.|customer\.browser\.|customer\.ip$|shopperResultUrl$|merchantTransactionId$)/.test(key)) return 'C'
  return 'O'
}

const NOTES = {
  'card.number': 'A published test card from the Playground. This demo never takes a real card number.',
  createRegistration: 'Stores the card when the payment succeeds; the response carries the registrationId.',
  'standingInstruction.recurringType': 'Required for Mastercard (COF sheet). Other schemes ignore it.',
  'standingInstruction.frequency': 'Used in the 3D Secure request. If it’s missing, Mastercard gets 0001 and other schemes authenticate as a normal payment.',
  'standingInstruction.expiry': 'Used in the 3D Secure request. If it’s missing, Mastercard gets 9999-12-31 and other schemes authenticate as a normal payment.',
  'customParameters[authorization_type]': 'On NomuPay a PA is a pre-authorisation unless this says FINAL_AUTHORIZATION.',
  shopperResultUrl: 'Where the shopper comes back after authenticating. The demo sends its own return page.',
  'customer.ip': 'The shopper’s IP. The demo sends the one your browser connects from.',
}

const GROUPS = [
  { title: 'Card', test: (k) => k === 'paymentBrand' || k.startsWith('card.') },
  { title: 'Basic payment', test: (k) => ['paymentType', 'amount', 'currency', 'merchantTransactionId', 'createRegistration'].includes(k) || k.startsWith('customParameters[') },
  { title: 'Card-on-file', test: (k) => k.startsWith('standingInstruction.') },
  { title: '3D Secure', test: (k) => k.startsWith('threeDSecure.') || k.startsWith('customer.browser.') || k === 'shopperResultUrl' || k === 'customer.ip' },
  { title: 'Customer', test: (k) => k === 'customer.email' || k.startsWith('billing.') },
]

function BodyGroups({ params, brand, onPlayground }) {
  let rows = params.filter(([k]) => k !== 'entityId')
  let testing = rows.filter(([k]) => k === 'testMode')
  return (
    <ParamGroups>
      {GROUPS.map((g) => {
        let list = rows.filter(([k]) => g.test(k))
        if (!list.length) return null
        return (
          <ParamGroup key={g.title} title={g.title}>
            {list.map(([k, v]) => (
              <ParamDoc
                key={k}
                doc={{ name: k, ...requestDoc(k), req: requirement(k, brand) }}
                value={v}
                note={k === 'paymentType' ? PAYMENT_TYPES[v] : NOTES[k]}
                onPlayground={onPlayground}
              />
            ))}
          </ParamGroup>
        )
      })}
      {testing.length > 0 && (
        <ParamGroup title="Testing">
          <ParamDoc
            doc={{ name: 'testMode', ...REQUEST_DOCS.testMode, req: 'T' }}
            value={testing[0][1]}
            note="EXTERNAL reaches NomuPay’s test system. Without it, the gateway’s simulator answers and connector fields such as LifecycleId don’t come back."
          />
        </ParamGroup>
      )}
    </ParamGroups>
  )
}

function responseDocs({ redirect, referenced } = {}) {
  let B = RESPONSE_BASE
  return [
    B.id,
    referenced && {
      name: 'referencedId',
      format: 'AN32',
      pattern: '[a-zA-Z0-9]{32}',
      req: 'C',
      text: 'In case of referenced payment (e.g., Capture or Refund), this field shows which payment was referenced.',
      example: '8ac7a4a1a1a0e53501a1a12ca8c62c86',
    },
    CARD_RESPONSE.registrationId,
    B.paymentType,
    B.paymentBrand,
    B.amount,
    B.currency,
    B.descriptor,
    B.merchantTransactionId,
    B.result,
    { ...B.resultDetails, children: CARD_RESULT_DETAILS },
    CARD_RESPONSE.card,
    CARD_RESPONSE.threeDSecure,
    CARD_RESPONSE.standingInstruction,
    redirect && B.redirect,
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

// The identifiers a merchant stores from the initial payment and what the repeated
// payment echoes, side by side
const ID_ROWS = [
  { key: 'registrationId', name: 'registrationId', text: 'The stored card. Repeated payments go to /v1/registrations/{registrationId}/payments.' },
  { key: 'cardholderInitiatedTransactionId', name: 'resultDetails.CardholderInitiatedTransactionID', text: 'Scheme transaction ID. From the initial payment it’s the ID to store for MITs.' },
  { key: 'lifecycleId', name: 'resultDetails.LifecycleId', text: 'Mastercard TLID. Without a registration, sent back as standingInstruction.agreementId.', mastercard: true },
  { key: 'siInitialTransactionId', name: 'standingInstruction.initialTransactionId', text: 'The initial transaction ID echoed in the standingInstruction object.' },
  { key: 'siAgreementId', name: 'standingInstruction.agreementId', text: 'The Mastercard agreement TLID echoed in the standingInstruction object.', mastercard: true },
]

function IdValue({ value, sent }) {
  if (!sent) return <span className="text-zinc-400 dark:text-zinc-500">Not sent yet</span>
  if (!value)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.6875rem]/4 font-medium text-rose-700/80 ring-1 ring-rose-600/10 ring-inset dark:bg-rose-400/10 dark:text-rose-300/75 dark:ring-rose-400/15">
        Not returned
      </span>
    )
  return <code className="font-mono text-xs break-all text-zinc-900 dark:text-white">{value}</code>
}

function IdentifiersTable({ initial, repeated, initialSent, repeatedSent, brand }) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
      <table className="min-w-full divide-y divide-zinc-900/7.5 text-left text-sm dark:divide-white/10">
        <thead className="bg-zinc-50 dark:bg-white/2.5">
          <tr>
            <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white">
              Field
            </th>
            <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white">
              Initial payment
            </th>
            <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-zinc-900 dark:text-white">
              Repeated payment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">
          {ID_ROWS.map((row) => (
            <tr key={row.key} className="align-top">
              <td className="max-w-56 px-4 py-3">
                <p className="font-mono text-xs font-semibold break-all text-zinc-900 dark:text-white">{row.name}</p>
                <p className="mt-0.5 text-xs/5 text-zinc-500 dark:text-zinc-400">
                  {row.text}
                  {row.mastercard && brand !== 'MASTER' ? ' Mastercard only.' : ''}
                </p>
              </td>
              <td className="px-4 py-3">
                <IdValue value={initial?.[row.key]} sent={initialSent} />
              </td>
              <td className="px-4 py-3">
                <IdValue value={repeated?.[row.key]} sent={repeatedSent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardFlow() {
  let config = useConfig()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [creds, setCreds] = useSessionCredentials()
  let [busy, setBusy] = useState('')
  let [error, setError] = useState({})
  let [drawerOpen, setDrawerOpen] = useState(false)
  let [playground, setPlayground] = useState({ open: false, focus: null })
  let [browser, setBrowser] = useState({})
  let openPlayground = (focus = null) => setPlayground({ open: true, focus })

  useEffect(() => setBrowser(readBrowserData()), [])

  let tx = state.tx === 'PA' ? 'PA' : 'DB'
  let form = { ...DEFAULT_CARD_FORM, ...state.form }
  let repeated = { ...DEFAULT_REPEATED, ...state.repeated }
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let setRepeated = (r) => setState((s) => ({ ...s, repeated: r }))
  let steps = flowSteps(tx, form.threeDS)
  let stepOf = (key) => steps.find((s) => s.key === key)
  useSyncSections([{ id: 'card-workflow', title: 'Payment workflow' }, ...steps.map((s) => ({ id: s.id, step: s.step, title: s.title, tag: s.tag }))])

  // Changing the flow or the 3D Secure mode starts a new payment
  function setFlow({ mode, tx: nextTx }) {
    if (mode === form.threeDS && nextTx === tx) return
    setState((s) => ({ ...s, tx: nextTx, form: { ...DEFAULT_CARD_FORM, ...s.form, threeDS: mode }, payment: null, result: null, capture: null, mit: null, returned: false }))
    setError({})
  }
  let setTx = (nextTx) => setFlow({ mode: form.threeDS, tx: nextTx })

  let formError = initialError(form)
  let previewParams = useMemo(
    () =>
      buildInitialParams(
        { ...form, paymentType: tx, merchantTransactionId: form.merchantTransactionId || '{generated}', browser },
        { entityId: ENTITY_SHOWN, shopperResultUrl: SHOPPER_RESULT_URL_SHOWN, customerIp: IP_SHOWN },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(form), tx, browser],
  )

  let payment = state.payment
  let paymentId = payment?.response?.id
  let redirect = payment?.response?.redirect
  // The response that holds the initial payment's outcome: the status after 3D Secure, or step 1's
  let initialFinal = state.result?.response?.id === paymentId && state.result ? state.result : payment
  let initialIds = cofIdentifiers(initialFinal?.response)
  let initialOk = initialFinal?.status === 'success'
  let registrationId = initialIds.registrationId
  let mitIds = cofIdentifiers(state.mit?.response)
  let resourcePath = paymentId ? `/v1/payments/${paymentId}` : null

  let credentials = credentialsPayload(creds)
  let canSend = Boolean(config && (config.configured || creds.useOwn) && credentialsReady(creds) && config.environment === 'TEST')

  let apiHost = config?.apiHost || 'eu-test.oppwa.com'
  let base = `https://${apiHost}`

  async function sendInitial() {
    setBusy('initial')
    setError({})
    try {
      let data = await postJson('/api/cards/payments', {
        form: { ...form, merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId() },
        paymentType: tx,
        browser,
        credentials,
      })
      setState((s) => ({ ...s, payment: { ...data, at: new Date().toISOString() }, result: null, capture: null, mit: null, returned: false }))
    } catch (e) {
      setError({ initial: e.message })
    } finally {
      setBusy('')
    }
  }

  let statusCalls = useRef({})
  async function checkStatus() {
    if (!resourcePath) return
    let now = Date.now()
    let recent = (statusCalls.current[resourcePath] || []).filter((t) => now - t < STATUS_WINDOW_MS)
    if (recent.length >= STATUS_LIMIT) {
      setError({ status: `The gateway allows two status checks a minute for each payment. Try again in ${Math.ceil((recent[0] + STATUS_WINDOW_MS - now) / 1000)} seconds.` })
      return
    }
    statusCalls.current[resourcePath] = [...recent, now]
    setBusy('status')
    setError({})
    try {
      let data = await postJson('/api/status', { resourcePath, credentials, entity: 'card' })
      if (data.status === 'throttled') {
        setError({ status: 'The gateway allows two status checks a minute for each payment. Wait a moment and check again.' })
        return
      }
      setState((s) => ({ ...s, result: data }))
    } catch (e) {
      setError({ status: e.message })
    } finally {
      setBusy('')
    }
  }

  async function sendCapture() {
    setBusy('capture')
    setError({})
    try {
      let data = await postJson(`/api/cards/payments/${paymentId}`, {
        amount: initialFinal?.response?.amount || form.amount,
        currency: initialFinal?.response?.currency || form.currency,
        testMode: form.testMode,
        credentials,
      })
      setState((s) => ({ ...s, capture: data }))
    } catch (e) {
      setError({ capture: e.message })
    } finally {
      setBusy('')
    }
  }

  let mitError = registrationId ? repeatedError({ registrationId, repeated, ids: initialIds }) : null
  async function sendRepeated() {
    setBusy('repeated')
    setError({})
    try {
      let data = await postJson(`/api/cards/registrations/${registrationId}/payments`, { form, repeated, ids: initialIds, credentials })
      setState((s) => ({ ...s, mit: data }))
    } catch (e) {
      setError({ repeated: e.message })
    } finally {
      setBusy('')
    }
  }

  // The return page in the drawer (or popup) says when the shopper is back from 3D Secure
  let latest = useRef({})
  latest.current = { paymentId }
  useEffect(() => {
    let allowed = [window.location.origin]
    try {
      if (config?.returnBase) allowed.push(new URL(config.returnBase).origin)
    } catch {}
    function onMessage(e) {
      if (!allowed.includes(e.origin) || e.data?.type !== RETURN_MESSAGE) return
      if (latest.current.paymentId && e.data.id && e.data.id !== latest.current.paymentId) return
      setDrawerOpen(false)
      setState((s) => ({ ...s, returned: true }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [config, setState])

  function openWindow() {
    setDrawerOpen(false)
    if (!sendShopperToPopup(redirect)) setError({ authenticate: 'The browser blocked the new window. Allow pop-ups for this site, or use the drawer.' })
  }

  function resetPlayground() {
    setState((s) => ({ ...s, form: { ...DEFAULT_CARD_FORM, threeDS: s.form?.threeDS || 'external' }, repeated: DEFAULT_REPEATED }))
  }

  let initialStep = stepOf('initial')
  let authStep = stepOf('authenticate')
  let statusStep = stepOf('status')
  let captureStep = stepOf('capture')
  let repeatedStep = stepOf('repeated')
  let idsStep = stepOf('ids')
  let modeInfo = MODES.find((m) => m.value === form.threeDS) || MODES[0]
  let flowInfo = modeInfo.flows.find((f) => f.value === tx)

  let initialVariants = requestCode({ url: `${base}/v1/payments`, params: previewParams })
  let statusVariants = requestCode({ method: 'GET', url: `${base}/v1/payments/${paymentId || '{id}'}`, params: [['entityId', ENTITY_SHOWN]] })
  let captureParams = buildCaptureParams(
    { amount: initialFinal?.response?.amount || form.amount, currency: initialFinal?.response?.currency || form.currency, testMode: form.testMode },
    { entityId: ENTITY_SHOWN },
  )
  let captureVariants = requestCode({ url: `${base}/v1/payments/${paymentId || '{id}'}`, params: captureParams })
  let repeatedParams = buildRepeatedParams({ form, repeated, ids: initialIds }, { entityId: ENTITY_SHOWN })
  let repeatedPath = `/v1/registrations/${registrationId || '{registrationId}'}/payments`
  let repeatedVariants = requestCode({ url: `${base}${repeatedPath}`, params: repeatedParams })
  let snippet = redirectSnippet(redirect)
  let cardLabel = TEST_CARDS[form.brand]?.find((c) => c.number === form.cardNumber)?.label

  let playgroundLink = (focus, text = 'Playground') => (
    <button type="button" onClick={() => openPlayground(focus)} className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300">
      {text}
    </button>
  )
  let sendHint = !canSend ? (
    <span className="text-xs text-zinc-400">
      {config?.environment === 'LIVE' ? 'Cards only run on the test system.' : 'Enter your test credentials in the '}
      {config?.environment !== 'LIVE' && (
        <button type="button" onClick={() => openPlayground('credentials')} className="font-medium text-zinc-200 underline decoration-white/30 underline-offset-2 hover:decoration-white">
          Playground
        </button>
      )}
    </span>
  ) : null

  // What the identifiers say, under the table
  let lifecycleNote = (() => {
    if (!initialFinal) return null
    if (initialFinal.status !== 'success')
      return { status: 'pending', title: 'Waiting for a successful initial payment.', text: 'The identifiers come back once the initial payment succeeds.' }
    if (form.brand !== 'MASTER') return { status: 'pending', title: 'Visa payment.', text: 'LifecycleId is the Mastercard TLID. Switch to Mastercard in the Playground to test it.' }
    if (initialIds.lifecycleId)
      return { status: 'success', title: 'LifecycleId returned.', text: `The test system returned resultDetails.LifecycleId with testMode ${form.testMode || 'not sent'}.` }
    if (form.testMode !== 'EXTERNAL')
      return {
        status: 'failed',
        title: 'No LifecycleId.',
        text: `This payment was answered by the gateway’s simulator (testMode ${form.testMode || 'not sent'}), which doesn’t return NomuPay’s connector fields. Send it again with testMode EXTERNAL.`,
      }
    if (!initialIds.hasResultDetails)
      return {
        status: 'failed',
        title: 'No resultDetails at all.',
        text: 'The response has no connector details. Check “Show connector details in response” is on for this entity.',
      }
    return {
      status: 'failed',
      title: 'No LifecycleId from NomuPay’s test system.',
      text: 'The payment reached NomuPay’s test system (EXTERNAL) and returned connector details, but no resultDetails.LifecycleId.',
    }
  })()

  let pg = {
    config,
    creds,
    setCreds,
    form,
    setForm,
    tx,
    setTx,
    repeated,
    setRepeated,
    ids: initialIds,
    onReset: resetPlayground,
  }

  return (
    <>
      {config && config.environment === 'LIVE' && <Note tone="amber">Card payments in this demo only run on the test system.</Note>}

      <Heading level={2} id="card-workflow">
        Payment workflow
      </Heading>
      <p>
        The merchant server collects the card, sends the initial payment with <code>createRegistration=true</code> and the card-on-file details,
        and stores the <code>registrationId</code> it gets back. Later, with the shopper not present, it charges the registration with a repeated
        payment (MIT). This follows scenarios 1.3 and 1.4 of the{' '}
        <a href={COF_SHEET} target="_blank" rel="noreferrer">
          Credential on File integration sheet
        </a>
        , the{' '}
        <a href={NOMUPAY_SHEET} target="_blank" rel="noreferrer">
          NomuPay Integration Sheet
        </a>{' '}
        and{' '}
        <a href={TOKENS_DOC} target="_blank" rel="noreferrer">
          tokenization during payment
        </a>
        .
      </p>
      <Note>
        Collecting card details on your own server needs PCI DSS compliance. This page only takes the published test cards, and only on the test
        system.
      </Note>
      <h3>Transaction flow model</h3>
      <SequenceDiagram title={`${modeInfo.title} · ${flowInfo?.title}`} messages={sequence(tx, form.threeDS, steps)} labels={{ brand: 'NomuPay / card scheme' }} />
      <h3>Use cases</h3>
      <p>Choose how 3D Secure runs on the initial payment, then the transaction flow. The steps below follow your choice.</p>
      <FlowCards modes={MODES} mode={form.threeDS} tx={tx} onChange={setFlow} />

      <hr />

      {/* Step 1: the initial payment (CIT) */}
      <Heading level={2} id={initialStep.id} step={initialStep.step} tag="POST">
        {initialStep.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Initiate a server-to-server POST request with the card, <code>createRegistration=true</code> and the standing instruction for the first
            payment of the series: <code>INITIAL</code> and <code>CIT</code>.{' '}
            {form.threeDS === 'gateway'
              ? 'The gateway runs 3D Secure, so the response may be pending with a redirect for the shopper to authenticate.'
              : 'The 3D Secure results come from your own MPI (the values from the docs sample), so the response is final.'}
          </p>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/payments" base={base} />
          <h3>Body parameters</h3>
          <p>
            Open the {playgroundLink('card')} to choose the card brand and test card ({cardLabel || 'test card'}), the amount, the card-on-file
            agreement and the testMode.
          </p>
          <BodyGroups params={previewParams} brand={form.brand} onPlayground={() => openPlayground('card')} />
          <h3>Response</h3>
          <ResponseGroup docs={responseDocs({ redirect: form.threeDS === 'gateway' })} response={payment?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/payments" />}
            variants={initialVariants}
            lineNumbers
            onPlayground={() => openPlayground()}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendInitial} disabled={!canSend || Boolean(formError) || busy === 'initial'}>
                  {busy === 'initial' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint || (formError && <span className="text-xs text-zinc-400">{formError}</span>)}
                {payment && (
                  <button
                    type="button"
                    onClick={() => {
                      setState((s) => ({ ...INITIAL, tx: s.tx, form: s.form, repeated: s.repeated }))
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
          <CodeWindow title="Response" code={payment ? JSON.stringify(payment.response, null, 2) : ''} html={payment ? highlightJson(payment.response) : ''} empty="Response Details" />
          {payment &&
            (payment.status === 'success' ? (
              <StepNote status="success" title={registrationId ? 'Successful, card stored.' : 'Successful.'}>
                {captureStep ? (
                  <>
                    Continue to <StepLink step={captureStep} /> to capture it, then <StepLink step={repeatedStep} /> for the repeated payment.
                  </>
                ) : (
                  <>
                    Continue to <StepLink step={repeatedStep} /> for the repeated payment, and see the <StepLink step={idsStep} text="identifiers" />.
                  </>
                )}
              </StepNote>
            ) : payment.status === 'pending' ? (
              <StepNote status="pending" title={redirect ? 'Pending 3D Secure.' : 'Pending.'}>
                {redirect ? (
                  <>
                    Continue to <StepLink step={authStep} /> to authenticate the shopper.
                  </>
                ) : (
                  <>
                    Continue to <StepLink step={statusStep} /> to get the result.
                  </>
                )}
              </StepNote>
            ) : (
              <StepNote status="failed" title="Rejected.">
                {resultText(payment)}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* Gateway 3D Secure: redirect and status */}
      {authStep && (
        <>
          <hr />
          <Heading level={2} id={authStep.id} step={authStep.step}>
            {authStep.title}
          </Heading>
          <Row>
            <Col>
              <p>
                When the response is pending with a redirect, send the shopper to the redirect URL with its parameters. The card issuer authenticates
                the shopper, then the gateway sends them to your shopperResultUrl. Here the page opens in a drawer.
              </p>
              {redirect?.preconditions?.length > 0 && (
                <Note tone="amber">
                  The response also has <code>redirect.preconditions</code> (the 3D Secure method call). A live integration loads those in a hidden
                  iframe first; the test system carries on without them.
                </Note>
              )}
              <ParamGroups>
                <ParamGroup title="Redirect">
                  {REDIRECT_DOC.children.map((d) => (
                    <ParamDoc key={d.name} doc={d} prefix="redirect." value={d.name === 'method' ? redirect?.method : redirect?.[d.name]} />
                  ))}
                </ParamGroup>
              </ParamGroups>
              {payment && !redirect && <Note>There’s no redirect in step 1’s response, so there’s nothing to authenticate. Get the status in the next step.</Note>}
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
              <ErrorNote message={error.authenticate} />
              {state.returned && (
                <StepNote status="success" title="Authentication complete.">
                  Continue to <StepLink step={statusStep} /> to get the payment result.
                </StepNote>
              )}
            </Col>
          </Row>
          <PaymentDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            redirect={redirect}
            title={`3D Secure · ${payment?.response?.amount || ''} ${payment?.response?.currency || ''}`}
            onOpenWindow={openWindow}
          />

          <hr />
          <Heading level={2} id={statusStep.id} step={statusStep.step} tag="GET">
            {statusStep.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Send a GET request for the payment with your entityId. Once the payment succeeds, the response carries the registrationId and the
                scheme identifiers. The gateway allows two status checks a minute for each payment.
              </p>
              <h3>Properties</h3>
              <RequestProperties method="GET" path="/v1/payments/{id}" base={base} />
              <h3>Path parameters</h3>
              <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
                <ParamDoc doc={{ ...REQUEST_DOCS.id, name: 'id', req: 'M' }} value={paymentId} note={`The id from step ${initialStep.step}’s response.`} />
              </ParamList>
              <h3>Response</h3>
              <ResponseGroup docs={responseDocs()} response={state.result?.response} />
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="GET"
                label={<UrlLabel base={base} path="/v1/payments/" id={paymentId || ''} />}
                variants={statusVariants}
                lineNumbers
                onPlayground={() => openPlayground('credentials')}
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SplitButton
                      primary={{ label: busy === 'status' ? 'Sending…' : 'Send request', onClick: checkStatus, disabled: !paymentId || busy === 'status' || !canSend }}
                      secondary={{
                        label: 'Check status',
                        icon: <RefreshIcon className={clsx('size-3.5 flex-none', busy === 'status' && 'animate-spin')} />,
                        onClick: checkStatus,
                        disabled: !state.result || busy === 'status' || !canSend,
                      }}
                    />
                    {sendHint}
                  </div>
                }
              />
              <ErrorNote message={error.status} />
              <CodeWindow title="Response" code={state.result ? JSON.stringify(state.result.response, null, 2) : ''} html={state.result ? highlightJson(state.result.response) : ''} empty="Response Details" />
              {state.result &&
                (state.result.status === 'success' ? (
                  <StepNote status="success" title="Successful.">
                    Continue to <StepLink step={captureStep || repeatedStep} />.
                  </StepNote>
                ) : state.result.status === 'pending' ? (
                  <StepNote status="pending" title="Still pending.">
                    The shopper hasn’t finished authenticating. Check again in a moment.
                  </StepNote>
                ) : (
                  <StepNote status="failed" title="Failed.">
                    {resultText(state.result)}
                  </StepNote>
                ))}
            </Col>
          </Row>
        </>
      )}

      {/* Capture (pre-authorisation only) */}
      {captureStep && (
        <>
          <hr />
          <Heading level={2} id={captureStep.id} step={captureStep.step} tag="POST">
            {captureStep.title}
          </Heading>
          <Row>
            <Col>
              <p>
                Initiate a server-to-server POST request over the pre-authorisation with payment type CP. The capture doesn’t need card-on-file
                parameters on NomuPay, and NomuPay sends the Mastercard lifecycle TLID itself.
              </p>
              <h3>Properties</h3>
              <RequestProperties method="POST" path="/v1/payments/{id}" base={base} />
              <h3>Path parameters</h3>
              <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
                <ParamDoc doc={{ ...REQUEST_DOCS.id, name: 'id', req: 'M' }} value={paymentId} note="The id of the pre-authorisation." />
              </ParamList>
              <h3>Body parameters</h3>
              <BodyGroups params={captureParams} brand={form.brand} />
              <h3>Response</h3>
              <ResponseGroup docs={responseDocs({ referenced: true })} response={state.capture?.response} />
              {!initialOk && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the pre-authorisation succeeds.</p>}
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="POST"
                label={<UrlLabel base={base} path="/v1/payments/" id={paymentId || ''} />}
                variants={captureVariants}
                lineNumbers
                onPlayground={() => openPlayground('payment')}
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SendButton onClick={sendCapture} disabled={!initialOk || busy === 'capture' || !canSend}>
                      {busy === 'capture' ? 'Sending…' : 'Send request'}
                    </SendButton>
                    {sendHint}
                  </div>
                }
              />
              <ErrorNote message={error.capture} />
              <CodeWindow title="Response" code={state.capture ? JSON.stringify(state.capture.response, null, 2) : ''} html={state.capture ? highlightJson(state.capture.response) : ''} empty="Response Details" />
              {state.capture &&
                (state.capture.status === 'success' ? (
                  <StepNote status="success" title="Captured.">
                    Continue to <StepLink step={repeatedStep} /> for the repeated payment.
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

      {/* Repeated payment (MIT) */}
      <hr />
      <Heading level={2} id={repeatedStep.id} step={repeatedStep.step} tag="POST">
        {repeatedStep.title}
      </Heading>
      <Row>
        <Col>
          <p>
            With the shopper not present, initiate a server-to-server POST request over the registration with payment type DB and the standing
            instruction <code>REPEATED</code> and <code>MIT</code>. There’s no CVV and no 3D Secure. Over a registration, the gateway adds the initial
            transaction ID and the Mastercard TLID from the initial payment, so both are optional: switch them on in the{' '}
            {playgroundLink('repeated')} to send them yourself.
          </p>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/registrations/{registrationId}/payments" base={base} />
          <h3>Path parameters</h3>
          <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
            <ParamDoc doc={CARD_RESPONSE.registrationId} value={registrationId} note="The registrationId from the initial payment’s response." />
          </ParamList>
          <h3>Body parameters</h3>
          <BodyGroups params={repeatedParams} brand={form.brand} onPlayground={() => openPlayground('repeated')} />
          <h3>Response</h3>
          <ResponseGroup docs={responseDocs()} response={state.mit?.response} />
          {!registrationId && <p className="text-sm text-zinc-500 dark:text-zinc-400">Available once the initial payment returns a registrationId.</p>}
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/registrations/" id={registrationId ? `${registrationId}/payments` : '{registrationId}/payments'} />}
            variants={repeatedVariants}
            lineNumbers
            onPlayground={() => openPlayground('repeated')}
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendRepeated} disabled={!registrationId || Boolean(mitError) || busy === 'repeated' || !canSend}>
                  {busy === 'repeated' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint || (mitError && <span className="text-xs text-zinc-400">{mitError}</span>)}
              </div>
            }
          />
          <ErrorNote message={error.repeated} />
          <CodeWindow title="Response" code={state.mit ? JSON.stringify(state.mit.response, null, 2) : ''} html={state.mit ? highlightJson(state.mit.response) : ''} empty="Response Details" />
          {state.mit &&
            (state.mit.status === 'success' ? (
              <StepNote status="success" title="Repeated payment successful.">
                Compare the <StepLink step={idsStep} text="identifiers" /> with the initial payment’s.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Rejected.">
                {resultText(state.mit)}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* Identifiers side by side */}
      <hr />
      <Heading level={2} id={idsStep.id}>
        {idsStep.title}
      </Heading>
      <p>
        What the merchant stores from the initial payment, and what the repeated payment returns. On NomuPay, the scheme transaction ID comes back
        in <code>resultDetails.CardholderInitiatedTransactionID</code> and the Mastercard TLID in <code>resultDetails.LifecycleId</code>.
      </p>
      <IdentifiersTable
        initial={initialIds}
        repeated={mitIds}
        initialSent={Boolean(initialFinal)}
        repeatedSent={Boolean(state.mit)}
        brand={form.brand}
      />
      {lifecycleNote && (
        <StepNote status={lifecycleNote.status} title={lifecycleNote.title}>
          {lifecycleNote.text}
        </StepNote>
      )}

      <CardPlayground open={playground.open} focus={playground.focus} onClose={() => setPlayground((p) => ({ ...p, open: false }))} pg={pg} />
    </>
  )
}
