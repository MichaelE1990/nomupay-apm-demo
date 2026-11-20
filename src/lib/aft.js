// Account Funding Transactions (AFTs) on the ACI/OPPWA gateway, server-to-server: a card
// payment that funds an account (a trading account, a wallet, a prepaid card) rather than
// buying goods or services. Builds the parameters for both the live preview (browser) and
// the real request (server), so what the page shows is what gets sent. The checks run in
// both places.
//
// Sources: the Help Centre's Account Funding Transactions section (the 6211 - Security
// Brokers/Dealers article for the parameters, formats and the Funds Transfer Type to Visa
// BAI / Mastercard TTI mapping), and Nomupay's list of the MCCs each Funds Transfer Type
// is allowed for on each scheme (Nov 2026). The MCC itself isn't a request parameter: it's
// set on the merchant account, and decides which Funds Transfer Types the account can send.

import { BROWSER_KEYS, CUSTOMER_KEYS, TEST_CARDS } from '@/lib/recurring'

export { BROWSER_KEYS, CUSTOMER_KEYS, TEST_CARDS, collectBrowser } from '@/lib/recurring'

export const AFT_SECTION_URL = 'https://support.nomupay.com/hc/en-gb/sections/33401315105809-Account-Funding-Transactions'
export const AFT_PARAMETERS_URL = 'https://support.nomupay.com/hc/en-gb/articles/34020652253329-6211-Security-Brokers-Dealers'

export const AFT_BRANDS = [
  { code: 'VISA', name: 'Visa', short: 'Visa', tag: 'BAI' },
  { code: 'MASTER', name: 'Mastercard', short: 'MC', tag: 'TTI' },
]

export const AFT_CURRENCIES = ['EUR', 'GBP', 'USD']

// Funds Transfer Types (customParameters[FundsTransferType]): what the funds are for. The
// gateway maps each one to the Visa BAI and the Mastercard TTI, and each scheme allows it
// for its own list of MCCs. purchase_ types buy the asset straight away; wallet_ and own_
// types fund an account for later.
export const FUNDS_TRANSFER_TYPES = {
  purchase_crypto: {
    title: 'Buy crypto',
    text: 'The card payment buys cryptocurrency straight away.',
    direct: true,
    VISA: { code: 'LA', mccs: ['6051'] },
    MASTER: { code: 'P70', mccs: ['6051'] },
  },
  purchase_high_risk_securities: {
    title: 'Buy high-risk securities',
    text: 'The card payment buys high-risk securities straight away.',
    direct: true,
    VISA: { code: 'LA', mccs: ['6211'] },
    MASTER: { code: 'P71', mccs: ['6211'] },
  },
  purchase_liquid_assets: {
    title: 'Buy liquid assets',
    text: 'The card payment buys liquid assets straight away.',
    direct: true,
    VISA: { code: 'LA', mccs: ['6012', '6051', '6211'] },
    MASTER: { code: 'F52', mccs: ['6211', '4829'] },
  },
  wallet_crypto: {
    title: 'Fund a crypto account',
    text: 'The card payment funds the shopper’s crypto account or wallet, for purchases later.',
    direct: false,
    VISA: { code: 'LA', mccs: ['6051'] },
    MASTER: { code: 'F52', mccs: ['6051'] },
  },
  wallet_high_risk_securities: {
    title: 'Fund a trading account',
    text: 'The card payment funds the shopper’s trading account for high-risk securities, for trades later.',
    direct: false,
    VISA: { code: 'LA', mccs: ['6211'] },
    MASTER: { code: 'F52', mccs: ['6211'] },
  },
  wallet_liquid_assets: {
    title: 'Fund a liquid assets account',
    text: 'The card payment funds the shopper’s account for liquid assets, for purchases later.',
    direct: false,
    VISA: { code: 'LA', mccs: ['6012', '6051', '6211'] },
    MASTER: { code: 'F52', mccs: ['6211', '4829'] },
  },
  wallet_stored_value: {
    title: 'Load a stored-value account',
    text: 'The card payment loads the shopper’s stored-value account.',
    direct: false,
    VISA: { code: 'FT', mccs: ['4829', '6012', '6540', '6211'] },
    MASTER: { code: 'F52', mccs: ['4829'] },
  },
  wallet_staged: {
    title: 'Load a staged digital wallet',
    text: 'The card payment adds value to a staged digital wallet: a wallet with its own merchant acceptance network.',
    direct: false,
    VISA: { code: 'WT', mccs: ['6051'] },
    MASTER: { code: 'F61', mccs: ['6540'] },
  },
  own_account: {
    title: 'Fund the shopper’s own account',
    text: 'The card payment funds the shopper’s own account at the same or another financial institution (me-to-me).',
    direct: false,
    VISA: { code: 'AA', mccs: ['4829', '6012', '6211'] },
    MASTER: { code: 'F52', mccs: ['4829'] },
  },
  own_prepaid_card: {
    title: 'Load the shopper’s prepaid card',
    text: 'The card payment loads or reloads the shopper’s own prepaid card or reloadable prepaid account.',
    direct: false,
    VISA: { code: 'TU', mccs: ['6012', '6051', '6540'] },
    MASTER: { code: 'F64', mccs: ['4829'] },
  },
}

// The MCCs that process AFTs, in the order the page lists them. purposeCode: the
// transactionPurposeCode the Help Centre documents for the MCC (Mastercard)
export const MCCS = [
  {
    code: '6211',
    title: 'Security brokers and dealers',
    description: 'Brokers and trading platforms: the shopper’s card funds a trading account, or buys securities.',
    purposeCode: 'HIGHRISKSEC',
    defaultType: 'wallet_high_risk_securities',
  },
  {
    code: '6540',
    title: 'Stored value card purchase or load',
    description: 'Non-financial institutions that load stored-value cards, prepaid accounts and wallets.',
    defaultType: 'wallet_staged',
  },
  {
    code: '6051',
    title: 'Foreign currency, liquid and crypto assets',
    description: 'Non-financial institutions selling foreign currency, liquid and cryptocurrency assets, money orders and travellers cheques.',
    defaultType: 'wallet_crypto',
  },
  {
    code: '4829',
    title: 'Money transfer',
    description: 'Wire transfers, money orders and money transfer services: the shopper’s card funds a transfer or their own account.',
    defaultType: 'wallet_stored_value',
  },
  {
    code: '6012',
    title: 'Financial institutions',
    description: 'Merchandise and services from financial institutions. Visa only, and only when your acquirer asks for AFTs.',
    defaultType: 'wallet_liquid_assets',
  },
]

export const getMcc = (code) => MCCS.find((m) => m.code === code) || null

// The schemes (VISA, MASTER) that allow a Funds Transfer Type for an MCC
export function schemesFor(mcc, type) {
  let t = FUNDS_TRANSFER_TYPES[type]
  if (!t) return []
  return AFT_BRANDS.map((b) => b.code).filter((s) => t[s]?.mccs.includes(mcc))
}

// The Funds Transfer Types an MCC can send, with the schemes that allow each
export function typesFor(mcc) {
  return Object.entries(FUNDS_TRANSFER_TYPES)
    .map(([value, t]) => ({ value, ...t, schemes: schemesFor(mcc, value) }))
    .filter((t) => t.schemes.length > 0)
}

// The scheme code a Funds Transfer Type maps to: the Visa BAI or the Mastercard TTI
export function schemeCode(type, brand) {
  return FUNDS_TRANSFER_TYPES[type]?.[brand]?.code || ''
}

// The other scheme's version of a test card, so switching brand keeps the 3-D Secure behaviour
export function cardForBrand(preset, brand) {
  let kind = String(preset || '').replace(/^(VISA|MASTER)/, '')
  return TEST_CARDS.find((c) => c.value === `${brand}${kind}`) || TEST_CARDS.find((c) => c.value === brand)
}

// sender.* parameters, in the order the Help Centre lists them
export const SENDER_KEYS = ['sender.givenName', 'sender.surname', 'sender.street', 'sender.city', 'sender.state', 'sender.postcode', 'sender.country']
const SENDER_REQUIRED = ['sender.givenName', 'sender.surname', 'sender.street', 'sender.city', 'sender.state', 'sender.country']

const trim = (v) => String(v ?? '').trim()
const filled = (v) => trim(v) !== ''

export function defaultForm() {
  let mcc = MCCS[0]
  return {
    preset: 'VISA',
    paymentBrand: 'VISA',
    card: { number: '4200000000000000', holder: 'Jane Doe', expiryMonth: '12', expiryYear: String(new Date().getFullYear() + 3), cvv: '123' },
    amount: '10.00',
    currency: 'EUR',
    paymentType: 'DB',
    merchantTransactionId: '',
    purposeCode: mcc.purposeCode || '',
    directPurchase: FUNDS_TRANSFER_TYPES[mcc.defaultType].direct,
    // The sender is the cardholder, sent apart from the billing details (the Help Centre example)
    sender: {
      'sender.givenName': 'Jane',
      'sender.surname': 'Doe',
      'sender.street': '229 Green Ln',
      'sender.city': 'Ilford',
      'sender.state': 'Greater London',
      'sender.postcode': 'IG1 1XR',
      'sender.country': 'GB',
    },
    birthDate: '2000-01-21',
    crossBorder: false,
    // Who the funds are for: the shopper's own account with the merchant, or the business
    recipient: { who: 'shopper', businessName: 'Demo Merchant Ltd', accountNumber: '1234567890' },
    customer: {
      on: true,
      fields: {
        'customer.givenName': 'Jane',
        'customer.surname': 'Doe',
        'customer.email': 'jane.doe@example.com',
        'customer.mobile': '+44-7700900123',
        'billing.street1': '229 Green Ln',
        'billing.city': 'Ilford',
        'billing.postcode': 'IG11XR',
        'billing.country': 'GB',
      },
    },
    threeDS: { browser: true, flow: '', enrolled: false, challengeIndicator: '', challengeWindow: '05' },
    testMode: '',
    capture: { amount: '' },
  }
}

// The recipient's name: the shopper (the same person as the sender) or the business
export function recipientNames(input) {
  let r = input.recipient || {}
  if (r.who === 'business') return { givenName: trim(r.businessName), surname: '' }
  return { givenName: trim(input.sender?.['sender.givenName']), surname: trim(input.sender?.['sender.surname']) }
}

/**
 * The AFT payment: POST /v1/payments with the card, the AFT classification, the sender and
 * the recipient, and the shopper's details for 3-D Secure.
 * @param {object} input  { mcc, type, paymentBrand, card{}, amount, currency, paymentType, merchantTransactionId,
 *                          purposeCode, directPurchase, sender{}, birthDate, crossBorder, recipient{ who, businessName, accountNumber },
 *                          customer{on, fields}, threeDS{}, browser{}, testMode }
 * @param {object} env    { entityId, shopperResultUrl, ip }
 */
export function buildAftParams(input, env) {
  let card = input.card || {}
  let sender = input.sender || {}
  let recipient = recipientNames(input)
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
    ['transactionProcessingCode', 'FUNDING'],
    ['transactionPurposeCode', trim(input.purposeCode)],
    ['customParameters[FundsTransferType]', trim(input.type)],
    ['customParameters[isDirectPurchase]', input.directPurchase ? 'true' : 'false'],
    ['sender.accountNumberType', 'CARD_ACCOUNT'],
    ['sender.givenName', trim(sender['sender.givenName'])],
    ['sender.surname', trim(sender['sender.surname'])],
    ['sender.birthDate', input.crossBorder ? trim(input.birthDate) : ''],
    ['sender.street', trim(sender['sender.street'])],
    ['sender.city', trim(sender['sender.city'])],
    ['sender.state', trim(sender['sender.state'])],
    ['sender.postcode', trim(sender['sender.postcode'])],
    ['sender.country', trim(sender['sender.country'])],
    ['recipient.givenName', recipient.givenName],
    ['recipient.surname', recipient.surname],
    ['recipient.accountNumberType', 'WALLET_ID'],
    ['recipient.accountNumber', trim(input.recipient?.accountNumber)],
  ]
  if (input.customer?.on) for (let key of CUSTOMER_KEYS) params.push([key, trim(input.customer.fields?.[key])])
  if (input.threeDS?.browser) {
    params.push(['customer.ip', trim(env.ip)])
    for (let key of BROWSER_KEYS) params.push([key, trim(input.browser?.[key])])
    params.push(['customer.browser.challengeWindow', trim(input.threeDS.challengeWindow)])
  }
  params.push(['threeDSecure.challengeIndicator', trim(input.threeDS?.challengeIndicator)])
  if (input.threeDS?.enrolled) params.push(['customParameters[3DS2_enrolled]', 'true'])
  if (filled(input.threeDS?.flow)) params.push(['customParameters[3DS2_flow]', trim(input.threeDS.flow)])
  params.push(['shopperResultUrl', trim(env.shopperResultUrl)])
  if (filled(input.testMode)) params.push(['testMode', trim(input.testMode)])
  return params.filter(([, v]) => v !== '')
}

/** Capture a pre-authorized AFT: POST /v1/payments/{id} with paymentType=CP and the payment's testMode */
export function buildCaptureParams(input, env) {
  let params = [
    ['entityId', env.entityId],
    ['amount', trim(input.amount)],
    ['currency', trim(input.currency)],
    ['paymentType', 'CP'],
  ]
  if (filled(input.testMode)) params.push(['testMode', trim(input.testMode)])
  return params
}

// transactionPurposeCode is required for Mastercard. It's only enforced here where the Help
// Centre documents the value for the MCC (HIGHRISKSEC for 6211)
export function purposeRequired(input) {
  return input.paymentBrand === 'MASTER' && Boolean(getMcc(input.mcc)?.purposeCode)
}

/** Mandatory fields still empty on the AFT payment, as parameter names */
export function missingAft(input) {
  let card = input.card || {}
  let missing = []
  if (!filled(input.amount)) missing.push('amount')
  if (!filled(input.currency)) missing.push('currency')
  if (!filled(input.paymentBrand)) missing.push('paymentBrand')
  for (let k of ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv']) if (!filled(card[k])) missing.push(`card.${k}`)
  if (!filled(input.type)) missing.push('customParameters[FundsTransferType]')
  if (purposeRequired(input) && !filled(input.purposeCode)) missing.push('transactionPurposeCode')
  for (let k of SENDER_REQUIRED) if (!filled(input.sender?.[k])) missing.push(k)
  if (input.crossBorder && !filled(input.birthDate)) missing.push('sender.birthDate')
  let recipient = recipientNames(input)
  if (!recipient.givenName) missing.push('recipient.givenName')
  if (input.recipient?.who !== 'business' && !recipient.surname) missing.push('recipient.surname')
  if (!filled(input.recipient?.accountNumber)) missing.push('recipient.accountNumber')
  if (input.customer?.on) for (let k of CUSTOMER_KEYS) if (!filled(input.customer.fields?.[k])) missing.push(k)
  return missing
}

/** Why the Funds Transfer Type can't be sent with this card brand, or null */
export function typeProblem(input) {
  let mcc = getMcc(input.mcc)
  let t = FUNDS_TRANSFER_TYPES[input.type]
  if (!mcc) return 'Choose one of the MCCs on this page.'
  if (!t) return 'Choose a Funds Transfer Type.'
  let schemes = schemesFor(mcc.code, input.type)
  if (!schemes.length) return `${input.type} isn’t allowed for MCC ${mcc.code}.`
  if (!schemes.includes(input.paymentBrand)) {
    let brand = AFT_BRANDS.find((b) => b.code === input.paymentBrand)?.name || input.paymentBrand
    return `${input.type} isn’t allowed for MCC ${mcc.code} on ${brand}. Use a ${schemes.map((s) => AFT_BRANDS.find((b) => b.code === s).name).join(' or ')} card.`
  }
  return null
}

const AMOUNT = /^\d{1,9}(\.\d{2})?$/
const CURRENCY = /^[A-Z]{3}$/
const MTID = /^[\w.\-]{1,255}$/
const DATE = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
export const PAYMENT_ID = /^[0-9a-f]{32}$/

// The formats from the Help Centre's required parameters table
const LIMITS = {
  'sender.givenName': 50,
  'sender.surname': 50,
  'sender.street': 100,
  'sender.city': 50,
  'sender.state': 50,
  'sender.postcode': 16,
  'recipient.givenName': 50,
  'recipient.surname': 50,
  'recipient.accountNumber': 50,
}

/** Server-side check of the AFT payment input. Returns an error message or null. */
export function validateAft(input) {
  if (!AMOUNT.test(trim(input.amount))) return 'Amount must look like 10.00.'
  if (!CURRENCY.test(trim(input.currency))) return 'Currency must be a 3-letter code.'
  if (filled(input.merchantTransactionId) && !MTID.test(trim(input.merchantTransactionId))) return 'Merchant transaction ID can use letters, digits, . _ and -'
  if (filled(input.testMode) && !['INTERNAL', 'EXTERNAL'].includes(trim(input.testMode))) return 'testMode must be INTERNAL or EXTERNAL.'
  if (!AFT_BRANDS.some((b) => b.code === input.paymentBrand)) return 'paymentBrand must be VISA or MASTER.'
  if (!['DB', 'PA'].includes(input.paymentType || 'DB')) return 'paymentType must be DB or PA.'
  let missing = missingAft(input)
  if (missing.length) return `Missing mandatory ${missing.length === 1 ? 'field' : 'fields'}: ${missing.join(', ')}`
  let problem = typeProblem(input)
  if (problem) return problem
  let card = input.card || {}
  if (!/^\d{12,19}$/.test(trim(card.number).replace(/\s+/g, ''))) return 'card.number must be 12 to 19 digits.'
  if (!/^[\s\S]{3,128}$/.test(trim(card.holder))) return 'card.holder must be 3 to 128 characters.'
  if (!/^(0[1-9]|1[0-2])$/.test(trim(card.expiryMonth))) return 'card.expiryMonth must be 01 to 12.'
  if (!/^20\d{2}$/.test(trim(card.expiryYear))) return 'card.expiryYear must be a year like 2029.'
  if (!/^\d{3,4}$/.test(trim(card.cvv))) return 'card.cvv must be 3 or 4 digits.'
  if (filled(input.purposeCode) && !/^[A-Za-z0-9_]{1,20}$/.test(trim(input.purposeCode))) return 'transactionPurposeCode can be up to 20 letters and digits.'
  let values = { ...input.sender, 'recipient.accountNumber': input.recipient?.accountNumber, ...Object.fromEntries(Object.entries(recipientNames(input)).map(([k, v]) => [`recipient.${k}`, v])) }
  for (let [k, max] of Object.entries(LIMITS)) if (trim(values[k]).length > max) return `${k} can be up to ${max} characters.`
  if (!/^[A-Z]{2}$/.test(trim(input.sender?.['sender.country']))) return 'sender.country must be a 2-letter code, like GB.'
  if (input.crossBorder && !DATE.test(trim(input.birthDate))) return 'sender.birthDate must be a date like 2000-01-21.'
  if (input.recipient?.who && !['shopper', 'business'].includes(input.recipient.who)) return 'The recipient is the shopper or the business.'
  if (input.customer?.on) {
    for (let k of CUSTOMER_KEYS) if (trim(input.customer.fields?.[k]).length > 128) return `${k} is too long.`
    if (!/^[A-Z]{2}$/.test(trim(input.customer.fields?.['billing.country']))) return 'billing.country must be a 2-letter code.'
    if (!/^\+?\d{1,3}-\d{1,15}$/.test(trim(input.customer.fields?.['customer.mobile']))) return 'customer.mobile must look like +44-7700900123.'
  }
  if (filled(input.threeDS?.challengeIndicator) && !/^0[1-9]$/.test(trim(input.threeDS.challengeIndicator))) return 'threeDSecure.challengeIndicator must be 01 to 09.'
  if (filled(input.threeDS?.challengeWindow) && !/^0[1-5]$/.test(trim(input.threeDS.challengeWindow))) return 'customer.browser.challengeWindow must be 01 to 05.'
  if (input.threeDS?.browser) for (let k of BROWSER_KEYS) if (trim(input.browser?.[k]).length > 2048) return `${k} is too long.`
  if (filled(input.threeDS?.flow) && !['challenge', 'frictionless'].includes(trim(input.threeDS.flow))) return 'customParameters[3DS2_flow] must be challenge or frictionless.'
  return null
}

/** Server-side check of a capture */
export function validateCapture(input) {
  if (!AMOUNT.test(trim(input.amount))) return 'Amount must look like 10.00.'
  if (!CURRENCY.test(trim(input.currency))) return 'Currency must be a 3-letter code.'
  if (filled(input.testMode) && !['INTERNAL', 'EXTERNAL'].includes(trim(input.testMode))) return 'testMode must be INTERNAL or EXTERNAL.'
  return null
}
