'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

import { AftPlayground, MCC_ICONS, SchemeTag } from '@/components/AftPlayground'
import { ErrorNote } from '@/components/builder'
import { CodeWindow, NewWindowIcon, RefreshIcon, SendButton, SplitButton, UrlLabel } from '@/components/CodeWindow'
import { Col, Note, Row } from '@/components/content'
import { Heading } from '@/components/Heading'
import { ParamDoc, ParamList, RequestProperties } from '@/components/params'
import { PaymentDrawer } from '@/components/PaymentDrawer'
import { StepLink, StepNote, resultText } from '@/components/S2SFlow'
import { FlowCards, ParamGroup, ParamGroups, SequenceDiagram } from '@/components/s2sParts'
import { useSyncSections } from '@/components/SectionProvider'
import {
  AFT_BRANDS,
  AFT_PARAMETERS_URL,
  AFT_SECTION_URL,
  BROWSER_KEYS,
  CUSTOMER_KEYS,
  FUNDS_TRANSFER_TYPES,
  MCCS,
  buildAftParams,
  buildCaptureParams,
  cardForBrand,
  collectBrowser,
  defaultForm,
  getMcc,
  missingAft,
  purposeRequired,
  schemeCode,
  schemesFor,
  typeProblem,
  typesFor,
} from '@/lib/aft'
import { AFT_RESPONSE_DOCS, CAPTURE_RESPONSE_DOCS, aftDoc } from '@/lib/aftDocs'
import { newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { highlightJs, highlightJson, requestCode } from '@/lib/highlight'
import { REDIRECT_DOC } from '@/lib/paramDocs'
import { RETURN_MESSAGE, redirectSnippet, sendShopperToPopup } from '@/lib/redirect'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.aft.v1'
const INITIAL = {
  flow: { mode: MCCS[0].code, tx: MCCS[0].defaultType },
  form: defaultForm(),
  payment: null,
  result: null,
  returned: false,
  capture: null,
}

// The gateway allows two status requests a minute for each payment
const STATUS_LIMIT = 2
const STATUS_WINDOW_MS = 60000
const THROTTLED_TEXT = 'The gateway allows two status checks a minute for each payment.'

// Shown instead of the demo's own values: the request carries the real ones
const SHOPPER_RESULT_URL_SHOWN = 'https://demo/paymentresult'
const ENTITY_SHOWN = '{entity_id}'
const IP_SHOWN = '{shopper_ip}'
const THREEDS_TESTING_URL = 'https://nomupay.docs.oppwa.com/tutorials/threeDSecure/TestingGuide'

const LANES = [
  { id: 'shopper', label: 'Shopper', bar: 'bg-emerald-500 dark:bg-emerald-400' },
  { id: 'server', label: 'Merchant server', bar: 'bg-amber-500 dark:bg-amber-400' },
  { id: 'gateway', label: 'Payment gateway', bar: 'bg-sky-500 dark:bg-sky-400' },
  { id: 'issuer', label: 'Card issuer', bar: 'bg-violet-500 dark:bg-violet-400' },
]

const PATTERNS = [
  { y: -6, squares: [[-1, 2], [1, 3]] },
  { y: 16, squares: [[0, 1], [1, 3]] },
  { y: 22, squares: [[0, 2], [1, 4]] },
  { y: 4, squares: [[-1, 1], [1, 2]] },
  { y: 10, squares: [[0, 3], [1, 1]] },
]

// A long enum that can wrap after its underscores on narrow screens
const breakable = (value) =>
  value.split('_').map((part, i, all) => (
    <span key={i}>
      {part}
      {i < all.length - 1 && (
        <>
          _<wbr />
        </>
      )}
    </span>
  ))

// The use cases: one card per MCC, each with the Funds Transfer Types it can send. The MCC's
// usual type comes first: choosing a card picks it, unless the current type is allowed too
const MODES = MCCS.map((m, i) => ({
  value: m.code,
  title: `${m.code} · ${m.title}`,
  description: m.description,
  icon: MCC_ICONS[m.code],
  pattern: PATTERNS[i % PATTERNS.length],
  flows: [...typesFor(m.code)].sort((a, z) => (z.value === m.defaultType) - (a.value === m.defaultType)).map((t) => ({
    value: t.value,
    title: <code className="font-mono text-[0.8125rem]">{breakable(t.value)}</code>,
    types: [],
    meta: (
      <span className="flex flex-none gap-1">
        {t.schemes.map((s) => (
          <SchemeTag key={s} brand={s} code={t[s].code} />
        ))}
      </span>
    ),
  })),
}))

const PAYMENT_TYPES = {
  DB: 'DB, Debit: debits the account of the end customer and credits the merchant account.',
  PA: 'PA, Preauthorization: a stand-alone authorisation. A Capture (CP) with reference to the Preauthorisation (PA) will confirm the payment.',
}

function flowSteps(paymentType) {
  return [
    { key: 'payment', id: 'send-the-aft-payment', title: 'Send the AFT payment', tag: 'POST' },
    { key: 'authenticate', id: 'authenticate-the-shopper', title: 'Authenticate the shopper' },
    { key: 'status', id: 'get-the-payment-status', title: 'Get the payment status', tag: 'GET' },
    paymentType === 'PA' && { key: 'capture', id: 'capture-the-payment', title: 'Capture the payment', tag: 'POST' },
  ]
    .filter(Boolean)
    .map((s, i) => ({ ...s, step: i + 1 }))
}

function sequence(steps, { paymentType, type, brand }) {
  let by = Object.fromEntries(steps.map((s) => [s.key, s]))
  let step = (key, extra) => ({ step: by[key].step, href: by[key].id, label: by[key].title, ...extra })
  let scheme = AFT_BRANDS.find((b) => b.code === brand)
  let code = schemeCode(type, brand)
  return [
    { from: 'shopper', to: 'server', label: 'Chooses an amount to fund their account and enters the card' },
    { from: 'server', to: 'gateway', ...step('payment', { detail: `POST /v1/payments · ${paymentType} · FUNDING · ${type}` }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Pending with a 3-D Secure redirect, or approved' },
    { from: 'server', to: 'issuer', ...step('authenticate', { detail: 'redirect.url', optional: true }) },
    { from: 'issuer', kind: 'note', label: 'Shopper authenticates with 3-D Secure' },
    { from: 'issuer', to: 'shopper', kind: 'response', label: 'Shopper returns to your shopperResultUrl' },
    { from: 'gateway', to: 'issuer', label: 'Authorisation as a funding transaction', detail: code ? `${scheme.name} ${scheme.tag} ${code}` : undefined },
    { from: 'server', to: 'gateway', ...step('status', { detail: 'GET /v1/payments/{id}' }) },
    { from: 'gateway', to: 'server', kind: 'response', label: 'Approved or declined' },
    ...(by.capture ? [{ from: 'server', to: 'gateway', ...step('capture', { detail: 'POST /v1/payments/{id} · CP' }) }] : []),
    { from: 'server', kind: 'note', label: 'Credits the funds to the recipient’s account' },
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

const th = 'px-3 py-2.5 text-left font-semibold whitespace-nowrap text-zinc-900 dark:text-white'
const td = 'px-3 py-2.5 align-top text-zinc-700 dark:text-zinc-300'

// The Funds Transfer Types the chosen MCC can send, and what each maps to on each scheme
function TransferTypesTable({ mcc, selected, onSelect }) {
  let rows = typesFor(mcc)
  return (
    <div className="not-prose my-6 xl:max-w-none">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Funds Transfer Types for MCC {mcc}</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">The gateway maps the value to the scheme code</p>
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
        <table className="min-w-full divide-y divide-zinc-900/7.5 text-[0.8125rem] dark:divide-white/10">
          <thead className="bg-zinc-50 dark:bg-white/2.5">
            <tr>
              {['FundsTransferType', 'What the funds are for', 'Visa BAI', 'Mastercard TTI', 'isDirectPurchase'].map((h) => (
                <th key={h} scope="col" className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/5 bg-white dark:divide-white/5 dark:bg-transparent">
            {rows.map((t) => {
              let on = t.value === selected
              return (
                <tr key={t.value} className={clsx(on && 'bg-emerald-50/50 dark:bg-emerald-400/5')}>
                  <td className={clsx(td, 'whitespace-nowrap')}>
                    <button
                      type="button"
                      onClick={() => onSelect(t.value)}
                      className={clsx('font-mono text-xs', on ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-zinc-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400')}
                    >
                      {t.value}
                    </button>
                  </td>
                  <td className={td}>{t.text}</td>
                  {AFT_BRANDS.map((b) => (
                    <td key={b.code} className={clsx(td, 'whitespace-nowrap')}>
                      {t.schemes.includes(b.code) ? (
                        <SchemeTag brand={b.code} code={t[b.code].code} bare />
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">Not allowed</span>
                      )}
                    </td>
                  ))}
                  <td className={clsx(td, 'font-mono text-xs whitespace-nowrap')}>{t.direct ? 'true' : 'false'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Pick the brand for a Funds Transfer Type: keep the current one if the scheme allows it
function withAllowedBrand(form, mcc, type) {
  let schemes = schemesFor(mcc, type)
  if (!schemes.length || schemes.includes(form.paymentBrand)) return form
  return withBrand(form, schemes[0])
}

// Change the card brand, and the test card with it (the same 3-D Secure behaviour)
function withBrand(form, brand) {
  if (form.preset === 'CUSTOM') return { ...form, paymentBrand: brand }
  let card = cardForBrand(form.preset, brand)
  return { ...form, paymentBrand: brand, preset: card.value, card: { ...form.card, number: card.number } }
}

export function AftFlow({ mode = 'start' }) {
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

  // Saved settings from an earlier visit, with any fields added since filled from the defaults
  let savedFlow = state.flow || INITIAL.flow
  let flow = getMcc(savedFlow.mode) && schemesFor(savedFlow.mode, savedFlow.tx).length ? savedFlow : INITIAL.flow
  let saved = state.form || {}
  let form = {
    ...INITIAL.form,
    ...saved,
    sender: { ...INITIAL.form.sender, ...saved.sender },
    recipient: { ...INITIAL.form.recipient, ...saved.recipient },
    threeDS: { ...INITIAL.form.threeDS, ...saved.threeDS },
    customer: { ...INITIAL.form.customer, ...saved.customer, fields: { ...INITIAL.form.customer.fields, ...saved.customer?.fields } },
    capture: { ...INITIAL.form.capture, ...saved.capture },
  }
  let setForm = (f) => setState((s) => ({ ...s, form: f }))
  let steps = flowSteps(form.paymentType)
  let stepOf = (key) => steps.find((s) => s.key === key)

  useSyncSections([{ id: 'aft-workflow', title: 'AFT workflow' }, ...steps.map((s) => ({ id: s.id, step: s.step, title: s.title, tag: s.tag }))])

  // What the AFT payment sends, for the preview and the request
  let input = useMemo(
    () => ({
      mcc: flow.mode,
      type: flow.tx,
      paymentBrand: form.paymentBrand,
      card: form.card,
      amount: form.amount,
      currency: form.currency,
      paymentType: form.paymentType,
      merchantTransactionId: form.merchantTransactionId,
      purposeCode: form.purposeCode,
      directPurchase: form.directPurchase,
      sender: form.sender,
      birthDate: form.birthDate,
      crossBorder: form.crossBorder,
      recipient: form.recipient,
      customer: form.customer,
      threeDS: form.threeDS,
      browser: browser || {},
      testMode: form.testMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow.mode, flow.tx, state.form, browser],
  )
  let missing = useMemo(() => missingAft(input), [input])
  let problem = typeProblem(input)
  let params = useMemo(
    () =>
      buildAftParams(
        { ...input, merchantTransactionId: form.merchantTransactionId || '{generated}' },
        { entityId: ENTITY_SHOWN, shopperResultUrl: SHOPPER_RESULT_URL_SHOWN, ip: IP_SHOWN },
      ),
    [input, form.merchantTransactionId],
  )

  let payment = state.payment
  let paymentId = payment?.response?.id
  let redirect = payment?.response?.redirect
  let returnResourcePath = search.get('resourcePath')
  let returnId = search.get('id')
  let resourcePath =
    (mode === 'return' && (returnResourcePath || (returnId ? `/v1/payments/${returnId}` : null))) || (paymentId ? `/v1/payments/${paymentId}` : null)
  let statusId = resourcePath?.match(/\/v1\/payments\/(\w+)/)?.[1]

  let approvedResponse = state.result?.status === 'success' ? state.result.response : payment?.status === 'success' ? payment.response : null
  let approved = Boolean(approvedResponse)
  // A capture goes on the pre-authorization: its id, amount and testMode
  let preauthorized = approved && approvedResponse?.paymentType === 'PA'
  let captureId = approvedResponse?.id || statusId || paymentId
  let captureAmount = form.capture.amount.trim() || approvedResponse?.amount || form.amount
  let captureCurrency = approvedResponse?.currency || form.currency
  let paymentTestMode = payment?.testMode ?? form.testMode
  let captureInput = { amount: captureAmount, currency: captureCurrency, testMode: paymentTestMode }
  let captured = state.capture?.status === 'success'

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
      let data = await postJson('/api/status', { resourcePath: path, entity: 'aft' })
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

  let resetRun = (s) => ({ ...s, payment: null, result: null, returned: false, capture: null })

  // A new MCC or Funds Transfer Type: the classification defaults that go with it, and a
  // card brand the scheme allows it on
  function setFlow(next) {
    if (next.mode === flow.mode && next.tx === flow.tx) return
    setState((s) => {
      let mcc = getMcc(next.mode)
      let f = withAllowedBrand(form, next.mode, next.tx)
      f = { ...f, directPurchase: FUNDS_TRANSFER_TYPES[next.tx]?.direct ?? false }
      if (next.mode !== flow.mode) f = { ...f, purposeCode: mcc?.purposeCode || '' }
      return resetRun({ ...s, flow: next, form: f })
    })
    setError({})
  }

  function setBrand(brand) {
    if (!schemesFor(flow.mode, flow.tx).includes(brand)) return
    setForm(withBrand(form, brand))
  }

  function resetPlayground() {
    setState((s) => ({ ...resetRun(s), flow: INITIAL.flow, form: defaultForm() }))
  }

  async function sendPayment() {
    setBusy('payment')
    setError({})
    try {
      let data = await postJson('/api/aft/payments', { ...input, merchantTransactionId: form.merchantTransactionId || newMerchantTransactionId() })
      // A new payment starts a new run: clear the steps after it
      setState((s) => ({ ...resetRun(s), payment: { ...data, testMode: form.testMode, at: new Date().toISOString() } }))
    } catch (e) {
      setError({ payment: e.message })
    } finally {
      setBusy('')
    }
  }

  async function sendCapture() {
    setBusy('capture')
    setError({})
    try {
      let data = await postJson(`/api/aft/payments/${captureId}`, captureInput)
      setState((s) => ({ ...s, capture: data }))
    } catch (e) {
      setError({ capture: e.message })
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
  let paymentVariants = config ? requestCode({ url: `${base}/v1/payments`, params }) : null
  let statusVariants = requestCode({ method: 'GET', url: `${base}/v1/payments/${statusId || '{id}'}`, params: [['entityId', ENTITY_SHOWN]] })
  let captureParams = buildCaptureParams(captureInput, { entityId: ENTITY_SHOWN })
  let captureVariants = requestCode({ url: `${base}/v1/payments/${captureId || '{id}'}`, params: captureParams })
  let snippet = redirectSnippet(redirect)
  let drawerTitle = ['3-D Secure', payment?.response?.amount && `${payment.response.amount} ${payment.response.currency || ''}`].filter(Boolean).join(' · ')

  let first = stepOf('payment')
  let authenticate = stepOf('authenticate')
  let status = stepOf('status')
  let capture = stepOf('capture')
  let mcc = getMcc(flow.mode)
  let modeInfo = MODES.find((m) => m.value === flow.mode)
  let typeInfo = FUNDS_TRANSFER_TYPES[flow.tx]
  let brand = AFT_BRANDS.find((b) => b.code === form.paymentBrand)
  let code = schemeCode(flow.tx, form.paymentBrand)
  let needsPurpose = purposeRequired(input)
  let business = form.recipient.who === 'business'

  let values = Object.fromEntries(params)
  let row = (key, extra = {}) => ({ doc: aftDoc(key, extra.doc), value: extra.value ?? values[key], note: extra.note, missing: missing.includes(key) })
  let groups = [
    {
      title: 'Basic payment',
      rows: [
        row('amount', { doc: { req: 'M' } }),
        row('currency', { doc: { req: 'M' } }),
        row('paymentBrand', { doc: { req: 'M' }, note: `VISA or MASTER: a scheme that allows ${flow.tx} for MCC ${flow.mode}.` }),
        row('paymentType', { doc: { req: 'M' }, note: PAYMENT_TYPES[form.paymentType] }),
        row('merchantTransactionId', { doc: { req: 'M' }, value: form.merchantTransactionId, note: 'The demo generates one if you leave it empty.' }),
        row('shopperResultUrl', { doc: { req: 'C' } }),
      ],
    },
    {
      title: 'Card',
      rows: [
        row('card.number', { doc: { req: 'M' } }),
        row('card.holder', { doc: { req: 'M' } }),
        row('card.expiryMonth', { doc: { req: 'M' } }),
        row('card.expiryYear', { doc: { req: 'M' } }),
        row('card.cvv', { doc: { req: 'M' } }),
      ],
    },
    {
      title: 'Account funding',
      rows: [
        row('transactionProcessingCode', { doc: { req: 'M' } }),
        row('customParameters[FundsTransferType]', {
          doc: { req: 'M' },
          note: `${typeInfo?.title}. ${code ? `On ${brand?.name} it maps to ${brand?.tag} ${code}.` : ''}`,
        }),
        row('customParameters[isDirectPurchase]', {
          doc: { req: 'M' },
          note: form.directPurchase ? 'true: the payment buys the asset straight away.' : 'false: the payment funds the account for later.',
        }),
        row('transactionPurposeCode', {
          doc: { req: needsPurpose ? 'M' : 'C' },
          note: needsPurpose
            ? `Required for Mastercard. ${mcc.purposeCode} is the value for MCC ${mcc.code}.`
            : form.paymentBrand === 'MASTER'
              ? `Required for Mastercard. The Help Centre documents HIGHRISKSEC for MCC 6211; for ${flow.mode}, check the value with Nomupay support.`
              : form.purposeCode
                ? 'Required for Mastercard. Sent on this Visa payment too, as in the Help Centre example.'
                : 'Required for Mastercard. Not needed for this Visa payment.',
        }),
      ],
    },
    {
      title: 'Sender',
      rows: [
        row('sender.accountNumberType', { doc: { req: 'M' } }),
        row('sender.givenName', { doc: { req: 'M' } }),
        row('sender.surname', { doc: { req: 'M' } }),
        row('sender.birthDate', {
          doc: { req: 'C' },
          value: form.crossBorder ? form.birthDate : '',
          note: form.crossBorder ? 'Sent: the card was issued abroad.' : 'Not sent: the card was issued in your country. Turn on Card issued abroad in the Playground.',
        }),
        row('sender.street', { doc: { req: 'M' } }),
        row('sender.city', { doc: { req: 'M' } }),
        row('sender.state', { doc: { req: 'M' } }),
        row('sender.postcode', { doc: { req: 'O' } }),
        row('sender.country', { doc: { req: 'M' } }),
      ],
    },
    {
      title: 'Recipient',
      rows: [
        row('recipient.givenName', {
          doc: { req: 'M' },
          note: business ? 'The business name: the funds are for the business.' : 'The shopper funds their own account, so the recipient is the sender.',
        }),
        row('recipient.surname', { doc: { req: 'C' }, note: business ? 'Not sent: the recipient is a business.' : null }),
        row('recipient.accountNumberType', { doc: { req: 'M' } }),
        row('recipient.accountNumber', { doc: { req: 'M' } }),
      ],
    },
    form.customer.on && {
      title: 'Customer & billing',
      rows: CUSTOMER_KEYS.map((k) => row(k, { doc: { req: 'C' } })),
    },
    (form.threeDS.browser || form.threeDS.flow || form.threeDS.enrolled || form.threeDS.challengeIndicator) && {
      title: '3-D Secure',
      rows: [
        form.threeDS.challengeIndicator && row('threeDSecure.challengeIndicator', { doc: { req: 'O' } }),
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
  let pathId = (text, value, note) => (
    <ParamList className="not-prose my-6 border-y border-zinc-900/5 dark:border-white/5">
      <ParamDoc doc={{ name: 'id', format: 'AN32', pattern: '[a-zA-Z0-9]{32}', req: 'M', text, example: '8ac7a4a19a5a1e4c019a5bd2f1b23c4d' }} value={value} note={note} />
    </ParamList>
  )

  let pg = { flow, setFlow, form, setForm, setBrand, missing, onReset: resetPlayground }

  let parameterErrors = (data) => {
    let list = data?.response?.result?.parameterErrors
    if (!Array.isArray(list) || !list.length) return null
    return (
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[0.8125rem]">
        {list.map((p, i) => (
          <li key={i}>
            <code className="font-mono">{p.name}</code>: {p.message}
          </li>
        ))}
      </ul>
    )
  }

  let approvedText = (response) =>
    response?.paymentType === 'PA' && capture ? (
      <>
        The funds are reserved. Continue to <StepLink step={capture} /> to capture them.
      </>
    ) : (
      <>Credit the funds to the recipient’s account{response?.recipient?.accountNumber ? ` (${response.recipient.accountNumber})` : ''}.</>
    )

  let paymentNote =
    payment &&
    (payment.status === 'pending' ? (
      redirect ? (
        <StepNote status="pending" title="Pending 3-D Secure.">
          Continue to <StepLink step={authenticate} /> to send the shopper to authenticate.
        </StepNote>
      ) : (
        <StepNote status="pending" title="Pending.">
          Continue to <StepLink step={status} /> to get the payment status.
        </StepNote>
      )
    ) : payment.status === 'success' ? (
      <StepNote status="success" title="Approved.">
        {approvedText(payment.response)}
      </StepNote>
    ) : (
      <StepNote status="failed" title={payment.response?.result?.code === '200.300.404' ? 'Rejected: a parameter is invalid or missing.' : 'Declined.'}>
        {resultText(payment)}
        {parameterErrors(payment)}
      </StepNote>
    ))

  return (
    <>
      {config && !config.configured && (
        <Note tone="amber">The demo’s ACCESS_TOKEN isn’t set on this server. Add it in Vercel under Settings, Environment Variables, then redeploy.</Note>
      )}

      {/* AFT workflow: an overview, the requests in the flow, and the MCC to try */}
      <Heading level={2} id="aft-workflow">
        AFT workflow
      </Heading>
      <p>
        An <strong>Account Funding Transaction</strong> (AFT) is a card payment that funds an account rather than paying for goods or services: a
        trading account, a wallet, a stored-value or prepaid card, or a money transfer. For some merchant category codes (MCCs) the card schemes
        require pay-ins to be sent as AFTs, with extra data in the payment: <code>transactionProcessingCode=FUNDING</code>, a{' '}
        <strong>Funds Transfer Type</strong> that says what the funds are for, and who sends and who receives them. For further details refer to{' '}
        <a href={AFT_SECTION_URL} target="_blank" rel="noreferrer">
          Account Funding Transactions
        </a>
        .
      </p>
      <p>
        Otherwise it’s a card payment like any other: the shopper enters the card and authenticates with 3-D Secure, and you get the result. Send
        the AFT parameters alongside the ones you already send, such as the amount, currency, card, customer, billing and 3-D Secure details.
      </p>
      <p>
        The requests run on the test system’s card channel with 3-D Secure 2 (Demo Channel - 3DV2). Set up the card, the sender, the recipient and
        3-D Secure in the {playgroundLink(null)}.
      </p>
      <h3>Transaction flow model</h3>
      <p>The requests in this flow, between the shopper, the merchant server, the payment gateway and the card issuer. Numbered requests are the steps below.</p>
      <SequenceDiagram
        title={`MCC ${flow.mode} · ${flow.tx} · ${brand?.name}`}
        messages={sequence(steps, { paymentType: form.paymentType, type: flow.tx, brand: form.paymentBrand })}
        lanes={LANES}
      />
      <h3>Use cases</h3>
      <p>
        Your MCC isn’t sent in the request: it’s set on your merchant account, and it decides which Funds Transfer Types you can send on each
        scheme. Choose your MCC, then what the funds are for. The steps below follow your choice.
      </p>
      <FlowCards modes={MODES} mode={flow.mode} tx={flow.tx} onChange={setFlow} label="MCC" trayLabel="Funds Transfer Type" align="start" />
      <TransferTypesTable mcc={flow.mode} selected={flow.tx} onSelect={(tx) => setFlow({ mode: flow.mode, tx })} />
      <p>
        Send the value in <code>customParameters[FundsTransferType]</code>. The gateway maps it to the Visa Business Application Identifier (BAI)
        or the Mastercard Transaction Type Identifier (TTI), so you don’t send those yourself. Where a value is only allowed on one scheme, the demo
        switches the card brand to match.
      </p>
      <h3>Testing AFTs</h3>
      <p>
        On the test system the payment runs in Integrator Test Mode. The gateway checks the format of the AFT parameters, so an invalid value comes
        back as <code>200.300.404</code> with the parameter in <code>parameterErrors</code>, but the test channel has no MCC, so it doesn’t check
        that your Funds Transfer Type is allowed for one. The demo checks that for you, against the table above.
      </p>
      <p>
        In production, a merchant account with one of these MCCs only accepts funds transfers. A payment that isn’t recognised as one is rejected
        with <code>900.100.202</code> (Only funds transfer are allowed for the configured merchant category code). If you get it with the AFT
        parameters in place, contact Nomupay support to check your merchant account’s AFT set-up. The 3-D Secure test cards are in the{' '}
        <a href={THREEDS_TESTING_URL} target="_blank" rel="noreferrer">
          3D Secure Testing Guide
        </a>
        .
      </p>

      <hr />

      {/* 1. The AFT payment */}
      <Heading level={2} id={first.id} step={first.step} tag="POST">
        {first.title}
      </Heading>
      <Row>
        <Col>
          <p>
            Initiate a server-to-server POST request with the card and the AFT parameters: transactionProcessingCode FUNDING, the Funds Transfer Type
            for your MCC, the sender (the cardholder) and the recipient (whose account the funds go to). The response is pending with a 3-D Secure
            redirect, or approved straight away.
          </p>
          <h3>Properties</h3>
          <RequestProperties method="POST" path="/v1/payments" base={base} />
          <h3>Body parameters</h3>
          <p>
            Open the {playgroundLink('usecase')} to change the MCC and Funds Transfer Type, the card, the sender or the recipient. For further details
            refer to{' '}
            <a href={AFT_PARAMETERS_URL} target="_blank" rel="noreferrer">
              the AFT required parameters
            </a>
            .
          </p>
          <ParamGroups key={`${flow.mode}-${flow.tx}-${form.customer.on}-${form.threeDS.browser}`}>
            {groups.map((g) => (
              <ParamGroup key={g.title} title={g.title} missing={g.rows.filter((r) => r.missing).length}>
                {g.rows.map((r) => (
                  <ParamDoc key={r.doc.name} doc={r.doc} value={r.value} note={r.note} missing={r.missing} onPlayground={() => openPlayground('payment')} />
                ))}
              </ParamGroup>
            ))}
          </ParamGroups>
          <h3>Response</h3>
          <p>The payment the gateway returns. It echoes the Funds Transfer Type and the recipient; the sender details aren’t returned.</p>
          <ResponseGroup docs={AFT_RESPONSE_DOCS} response={payment?.response} />
        </Col>
        <Col sticky>
          <CodeWindow
            title="Request"
            tag="POST"
            label={<UrlLabel base={base} path="/v1/payments" />}
            variants={paymentVariants}
            lineNumbers
            onPlayground={() => openPlayground()}
            empty="Loading…"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <SendButton onClick={sendPayment} disabled={!canSend || missing.length > 0 || Boolean(problem) || busy === 'payment'}>
                  {busy === 'payment' ? 'Sending…' : 'Send request'}
                </SendButton>
                {sendHint ||
                  (problem ? (
                    <span className="text-xs text-zinc-400">{problem}</span>
                  ) : (
                    missing.length > 0 && (
                      <span className="text-xs text-zinc-400">
                        Fill in {missing.length === 1 ? 'the required field' : `${missing.length} required fields`} in the {hintButton('payment', 'Playground')}
                      </span>
                    )
                  ))}
                {payment && (
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
          <ErrorNote message={error.payment} />
          <CodeWindow
            title="Response"
            code={payment ? JSON.stringify(payment.response, null, 2) : ''}
            html={payment ? highlightJson(payment.response) : ''}
            empty="Response Details"
          />
          {paymentNote}
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
          {payment && !redirect && payment.status === 'success' && (
            <Note>
              No 3-D Secure was needed: the payment was approved straight away. {capture ? <>Skip to step {capture.step}.</> : 'There’s nothing more to do.'}
            </Note>
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
            shopperResultUrl with the id and resourcePath parameters. Once the AFT is approved, credit the funds to the recipient’s account.{' '}
            {THROTTLED_TEXT}
          </p>
          <h3>Properties</h3>
          <RequestProperties method="GET" path="/v1/payments/{id}" base={base} />
          <h3>Path parameters</h3>
          {pathId('The identifier of the payment, from its response.', statusId, `The id from step ${first.step}’s response.`)}
          <h3>Response</h3>
          <ResponseGroup docs={AFT_RESPONSE_DOCS.filter((d) => d.name !== 'redirect')} response={state.result?.response} />
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
              <StepNote status="success" title="Approved.">
                {state.result.response?.threeDSecure?.eci ? `3-D Secure ECI ${state.result.response.threeDSecure.eci}. ` : ''}
                {approvedText(state.result.response)}
              </StepNote>
            ) : state.result.status === 'pending' ? (
              <StepNote status="pending" title="Still pending.">
                The shopper hasn’t finished 3-D Secure yet. Check the status again in a moment.
              </StepNote>
            ) : (
              <StepNote status="failed" title="Declined.">
                {resultText(state.result)}
                {parameterErrors(state.result)}
              </StepNote>
            ))}
        </Col>
      </Row>

      {/* 4. Capture (pre-authorization only) */}
      {capture && (
        <>
          <hr />
          <Heading level={2} id={capture.id} step={capture.step} tag="POST">
            {capture.title}
          </Heading>
          <Row>
            <Col>
              <p>
                A pre-authorized AFT reserves the funds on the card. Capture it with a POST request on the payment, paymentType CP, to take them. Send
                the same testMode as the pre-authorization, or the gateway answers 700.100.600.
              </p>
              <div className="not-prose my-6 rounded-xl ring-1 ring-zinc-900/7.5 dark:ring-white/10">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <label htmlFor="capture-amount" className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 dark:text-white">Amount</span>
                    <span className="block text-xs/5 text-zinc-500 dark:text-zinc-400">Empty: the pre-authorized amount. Less captures part of it.</span>
                  </label>
                  <div className="flex w-36 flex-none items-center gap-2">
                    <input
                      id="capture-amount"
                      type="text"
                      inputMode="decimal"
                      placeholder={approvedResponse?.amount || form.amount}
                      value={form.capture.amount}
                      onChange={(e) => setForm({ ...form, capture: { ...form.capture, amount: e.target.value } })}
                      className="block w-full rounded-lg bg-white px-3 py-1.5 font-mono text-[0.8125rem] text-zinc-900 outline-1 -outline-offset-1 outline-zinc-900/10 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-emerald-500 dark:bg-white/5 dark:text-white dark:outline-white/10"
                    />
                    <span className="font-mono text-xs text-zinc-400">{captureCurrency}</span>
                  </div>
                </div>
              </div>
              <h3>Properties</h3>
              <RequestProperties method="POST" path="/v1/payments/{id}" base={base} />
              <h3>Path parameters</h3>
              {pathId('The identifier of the pre-authorization to capture.', captureId, `The id from step ${first.step}’s response.`)}
              <h3>Body parameters</h3>
              <ParamGroups>
                <ParamGroup title="Basic payment" defaultOpen>
                  <ParamDoc doc={aftDoc('amount', { req: 'M' })} value={captureAmount} note="Up to the pre-authorized amount." />
                  <ParamDoc doc={aftDoc('currency', { req: 'M' })} value={captureCurrency} note="The pre-authorization’s currency." />
                  <ParamDoc doc={aftDoc('paymentType', { req: 'M' })} value="CP" note="CP, Capture: confirms the pre-authorization." />
                  {paymentTestMode && <ParamDoc doc={aftDoc('testMode', { req: 'T' })} value={paymentTestMode} note="The same as the pre-authorization." />}
                </ParamGroup>
              </ParamGroups>
              <h3>Response</h3>
              <ResponseGroup docs={CAPTURE_RESPONSE_DOCS} response={state.capture?.response} />
            </Col>
            <Col sticky>
              <CodeWindow
                title="Request"
                tag="POST"
                label={<UrlLabel base={base} path="/v1/payments/" id={captureId || ''} />}
                variants={captureVariants}
                lineNumbers
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SendButton onClick={sendCapture} disabled={!preauthorized || !canSend || captured || busy === 'capture'}>
                      {busy === 'capture' ? 'Sending…' : captured ? 'Captured' : 'Send request'}
                    </SendButton>
                    {sendHint || (!preauthorized && <span className="text-xs text-zinc-400">Available once the pre-authorization is approved (step {status.step}).</span>)}
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
                    Credit the funds to the recipient’s account.
                  </StepNote>
                ) : (
                  <StepNote status="failed" title="Rejected.">
                    {resultText(state.capture)}
                  </StepNote>
                ))}
            </Col>
          </Row>
        </>
      )}

      <AftPlayground open={playground.open} focus={playground.focus} onClose={() => setPlayground((p) => ({ ...p, open: false }))} pg={pg} />
    </>
  )
}
