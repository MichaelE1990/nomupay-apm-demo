// Recurring card payments (card on file) on the ACI/OPPWA gateway, server-to-server:
// the initial cardholder-initiated payment (CIT) that stores the card in a
// registration, then merchant-initiated payments (MIT) on that registration.
// Builds the parameters for both the live preview (browser) and the real request
// (server), so what the page shows is what gets sent. The checks run in both places.
//
// Sources: the Card on File guide on docs.oppwa.com (standingInstruction), the
// Server-to-Server Registration Tokens guide, the 3D Secure Testing Guide, and the
// Help Centre's Negative Testing Integration Sheet (card.holder = a decline code).

export const RECURRING_BRANDS = [
  { code: 'VISA', name: 'Visa' },
  { code: 'MASTER', name: 'Mastercard' },
]

export const RECURRING_CURRENCIES = ['EUR', 'GBP', 'USD']

// Test cards: the standard test cards, and cards enrolled in the 3-D Secure 2 simulator
export const TEST_CARDS = [
  { value: 'VISA', brand: 'VISA', number: '4200000000000000', label: 'Visa test card', note: 'Standard test card' },
  { value: 'VISA_3DS_FRICTIONLESS', brand: 'VISA', number: '4200000000000091', label: 'Visa · 3-D Secure frictionless', note: 'Authenticated without a challenge' },
  { value: 'VISA_3DS_CHALLENGE', brand: 'VISA', number: '4200000000000042', label: 'Visa · 3-D Secure challenge', note: 'Opens the challenge page' },
  { value: 'MASTER', brand: 'MASTER', number: '5454545454545454', label: 'Mastercard test card', note: 'Standard test card' },
  { value: 'MASTER_3DS_FRICTIONLESS', brand: 'MASTER', number: '5200000000000007', label: 'Mastercard · 3-D Secure frictionless', note: 'Authenticated without a challenge' },
  { value: 'MASTER_3DS_CHALLENGE', brand: 'MASTER', number: '5200000000000015', label: 'Mastercard · 3-D Secure challenge', note: 'Opens the challenge page' },
  { value: 'CUSTOM', brand: null, number: '', label: 'Another card number', note: 'Type it in below' },
]

// Decline codes for negative testing, from the result codes reference. Any rejection code
// works; success and pending codes (000.xxx.xxx) can't be negative tested.
export const DECLINE_CODES = [
  { code: '800.100.203', description: 'Insufficient Funds' },
  { code: '800.100.155', description: 'transaction declined (amount exceeds credit)' },
  { code: '100.100.303', description: 'card expired' },
  { code: '800.100.157', description: 'transaction declined (wrong expiry date)' },
  { code: '800.100.183', description: 'transaction declined (Do not honor)' },
  { code: '800.100.162', description: 'transaction declined (limit exceeded)' },
  { code: '800.100.151', description: 'transaction declined (invalid card)' },
  { code: '800.100.165', description: 'transaction declined (card lost)' },
  { code: '800.100.159', description: 'transaction declined (stolen card)' },
  { code: '800.100.160', description: 'transaction declined (card blocked)' },
  { code: '800.100.168', description: 'transaction declined (restricted card)' },
  { code: '800.100.170', description: 'transaction declined (transaction not permitted)' },
  { code: '800.100.500', description: 'Card holder has advised his bank to stop this recurring payment' },
  { code: '800.100.501', description: 'Card holder has advised his bank to stop all recurring payments for this merchant' },
  { code: '800.100.100', description: 'transaction declined for unknown reason' },
]

// The agreement types (standingInstruction.type) and what each needs on the initial payment
export const AGREEMENTS = {
  RECURRING: {
    title: 'Subscription',
    types: ['RECURRING'],
    text: 'A fixed interval and an agreed amount, such as a monthly membership.',
    needs: ['frequency', 'expiry'],
  },
  INSTALLMENT: {
    title: 'Installments',
    types: ['INSTALLMENT'],
    text: 'A set number of payments that together pay for one purchase.',
    needs: ['frequency', 'expiry', 'numberOfInstallments'],
  },
  UNSCHEDULED: {
    title: 'Unscheduled card on file',
    types: ['UNSCHEDULED'],
    text: 'The stored card is charged when needed, such as an account top-up when the balance runs low.',
    needs: [],
  },
}

export const RECURRING_TYPES = ['SUBSCRIPTION', 'STANDING_ORDER']

export const CUSTOMER_KEYS = [
  'customer.givenName',
  'customer.surname',
  'customer.email',
  'billing.street1',
  'billing.city',
  'billing.postcode',
  'billing.country',
]

export const BROWSER_KEYS = [
  'customer.browser.acceptHeader',
  'customer.browser.language',
  'customer.browser.screenHeight',
  'customer.browser.screenWidth',
  'customer.browser.timezone',
  'customer.browser.userAgent',
  'customer.browser.javaEnabled',
  'customer.browser.javascriptEnabled',
  'customer.browser.screenColorDepth',
]

// 3-D Secure 2 needs the shopper's browser details. A merchant collects them on its
// checkout page; here they come from this browser. A page can't read its own Accept
// header, so a typical one is sent (a server reads it from the shopper's request).
const COLOR_DEPTHS = [48, 32, 24, 16, 15, 8, 4, 1]
export function collectBrowser() {
  if (typeof window === 'undefined') return null
  let depth = Number(window.screen?.colorDepth) || 24
  return {
    'customer.browser.acceptHeader': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'customer.browser.language': navigator.language || 'en-GB',
    'customer.browser.screenHeight': String(window.screen?.height || 900),
    'customer.browser.screenWidth': String(window.screen?.width || 1440),
    'customer.browser.timezone': String(new Date().getTimezoneOffset()),
    'customer.browser.userAgent': navigator.userAgent.slice(0, 2048),
    'customer.browser.javaEnabled': 'false',
    'customer.browser.javascriptEnabled': 'true',
    'customer.browser.screenColorDepth': String(COLOR_DEPTHS.find((d) => d <= depth) || 24),
  }
}

const trim = (v) => String(v ?? '').trim()
const filled = (v) => trim(v) !== ''

function addDays(days) {
  let d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function defaultForm() {
  return {
    preset: 'VISA',
    paymentBrand: 'VISA',
    card: { number: '4200000000000000', holder: 'Test Shopper', expiryMonth: '12', expiryYear: String(new Date().getFullYear() + 3), cvv: '123' },
    amount: '10.00',
    currency: 'EUR',
    paymentType: 'DB',
    merchantTransactionId: '',
    merchantCustomerId: 'cust-0001',
    agreement: { recurringType: 'SUBSCRIPTION', frequency: '0030', expiry: addDays(365), numberOfInstallments: '12' },
    customer: {
      on: true,
      fields: {
        'customer.givenName': 'Test',
        'customer.surname': 'Shopper',
        'customer.email': 'test.shopper@example.com',
        'billing.street1': '10 Ancoats Street',
        'billing.city': 'Manchester',
        'billing.postcode': 'M46AA',
        'billing.country': 'GB',
      },
    },
    threeDS: { browser: true, flow: '', enrolled: false },
    testMode: '',
    repeated: { amount: '', sendInitialId: false, decline: false, code: '800.100.203', custom: '' },
    manage: { action: 'update', holder: '', expiryMonth: '', expiryYear: '' },
  }
}

// The standingInstruction parameters every payment in the agreement carries
function agreementParams(type, recurringType, mode, source) {
  let params = [
    ['standingInstruction.mode', mode],
    ['standingInstruction.source', source],
    ['standingInstruction.type', type],
  ]
  if (filled(recurringType)) params.push(['standingInstruction.recurringType', trim(recurringType)])
  return params
}

/**
 * The initial payment: POST /v1/payments with the card, the agreement as INITIAL CIT,
 * and createRegistration=true.
 * @param {object} input  { type, paymentBrand, card{}, amount, currency, paymentType, merchantTransactionId,
 *                          merchantCustomerId, agreement{}, customer{on, fields}, threeDS{browser, flow, enrolled}, browser{}, testMode }
 * @param {object} env    { entityId, shopperResultUrl, ip }
 */
export function buildInitialParams(input, env) {
  let card = input.card || {}
  let si = input.agreement || {}
  let needs = AGREEMENTS[input.type]?.needs || []
  let params = [
    ['entityId', env.entityId],
    ['amount', trim(input.amount)],
    ['currency', trim(input.currency)],
    ['paymentBrand', trim(input.paymentBrand)],
    ['paymentType', input.paymentType === 'PA' ? 'PA' : 'DB'],
    ['card.number', trim(card.number).replace(/\s+/g, '')],
    ['card.holder', trim(card.holder)],
    ['card.expiryMonth', trim(card.expiryMonth)],
    ['card.expiryYear', trim(card.expiryYear)],
    ['card.cvv', trim(card.cvv)],
    ['merchantTransactionId', trim(input.merchantTransactionId)],
    ['customer.merchantCustomerId', trim(input.merchantCustomerId)],
    ...agreementParams(input.type, si.recurringType, 'INITIAL', 'CIT'),
  ]
  if (needs.includes('frequency')) params.push(['standingInstruction.frequency', trim(si.frequency)])
  if (needs.includes('expiry')) params.push(['standingInstruction.expiry', trim(si.expiry)])
  if (needs.includes('numberOfInstallments')) params.push(['standingInstruction.numberOfInstallments', trim(si.numberOfInstallments)])
  params.push(['createRegistration', 'true'])
  if (input.customer?.on) for (let key of CUSTOMER_KEYS) params.push([key, trim(input.customer.fields?.[key])])
  if (input.threeDS?.browser) {
    params.push(['customer.ip', trim(env.ip)])
    for (let key of BROWSER_KEYS) params.push([key, trim(input.browser?.[key])])
  }
  if (input.threeDS?.enrolled) params.push(['customParameters[3DS2_enrolled]', 'true'])
  if (filled(input.threeDS?.flow)) params.push(['customParameters[3DS2_flow]', trim(input.threeDS.flow)])
  params.push(['shopperResultUrl', trim(env.shopperResultUrl)])
  if (filled(input.testMode)) params.push(['testMode', trim(input.testMode)])
  return params.filter(([, v]) => v !== '')
}

/**
 * A subsequent payment: POST /v1/registrations/{id}/payments as REPEATED MIT.
 * declineCode: sent as card.holder, the test system's negative testing trigger.
 * @param {object} input  { type, recurringType, amount, currency, merchantTransactionId, initialTransactionId, declineCode, testMode }
 */
export function buildRepeatedParams(input, env) {
  let params = [
    ['entityId', env.entityId],
    ['amount', trim(input.amount)],
    ['currency', trim(input.currency)],
    ['paymentType', 'DB'],
    ...agreementParams(input.type, input.recurringType, 'REPEATED', 'MIT'),
    ['standingInstruction.initialTransactionId', trim(input.initialTransactionId)],
    ['merchantTransactionId', trim(input.merchantTransactionId)],
    ['card.holder', trim(input.declineCode)],
  ]
  if (filled(input.testMode)) params.push(['testMode', trim(input.testMode)])
  return params.filter(([, v]) => v !== '')
}

/**
 * Manage the registration: update the stored card (POST /v1/registrations/{id})
 * or delete it (DELETE /v1/registrations/{id}).
 * @param {object} input  { action: 'update' | 'delete', card{ holder, expiryMonth, expiryYear } }
 */
export function buildManageParams(input, env) {
  let params = [['entityId', env.entityId]]
  if (input.action !== 'delete') {
    let card = input.card || {}
    params.push(['card.holder', trim(card.holder)], ['card.expiryMonth', trim(card.expiryMonth)], ['card.expiryYear', trim(card.expiryYear)])
  }
  return params.filter(([, v]) => v !== '')
}

/** Mandatory fields still empty on the initial payment, as parameter names */
export function missingInitial(input) {
  let card = input.card || {}
  let si = input.agreement || {}
  let needs = AGREEMENTS[input.type]?.needs || []
  let missing = []
  if (!filled(input.amount)) missing.push('amount')
  if (!filled(input.currency)) missing.push('currency')
  if (!filled(input.paymentBrand)) missing.push('paymentBrand')
  for (let k of ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv']) if (!filled(card[k])) missing.push(`card.${k}`)
  for (let k of needs) if (!filled(si[k])) missing.push(`standingInstruction.${k}`)
  // Mastercard needs the recurring type on every CIT and MIT
  if (input.paymentBrand === 'MASTER' && !filled(si.recurringType)) missing.push('standingInstruction.recurringType')
  if (input.customer?.on) for (let k of CUSTOMER_KEYS) if (!filled(input.customer.fields?.[k])) missing.push(k)
  return missing
}

const AMOUNT = /^\d{1,9}(\.\d{2})?$/
const CURRENCY = /^[A-Z]{3}$/
const MTID = /^[\w.\-]{1,255}$/
export const REGISTRATION_ID = /^[0-9a-f]{32}$/
export const DECLINE_CODE = /^(?!000\.)\d{3}\.\d{3}\.\d{3}$/

function checkAgreement(type, recurringType) {
  if (!AGREEMENTS[type]) return 'standingInstruction.type must be RECURRING, INSTALLMENT or UNSCHEDULED.'
  if (filled(recurringType) && !RECURRING_TYPES.includes(trim(recurringType))) return 'standingInstruction.recurringType must be SUBSCRIPTION or STANDING_ORDER.'
  return null
}

function checkCommon(input) {
  if (!AMOUNT.test(trim(input.amount))) return 'Amount must look like 10.00.'
  if (!CURRENCY.test(trim(input.currency))) return 'Currency must be a 3-letter code.'
  if (filled(input.merchantTransactionId) && !MTID.test(trim(input.merchantTransactionId))) return 'Merchant transaction ID can use letters, digits, . _ and -'
  if (filled(input.testMode) && !['INTERNAL', 'EXTERNAL'].includes(trim(input.testMode))) return 'testMode must be INTERNAL or EXTERNAL.'
  return null
}

/** Server-side check of the initial payment input. Returns an error message or null. */
export function validateInitial(input) {
  let error = checkCommon(input) || checkAgreement(input.type, input.agreement?.recurringType)
  if (error) return error
  let missing = missingInitial(input)
  if (missing.length) return `Missing mandatory ${missing.length === 1 ? 'field' : 'fields'}: ${missing.join(', ')}`
  if (!RECURRING_BRANDS.some((b) => b.code === input.paymentBrand)) return 'paymentBrand must be VISA or MASTER.'
  let card = input.card || {}
  if (!/^\d{12,19}$/.test(trim(card.number).replace(/\s+/g, ''))) return 'card.number must be 12 to 19 digits.'
  if (!/^[\s\S]{3,128}$/.test(trim(card.holder))) return 'card.holder must be 3 to 128 characters.'
  if (!/^(0[1-9]|1[0-2])$/.test(trim(card.expiryMonth))) return 'card.expiryMonth must be 01 to 12.'
  if (!/^20\d{2}$/.test(trim(card.expiryYear))) return 'card.expiryYear must be a year like 2029.'
  if (!/^\d{3,4}$/.test(trim(card.cvv))) return 'card.cvv must be 3 or 4 digits.'
  let si = input.agreement || {}
  let needs = AGREEMENTS[input.type].needs
  if (needs.includes('frequency') && !/^\d{4}$/.test(trim(si.frequency))) return 'standingInstruction.frequency must be 4 digits, like 0030.'
  if (needs.includes('expiry') && !/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(trim(si.expiry))) return 'standingInstruction.expiry must be a date like 2027-11-16.'
  if (needs.includes('numberOfInstallments') && !/^\d{1,3}$/.test(trim(si.numberOfInstallments))) return 'standingInstruction.numberOfInstallments must be 1 to 3 digits.'
  if (trim(input.merchantCustomerId).length > 255) return 'customer.merchantCustomerId is too long.'
  if (input.customer?.on) {
    for (let k of CUSTOMER_KEYS) if (trim(input.customer.fields?.[k]).length > 128) return `${k} is too long.`
    if (!/^[A-Z]{2}$/.test(trim(input.customer.fields?.['billing.country']))) return 'billing.country must be a 2-letter code.'
  }
  if (input.threeDS?.browser) for (let k of BROWSER_KEYS) if (trim(input.browser?.[k]).length > 2048) return `${k} is too long.`
  if (filled(input.threeDS?.flow) && !['challenge', 'frictionless'].includes(trim(input.threeDS.flow))) return 'customParameters[3DS2_flow] must be challenge or frictionless.'
  return null
}

/** Server-side check of a subsequent payment input */
export function validateRepeated(input) {
  let error = checkCommon(input) || checkAgreement(input.type, input.recurringType)
  if (error) return error
  if (filled(input.initialTransactionId) && !/^[\w.\-]{1,64}$/.test(trim(input.initialTransactionId))) return 'standingInstruction.initialTransactionId has unexpected characters.'
  if (filled(input.declineCode) && !DECLINE_CODE.test(trim(input.declineCode))) return 'The decline code must look like 800.100.203, and can’t be a success or pending code (000.xxx.xxx).'
  return null
}

/** Server-side check of a registration update or delete */
export function validateManage(input) {
  if (!['update', 'delete'].includes(input.action)) return 'action must be update or delete.'
  if (input.action === 'delete') return null
  let card = input.card || {}
  if (!filled(card.holder) && !filled(card.expiryMonth) && !filled(card.expiryYear)) return 'Give a new card.holder or expiry date to update.'
  if (filled(card.holder) && !/^[\s\S]{3,128}$/.test(trim(card.holder))) return 'card.holder must be 3 to 128 characters.'
  if (filled(card.expiryMonth) && !/^(0[1-9]|1[0-2])$/.test(trim(card.expiryMonth))) return 'card.expiryMonth must be 01 to 12.'
  if (filled(card.expiryYear) && !/^20\d{2}$/.test(trim(card.expiryYear))) return 'card.expiryYear must be a year like 2029.'
  return null
}

// Where the scheme's reference for the initial payment comes back
export function initialTransactionIdOf(response) {
  return response?.standingInstruction?.initialTransactionId || response?.resultDetails?.CardholderInitiatedTransactionID || ''
}
