// Server-to-server cards with card-on-file: the initial payment that stores the
// card (createRegistration=true), an optional capture, and the repeated payment
// (MIT) over the registration. Used by both the live preview (browser) and the real
// request (server), so what the page shows is what gets sent.
//
// Sources:
// - KB, NomuPay Integration Sheet: Credential on File for Visa and Mastercard
//   (scenarios 1.1-1.4, 1.7-1.9), request and response field mapping, test data
//   (any Luhn-valid card, expiry 01/30, CVV 333; amount 9000 declines with
//   800.100.152 and 9100 with 900.100.200), PA is a pre-authorisation by default
// - KB, Credential on File (COF) integration sheet: 1.3 initial recurring payment,
//   1.4 repeated recurring payment, 1.7 / 1.8 unscheduled
// - docs.oppwa.com, Server-to-Server Registration Tokens > Tokenization during payment
// - docs.oppwa.com, 3D Secure testing guide (frictionless and challenge test cards)

export const CARD_PAGE_PATH = '/server-to-server-cards'

// Card-on-file is supported for Visa and Mastercard on NomuPay (integration sheet)
export const COF_BRANDS = [
  { code: 'MASTER', name: 'Mastercard' },
  { code: 'VISA', name: 'Visa' },
]

// Published test cards only: this demo never takes a real card number
export const TEST_CARDS = {
  MASTER: [
    { number: '5555555555554444', label: 'NomuPay test card', source: 'NomuPay Integration Sheet, Test Data' },
    { number: '5200000000000007', label: '3DS frictionless (ECI 02)', source: '3D Secure testing guide' },
    { number: '5200000000000015', label: '3DS challenge', source: '3D Secure testing guide' },
  ],
  VISA: [
    { number: '4000000000000002', label: 'NomuPay test card', source: 'NomuPay Integration Sheet, Test Data' },
    { number: '4200000000000091', label: '3DS frictionless (ECI 05)', source: '3D Secure testing guide' },
    { number: '4200000000000042', label: '3DS challenge', source: '3D Secure testing guide' },
  ],
}
const ALL_TEST_NUMBERS = new Set(Object.values(TEST_CARDS).flatMap((list) => list.map((c) => c.number)))
export const isTestCard = (number) => ALL_TEST_NUMBERS.has(String(number || '').replace(/\s+/g, ''))

export const TEST_MODES = [
  { value: 'EXTERNAL', label: 'EXTERNAL', description: 'Sent on to NomuPay’s test system, end to end.' },
  { value: 'INTERNAL', label: 'INTERNAL', description: 'Answered by the gateway’s simulator. NomuPay isn’t reached.' },
  { value: '', label: 'Not sent', description: 'Same as INTERNAL: the simulator is the default.' },
]

export const SI_TYPES = [
  { value: 'RECURRING', label: 'Recurring', description: 'Fixed interval between payments (COF sheet 1.3 / 1.4).' },
  { value: 'UNSCHEDULED', label: 'Unscheduled', description: 'Variable interval and amount, e.g. a top-up (COF sheet 1.7 / 1.8).' },
]

export const RECURRING_TYPES = [
  { value: 'SUBSCRIPTION', label: 'SUBSCRIPTION', description: 'Fixed amount, fixed frequency.' },
  { value: 'STANDING_ORDER', label: 'STANDING_ORDER', description: 'Variable amount, fixed frequency.' },
]

export const THREE_DS_MODES = [
  { value: 'external', label: 'External MPI results', description: 'The request carries 3D Secure results, as in the docs sample. No redirect.' },
  { value: 'gateway', label: 'Gateway 3D Secure', description: 'The gateway runs 3D Secure, so the shopper may be redirected to authenticate.' },
]

export const AUTHORIZATION_TYPES = [
  { value: '', label: 'Not sent (pre-authorisation)' },
  { value: 'FINAL_AUTHORIZATION', label: 'FINAL_AUTHORIZATION' },
  { value: 'PRE_AUTHORIZATION', label: 'PRE_AUTHORIZATION' },
]

// 3D Secure results from an external MPI: the values in the docs sample, with the
// ECI each scheme uses for a successful authentication
const EXTERNAL_3DS = {
  VISA: { eci: '05' },
  MASTER: { eci: '02' },
  shared: {
    authenticationStatus: 'Y',
    version: '2.2.0',
    dsTransactionId: 'c75f23af-9454-43f6-ba17-130ed529507e',
    acsTransactionId: '2c42c553-176f-4f08-af6c-f9364ecbd0e8',
    verificationId: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=',
    flow: 'challenge',
  },
}

export const DEFAULT_CARD_FORM = {
  brand: 'MASTER',
  cardNumber: TEST_CARDS.MASTER[0].number,
  expiryMonth: '01',
  expiryYear: '2030',
  cvv: '333',
  holder: 'Test Shopper',
  amount: '10.00',
  currency: 'EUR',
  merchantTransactionId: '',
  siType: 'RECURRING',
  recurringType: 'SUBSCRIPTION',
  frequency: '0030',
  siExpiry: '2035-12-31',
  threeDS: 'external',
  authorizationType: '',
  email: 'test.shopper@example.com',
  billingCountry: 'GB',
  testMode: 'EXTERNAL',
}

export const DEFAULT_REPEATED = {
  amount: '',
  sendInitialTransactionId: false,
  sendAgreementId: false,
}

export const CURRENCIES = ['EUR', 'GBP', 'USD']

const str = (v) => String(v ?? '').trim()

// The browser data a server-to-server 3D Secure request carries (3DS parameters,
// "Browser data"); read from the shopper's browser when the request is sent
export const BROWSER_FIELDS = [
  'customer.browser.acceptHeader',
  'customer.browser.language',
  'customer.browser.screenHeight',
  'customer.browser.screenWidth',
  'customer.browser.timezone',
  'customer.browser.userAgent',
  'customer.browser.javaEnabled',
  'customer.browser.javascriptEnabled',
  'customer.browser.screenColorDepth',
  'customer.browser.challengeWindow',
]

export function readBrowserData() {
  if (typeof window === 'undefined') return {}
  return {
    'customer.browser.acceptHeader': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'customer.browser.language': navigator.language || 'en-GB',
    'customer.browser.screenHeight': String(window.screen?.height || 900),
    'customer.browser.screenWidth': String(window.screen?.width || 1440),
    'customer.browser.timezone': String(new Date().getTimezoneOffset()),
    'customer.browser.userAgent': navigator.userAgent.slice(0, 2048),
    'customer.browser.javaEnabled': 'false',
    'customer.browser.javascriptEnabled': 'true',
    'customer.browser.screenColorDepth': String(window.screen?.colorDepth || 24),
    'customer.browser.challengeWindow': '05',
  }
}

/**
 * Step 1: the initial payment (CIT) that stores the card.
 * @param {object} form  DEFAULT_CARD_FORM shape, plus paymentType ('DB' | 'PA') and browser {}
 * @param {object} env   { entityId, shopperResultUrl, customerIp }
 * @returns {Array<[string,string]>}
 */
export function buildInitialParams(form, env) {
  let paymentType = form.paymentType === 'PA' ? 'PA' : 'DB'
  let params = [
    ['entityId', env.entityId],
    ['paymentBrand', form.brand],
    ['card.number', str(form.cardNumber).replace(/\s+/g, '')],
    ['card.expiryMonth', str(form.expiryMonth)],
    ['card.expiryYear', str(form.expiryYear)],
    ['card.holder', str(form.holder)],
    ['card.cvv', str(form.cvv)],
    ['paymentType', paymentType],
    ['amount', str(form.amount)],
    ['currency', str(form.currency)],
    ['createRegistration', 'true'],
  ]
  if (form.testMode) params.push(['testMode', form.testMode])
  if (str(form.merchantTransactionId)) params.push(['merchantTransactionId', str(form.merchantTransactionId)])
  params.push(['standingInstruction.type', form.siType])
  if (form.siType === 'RECURRING') params.push(['standingInstruction.recurringType', form.recurringType])
  params.push(['standingInstruction.mode', 'INITIAL'], ['standingInstruction.source', 'CIT'])
  if (form.siType === 'RECURRING') {
    if (str(form.frequency)) params.push(['standingInstruction.frequency', str(form.frequency)])
    if (str(form.siExpiry)) params.push(['standingInstruction.expiry', str(form.siExpiry)])
  }
  if (paymentType === 'PA' && form.authorizationType) params.push(['customParameters[authorization_type]', form.authorizationType])
  if (str(form.email)) params.push(['customer.email', str(form.email)])
  if (str(form.billingCountry)) params.push(['billing.country', str(form.billingCountry)])

  if (form.threeDS === 'gateway') {
    if (env.customerIp) params.push(['customer.ip', env.customerIp])
    let browser = form.browser || {}
    for (let key of BROWSER_FIELDS) if (str(browser[key])) params.push([key, str(browser[key])])
    if (env.shopperResultUrl) params.push(['shopperResultUrl', env.shopperResultUrl])
  } else {
    let tds = { ...EXTERNAL_3DS.shared, ...(EXTERNAL_3DS[form.brand] || EXTERNAL_3DS.VISA) }
    params.push(
      ['threeDSecure.eci', tds.eci],
      ['threeDSecure.authenticationStatus', tds.authenticationStatus],
      ['threeDSecure.version', tds.version],
      ['threeDSecure.dsTransactionId', tds.dsTransactionId],
      ['threeDSecure.acsTransactionId', tds.acsTransactionId],
      ['threeDSecure.verificationId', tds.verificationId],
      ['threeDSecure.amount', str(form.amount)],
      ['threeDSecure.currency', str(form.currency)],
      ['threeDSecure.flow', tds.flow],
    )
  }
  return params
}

/** Capture (CP) of a pre-authorised initial payment. NomuPay sends the Mastercard lifecycle TLID itself. */
export function buildCaptureParams({ amount, currency, testMode }, env) {
  let params = [
    ['entityId', env.entityId],
    ['amount', str(amount)],
    ['currency', str(currency)],
    ['paymentType', 'CP'],
  ]
  if (testMode) params.push(['testMode', testMode])
  return params
}

/**
 * Step 3: the repeated payment (MIT) over the stored registration, COF sheet 1.4 / 1.8.
 * initialTransactionId and agreementId are optional with a registration: the gateway
 * fetches them from the initial payment. They're sent only when switched on.
 */
export function buildRepeatedParams({ form, repeated, ids }, env) {
  let params = [
    ['entityId', env.entityId],
    ['paymentBrand', form.brand],
    ['paymentType', 'DB'],
    ['amount', str(repeated.amount) || str(form.amount)],
    ['currency', str(form.currency)],
  ]
  if (form.testMode) params.push(['testMode', form.testMode])
  params.push(['standingInstruction.type', form.siType])
  if (form.siType === 'RECURRING') params.push(['standingInstruction.recurringType', form.recurringType])
  params.push(['standingInstruction.mode', 'REPEATED'], ['standingInstruction.source', 'MIT'])
  if (repeated.sendInitialTransactionId && str(ids?.initialTransactionId)) params.push(['standingInstruction.initialTransactionId', str(ids.initialTransactionId)])
  if (repeated.sendAgreementId && str(ids?.agreementId)) params.push(['standingInstruction.agreementId', str(ids.agreementId)])
  return params
}

/**
 * The card-on-file identifiers in a payment response: what the merchant stores
 * from the initial payment, and what a repeated payment echoes.
 * NomuPay Integration Sheet, Response field mapping:
 *   resultDetails.CardholderInitiatedTransactionID = paymentMethod.scheme.transactionId
 *   resultDetails.LifecycleId = paymentMethod.scheme.transactionLinkId (Mastercard TLID)
 */
export function cofIdentifiers(response) {
  let rd = response?.resultDetails || {}
  let si = response?.standingInstruction || {}
  let find = (...keys) => {
    for (let k of keys) {
      let v = rd[k] ?? rd[k.charAt(0).toLowerCase() + k.slice(1)]
      if (v !== undefined && v !== null && String(v) !== '') return String(v)
    }
    return ''
  }
  return {
    registrationId: str(response?.registrationId),
    cardholderInitiatedTransactionId: find('CardholderInitiatedTransactionID'),
    lifecycleId: find('LifecycleId', 'LifecycleID'),
    initialTransactionId: str(si.initialTransactionId) || find('CardholderInitiatedTransactionID'),
    agreementId: str(si.agreementId) || find('LifecycleId', 'LifecycleID'),
    siInitialTransactionId: str(si.initialTransactionId),
    siAgreementId: str(si.agreementId),
    hasResultDetails: Object.keys(rd).length > 0,
  }
}

const AMOUNT = /^\d{1,9}(\.\d{2})?$/
const futureDate = (v) => {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  if (!m) return false
  let d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now()
}

/** Validation shared by the page (to explain) and the server (to refuse). Returns a message or null. */
export function initialError(form) {
  if (!COF_BRANDS.some((b) => b.code === form.brand)) return 'Choose Visa or Mastercard.'
  if (!isTestCard(form.cardNumber)) return 'Use one of the published test cards. This demo never takes a real card number.'
  if (!TEST_CARDS[form.brand].some((c) => c.number === str(form.cardNumber).replace(/\s+/g, ''))) return 'That test card is for the other brand.'
  if (!/^(0[1-9]|1[0-2])$/.test(str(form.expiryMonth))) return 'Expiry month must be 01 to 12.'
  if (!/^20\d{2}$/.test(str(form.expiryYear))) return 'Expiry year must look like 2030.'
  if (!/^\d{3}$/.test(str(form.cvv))) return 'CVV must be 3 digits.'
  if (str(form.holder).length < 3 || str(form.holder).length > 128) return 'Card holder must be 3 to 128 characters.'
  if (!AMOUNT.test(str(form.amount))) return 'Amount must look like 10.00.'
  if (!CURRENCIES.includes(form.currency)) return `Currency must be one of ${CURRENCIES.join(', ')}.`
  if (form.merchantTransactionId && !/^[\w.\-]{8,255}$/.test(form.merchantTransactionId))
    return 'Merchant transaction ID: 8 to 255 letters, digits, . _ or -'
  if (!SI_TYPES.some((t) => t.value === form.siType)) return 'standingInstruction.type must be RECURRING or UNSCHEDULED.'
  if (form.siType === 'RECURRING') {
    if (!RECURRING_TYPES.some((t) => t.value === form.recurringType)) return 'standingInstruction.recurringType must be SUBSCRIPTION or STANDING_ORDER.'
    if (str(form.frequency) && !/^\d{4}$/.test(str(form.frequency))) return 'standingInstruction.frequency is 4 digits, e.g. 0030.'
    if (str(form.siExpiry) && !futureDate(str(form.siExpiry))) return 'standingInstruction.expiry must be a future date, yyyy-mm-dd.'
  }
  if (!THREE_DS_MODES.some((m) => m.value === form.threeDS)) return 'Choose how 3D Secure runs.'
  if (!AUTHORIZATION_TYPES.some((a) => a.value === (form.authorizationType || ''))) return 'Unknown authorisation type.'
  if (form.email && !/^[^\s@]{1,64}@[^\s@]{1,255}$/.test(form.email)) return 'Customer email doesn’t look right.'
  if (form.billingCountry && !/^[A-Z]{2}$/.test(form.billingCountry)) return 'Billing country must be a 2-letter code.'
  if (!TEST_MODES.some((t) => t.value === (form.testMode || ''))) return 'testMode must be EXTERNAL, INTERNAL or not sent.'
  return null
}

export function repeatedError({ registrationId, repeated, ids }) {
  if (!/^[0-9a-f]{32}$/.test(registrationId || '')) return 'The registrationId from step 1 is needed.'
  if (str(repeated?.amount) && !AMOUNT.test(str(repeated.amount))) return 'Amount must look like 10.00.'
  if (repeated?.sendInitialTransactionId && !/^[\w.\-=+/]{1,64}$/.test(str(ids?.initialTransactionId))) return 'There’s no initial transaction ID to send.'
  if (repeated?.sendAgreementId && !/^[\w.\-=+/]{1,35}$/.test(str(ids?.agreementId))) return 'There’s no agreementId (LifecycleId) to send.'
  return null
}
