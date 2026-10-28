'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EnvironmentBadges } from '@/components/EnvironmentBadges'
import { Logo } from '@/components/Logo'
import { CodeTabs, Spinner, StatusBadge, Step } from '@/components/playground/ApiPanel'
import { CheckoutPreview } from '@/components/playground/CheckoutPreview'
import { BrandsCard, IncludeGroups } from '@/components/playground/IncludePanel'
import { CountrySelect, SettingsPanel } from '@/components/playground/SettingsPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getBrand } from '@/lib/brands'
import { getJson, newMerchantTransactionId, postJson, usePersistentState } from '@/lib/flowState'
import { buildCurl, curlDiff, highlightCurl, highlightHtml, highlightJson } from '@/lib/highlight'
import { checkoutInput, configChange, customerFor, defaultMethods, initialConfig, orderedMethods, requiredFields } from '@/lib/playground'
import { REPEAT_PAYMENT_PARAMS, buildPaymentParams, usesCard } from '@/lib/request'
import { useConfig } from '@/lib/useConfig'

const KEY = 'nomupayApmDemo.playground.v1'
const INITIAL = { config: initialConfig(), checkout: null, prevParams: null, result: null, repeat: null, device: 'desktop' }
const AUTO_DELAY = 700

// Everything about the request except the order reference, to spot real changes
const keyOf = (input) => JSON.stringify({ ...input, merchantTransactionId: undefined })

function DeviceToggle({ device, setDevice }) {
  let btn = (value, label, path) => (
    <button
      type="button"
      onClick={() => setDevice(value)}
      aria-pressed={device === value}
      aria-label={label}
      className={clsx(
        'flex size-8 items-center justify-center rounded-md transition',
        device === value ? 'bg-white text-emerald-600 shadow-xs ring-1 ring-zinc-900/10 dark:bg-white/10 dark:text-emerald-400 dark:ring-white/10' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden="true">
        <path d={path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
  return (
    <div className="flex gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/5">
      {btn('desktop', 'Desktop preview', 'M3 4.5h14v9H3zM7.5 16.5h5M10 13.5v3')}
      {btn('mobile', 'Mobile preview', 'M6.5 2.5h7v15h-7zM9.5 15h1')}
    </div>
  )
}

function PaneTabs({ pane, setPane }) {
  let tabs = [
    ['settings', 'Settings'],
    ['checkout', 'Checkout'],
    ['api', 'What to include'],
  ]
  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 lg:hidden dark:bg-white/5">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setPane(id)}
          aria-pressed={pane === id}
          className={clsx(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition',
            pane === id ? 'bg-white text-zinc-900 shadow-xs dark:bg-white/10 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Playground({ mode = 'start' }) {
  let env = useConfig()
  let router = useRouter()
  let search = useSearchParams()
  let [state, setState, ready] = usePersistentState(KEY, INITIAL)
  let [creating, setCreating] = useState(false)
  let [widgetReady, setWidgetReady] = useState(false)
  let [checking, setChecking] = useState(false)
  let [repeating, setRepeating] = useState(false)
  let [error, setError] = useState('')
  let [pane, setPane] = useState('checkout')
  let [origin, setOrigin] = useState('')
  let requestNo = useRef(0)
  let freshSent = useRef(false)
  let autoChecked = useRef(false)
  let resetDone = useRef(false)

  useEffect(() => setOrigin(window.location.origin), [])

  // Arriving at the shop starts over: a checkout from an earlier visit may have expired
  useEffect(() => {
    if (mode !== 'start' || !ready || resetDone.current) return
    resetDone.current = true
    setState((s) => ({ ...s, checkout: null, prevParams: null, result: null, repeat: null }))
  }, [mode, ready, setState])

  // Saved settings from an older version may miss newer keys
  let config = useMemo(() => ({ ...initialConfig(state.config?.country), ...state.config }), [state.config])
  let [focus, setFocus] = useState(null)
  let setConfig = useCallback(
    (next) => {
      let change = configChange(config, next)
      if (change) setFocus({ ...change, at: Date.now() })
      setState((s) => ({ ...s, config: next }))
    },
    [config, setState],
  )
  useEffect(() => {
    if (!focus) return
    let t = setTimeout(() => setFocus(null), 4500)
    return () => clearTimeout(t)
  }, [focus])
  let changeCountry = (code) =>
    setConfig({ ...config, country: code, methods: defaultMethods(code), customer: customerFor(code) })

  let input = useMemo(() => checkoutInput(config, '{generated}'), [config])
  let inputKey = keyOf(input)
  let checkout = state.checkout
  let stale = Boolean(checkout && checkout.key !== inputKey)
  let entityKind = usesCard(input.brands) ? 'card' : 'wallet'
  let action = `${origin}/playground/return`

  // ---- Step 1: create (and recreate) the checkout ----
  let send = useCallback(async () => {
    if (!env?.configured) return
    let body = checkoutInput(config, newMerchantTransactionId())
    if (!body.brands.length) return
    let key = keyOf(body)
    let n = ++requestNo.current
    setCreating(true)
    setError('')
    try {
      let data = await postJson('/api/checkouts', body)
      if (n !== requestNo.current) return
      setWidgetReady(false)
      setState((s) => ({
        ...s,
        prevParams: s.checkout?.request?.params || null,
        checkout: { key, input: body, ...data, at: new Date().toISOString() },
        result: null,
        repeat: null,
      }))
    } catch (e) {
      if (n !== requestNo.current) return
      setError(e.message)
      setState((s) => ({ ...s, checkout: { key, input: body, failed: true, at: new Date().toISOString() } }))
    } finally {
      if (n === requestNo.current) setCreating(false)
    }
  }, [config, env, setState])

  // Like a shop page: a fresh checkout on arrival, then a new one whenever the order changes
  useEffect(() => {
    if (mode !== 'start' || !ready || !env?.configured || !input.brands.length) return
    let needed = !freshSent.current || !checkout || stale
    if (!needed) return
    let t = setTimeout(() => {
      freshSent.current = true
      send()
    }, freshSent.current ? AUTO_DELAY : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready, env, inputKey, input.brands.length])

  // ---- Step 3: payment result (return page) ----
  let resourcePath = search.get('resourcePath')
  let statusPath = (mode === 'return' && resourcePath) || (checkout?.response?.id ? `/v1/checkouts/${checkout.response.id}/payment` : null)

  let checkStatus = useCallback(async () => {
    if (!statusPath) return
    setChecking(true)
    setError('')
    try {
      let data = await getJson(`/api/status?resourcePath=${encodeURIComponent(statusPath)}&entity=${state.checkout?.entity || 'wallet'}`)
      setState((s) => ({ ...s, result: data }))
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }, [statusPath, state.checkout, setState])

  useEffect(() => {
    if (mode !== 'return' || autoChecked.current || !ready || !env?.configured || !statusPath) return
    autoChecked.current = true
    checkStatus()
  }, [mode, ready, env, statusPath, checkStatus])

  // ---- Step 4: charge the saved details again ----
  let registrationId = state.result?.response?.registrationId
  let repeatBody = { amount: checkout?.input?.amount, currency: checkout?.input?.currency, entity: checkout?.entity || 'card' }
  let payAgain = async () => {
    setRepeating(true)
    setError('')
    try {
      let data = await postJson(`/api/registrations/${registrationId}/payments`, repeatBody)
      setState((s) => ({ ...s, repeat: data }))
    } catch (e) {
      setError(e.message)
    } finally {
      setRepeating(false)
    }
  }

  let newCheckout = () => {
    setState((s) => ({ ...s, checkout: null, prevParams: null, result: null, repeat: null }))
    router.push('/playground')
  }

  // ---- What the panels show ----
  let host = env?.apiHost || 'eu-test.oppwa.com'
  let maskedEntity = env?.entities?.[entityKind] || '{entityId}'
  let previewParams = buildPaymentParams({ ...input, flow: 'copyandpay', merchantTransactionId: '{generated}' }, { entityId: maskedEntity, testMode: env?.testMode })
  let sentParams = checkout?.request?.params
  let showSent = mode === 'return' || (!stale && sentParams)
  let shownParams = showSent && sentParams ? sentParams : previewParams
  let diffBase = mode === 'return' ? null : stale ? sentParams : state.prevParams
  let request = curlDiff({ url: `https://${host}/v1/checkouts`, params: shownParams, base: diffBase })
  let response = checkout?.response
  let checkoutId = response?.id
  let gatewayError = checkout && !checkout.failed && !checkoutId ? response?.result : null
  let pending = mode === 'start' && (creating || stale)

  let widgetHtml = checkoutId
    ? `<script>
  var wpwlOptions = { style: "plain", locale: "en" }
</script>
<script
  src="https://${host}/v1/paymentWidgets.js?checkoutId=${checkoutId}"${response?.integrity ? `\n  integrity="${response.integrity}"\n  crossorigin="anonymous"` : ''}>
</script>

<form action="${action}"
  class="paymentWidgets"
  data-brands="${(checkout.input?.brands || []).join(' ')}">
</form>`
    : ''

  let statusCurl = statusPath ? buildCurl({ method: 'GET', url: `https://${host}${statusPath}`, params: [['entityId', env?.entities?.[checkout?.entity || 'wallet'] || '{entityId}']] }) : ''
  let repeatCurl = buildCurl({
    url: `https://${host}/v1/registrations/${registrationId || '{registrationId}'}/payments`,
    params: [['entityId', env?.entities?.[checkout?.entity || 'card'] || '{entityId}'], ['amount', repeatBody.amount || '{amount}'], ['currency', repeatBody.currency || '{currency}'], ['paymentType', 'DB'], ...REPEAT_PAYMENT_PARAMS],
  })

  let step1State = checkoutId && !pending ? 'done' : 'active'
  let step2State = mode === 'return' ? 'done' : widgetReady && !pending ? 'done' : checkoutId ? 'active' : 'waiting'
  let step3State = state.result ? (state.result.status === 'pending' ? 'active' : 'done') : mode === 'return' ? 'active' : 'waiting'
  let step4State = state.repeat ? 'done' : registrationId ? 'active' : 'waiting'

  let card = state.result?.response?.card
  let saved = registrationId
    ? { registrationId, label: card ? `${getBrand(state.result.response.paymentBrand)?.name || state.result.response.paymentBrand} •••• ${card.last4Digits}` : getBrand(state.result.response.paymentBrand)?.name || 'Saved details' }
    : null

  let widget = {
    checkoutId: checkoutId || null,
    integrity: response?.integrity || null,
    brands: checkout?.input?.brands || [],
    error: gatewayError ? { code: gatewayError.code, description: gatewayError.description } : checkout?.failed ? { description: error } : null,
    updating: Boolean(checkoutId && pending),
  }

  let settings =
    mode === 'return' ? (
      <div>
        <p className="mb-5 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-white/2.5 dark:text-zinc-400">
          These were the settings for this payment. Start a new checkout to change them.
        </p>
        <div className="pointer-events-none opacity-60 select-none" aria-disabled="true">
          <SettingsPanel config={config} setConfig={() => {}} onCountry={() => {}} />
        </div>
      </div>
    ) : (
      <SettingsPanel config={config} setConfig={setConfig} onCountry={changeCountry} />
    )

  let api = (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">What to include</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">COPYandPAY</span>
      </div>
      <p className="mt-1 text-xs/5 text-zinc-500 dark:text-zinc-400">What your server sends and your page renders for the checkout in the middle.</p>
      <ol role="list" className="mt-6">
        <Step
          number={1}
          state={step1State}
          tag="POST"
          path="/v1/checkouts"
          title="Create the checkout"
          badge={
            pending && env?.configured ? (
              <Spinner label={creating ? 'Sending' : 'Changes pending'} />
            ) : checkoutId ? (
              <StatusBadge status="success">{response.result?.code || 'Created'}</StatusBadge>
            ) : gatewayError || checkout?.failed ? (
              <StatusBadge status="failed">{gatewayError?.code || 'Error'}</StatusBadge>
            ) : null
          }
        >
          <p>Your server sends this when the shopper reaches checkout. Each setting you switch on adds its own parameters here.</p>
          <IncludeGroups params={shownParams} base={diffBase} focus={focus} need={requiredFields(orderedMethods(config))} config={config} />
          <div className="flex items-center justify-between gap-3 pt-2">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Full request</h4>
            {diffBase && (request.added > 0 || request.removed > 0) && (
              <p className="flex gap-3 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400">+{request.added}</span>
                <span className="text-rose-600 dark:text-rose-400">−{request.removed}</span>
              </p>
            )}
          </div>
          <CodeTabs
            tabs={[
              { name: 'Request', code: request.code, html: request.html },
              { name: 'Response', code: response ? JSON.stringify(response, null, 2) : '', html: response ? highlightJson(response) : '', empty: 'Sending…' },
            ]}
          />
          {env?.configured && mode === 'start' && (
            <button type="button" onClick={send} disabled={creating || !input.brands.length} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 disabled:opacity-50 dark:text-emerald-400">
              Send again
            </button>
          )}
        </Step>

        <Step
          number={2}
          state={step2State}
          path={checkoutId ? `paymentWidgets.js?checkoutId=${checkoutId.slice(0, 8)}…` : 'paymentWidgets.js'}
          title="Render the payment form"
          badge={step2State === 'done' ? <StatusBadge status="success">Rendered</StatusBadge> : checkoutId && mode === 'start' ? <Spinner label="Loading" /> : null}
        >
          <p>
            Your page loads the widget with the <code>id</code> from step 1. <code>data-brands</code> picks the methods, and the form&rsquo;s{' '}
            <code>action</code> is where the shopper comes back to.
          </p>
          <BrandsCard
            brands={mode === 'return' ? checkout?.input?.brands || [] : input.brands}
            flash={focus?.id === 'brands'}
            integrity={config.integrity ? response?.integrity || 'from the step 1 response' : null}
            action={action || '/playground/return'}
          />
          <CodeTabs tabs={[{ name: 'HTML', code: widgetHtml, html: highlightHtml(widgetHtml), empty: 'Waiting for the checkout id from step 1.' }]} />
        </Step>

        <Step
          number={3}
          state={step3State}
          tag="GET"
          path={statusPath || '/v1/checkouts/{id}/payment'}
          title="Get the payment result"
          badge={checking ? <Spinner label="Checking" /> : state.result ? <StatusBadge status={state.result.status}>{state.result.response?.result?.code}</StatusBadge> : null}
        >
          {mode === 'return' ? (
            <p>
              The widget sent the shopper to <code>/playground/return</code> with <code>id</code> and <code>resourcePath</code>. Your server
              requests the <code>resourcePath</code> to get the outcome.
            </p>
          ) : (
            <p>Pay in the checkout. The shopper comes back with a <code>resourcePath</code>, and this request reads the result.</p>
          )}
          {(mode === 'return' || state.result) && (
            <>
              <CodeTabs
                tabs={[
                  { name: 'Request', code: statusCurl, html: highlightCurl(statusCurl), empty: 'Waiting for the shopper to return.' },
                  { name: 'Response', code: state.result ? JSON.stringify(state.result.response, null, 2) : '', html: state.result ? highlightJson(state.result.response) : '', empty: 'Checking…' },
                ]}
                focus={{ key: state.result?.response?.timestamp || state.result?.response?.id || 'none', index: state.result ? 1 : 0 }}
              />
              <button type="button" onClick={checkStatus} disabled={checking || !statusPath} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 disabled:opacity-50 dark:text-emerald-400">
                Check again
              </button>
            </>
          )}
        </Step>

        <Step
          number={4}
          state={step4State}
          tag="POST"
          path="/v1/registrations/{id}/payments"
          title="Charge the saved details"
          badge={repeating ? <Spinner label="Sending" /> : state.repeat ? <StatusBadge status={state.repeat.status}>{state.repeat.response?.result?.code}</StatusBadge> : null}
          last
        >
          {registrationId ? (
            <>
              <p>
                The result has a <code>registrationId</code>. &ldquo;Buy again&rdquo; on the confirmation page charges it with{' '}
                <code>standingInstruction.mode=REPEATED</code>.
              </p>
              <CodeTabs
                tabs={[
                  { name: 'Request', code: repeatCurl, html: highlightCurl(repeatCurl) },
                  { name: 'Response', code: state.repeat ? JSON.stringify(state.repeat.response, null, 2) : '', html: state.repeat ? highlightJson(state.repeat.response) : '', empty: 'Press “Buy again in one click” in the checkout.' },
                ]}
                focus={{ key: state.repeat?.response?.id || 'none', index: state.repeat ? 1 : 0 }}
              />
            </>
          ) : (
            <p>
              {config.save
                ? 'After a card payment, the result carries a registrationId you can charge again.'
                : 'Turn on Save payment details to get a registrationId back with the result.'}
            </p>
          )}
        </Step>
      </ol>
      {error && !checkout?.failed && (
        <p className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20">{error}</p>
      )}
    </div>
  )

  let preview = (
    <CheckoutPreview
      env={env}
      config={config}
      setConfig={setConfig}
      widget={widget}
      action={action}
      onWidgetReady={() => setWidgetReady(true)}
      mode={mode}
      device={state.device}
      confirmation={{ result: state.result, checking, saved, repeat: state.repeat, repeating, onPayAgain: payAgain, onNewCheckout: newCheckout }}
    />
  )

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <header className="flex h-14 flex-none items-center justify-between gap-4 border-b border-zinc-900/10 px-4 sm:px-6 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" aria-label="Home">
            <Logo className="h-6" />
          </Link>
          <span className="hidden h-5 w-px bg-zinc-900/10 sm:block dark:bg-white/15" />
          <span className="hidden text-sm font-medium text-zinc-900 sm:block dark:text-white">Checkout playground</span>
          <div className="hidden md:block">
            <EnvironmentBadges />
          </div>
        </div>
        <div className="flex items-center gap-5">
          <nav className="hidden md:block">
            <ul role="list" className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/copyandpay" className="transition hover:text-zinc-900 dark:hover:text-white">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/payment-methods" className="transition hover:text-zinc-900 dark:hover:text-white">
                  Payment methods
                </Link>
              </li>
            </ul>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <div className="sticky top-0 z-10 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:hidden dark:bg-zinc-900/90">
        <PaneTabs pane={pane} setPane={setPane} />
      </div>

      <div className="flex min-h-0 flex-auto flex-col lg:flex-row">
        <aside className={clsx('px-5 py-6 lg:block lg:w-64 lg:flex-none lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:border-zinc-900/10 xl:w-72 lg:dark:border-white/10', pane === 'settings' ? 'block' : 'hidden')}>
          {settings}
        </aside>

        <main
          className={clsx(
            'min-w-0 flex-auto flex-col bg-zinc-50 bg-[radial-gradient(var(--color-zinc-300)_1px,transparent_1px)] [background-size:16px_16px] lg:flex lg:overflow-hidden dark:bg-zinc-950 dark:bg-[radial-gradient(var(--color-zinc-800)_1px,transparent_1px)]',
            pane === 'checkout' ? 'flex' : 'hidden',
          )}
        >
          <div className="flex-auto overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:py-8">{preview}</div>
          <div className="flex flex-none items-center justify-center gap-3 border-t border-zinc-900/10 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/80">
            <DeviceToggle device={state.device} setDevice={(d) => setState((s) => ({ ...s, device: d }))} />
            {mode === 'start' && <CountrySelect value={config.country} onChange={changeCountry} className="w-56" />}
          </div>
        </main>

        <aside
          className={clsx(
            'bg-zinc-50/50 px-5 py-6 lg:block lg:w-80 lg:flex-none lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-zinc-900/10 xl:w-[26rem] 2xl:w-[30rem] lg:dark:border-white/10 dark:bg-transparent',
            pane === 'api' ? 'block' : 'hidden',
          )}
        >
          {api}
        </aside>
      </div>
    </div>
  )
}
