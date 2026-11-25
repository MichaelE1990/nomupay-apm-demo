// Pay by Bank (Open Banking, delivered with Token.io) on the ACI/OPPWA gateway, server-to-server.
// Builds the payment for both the live preview (browser) and the real request (server), so
// what the page shows is what gets sent. Sources: the Help Centre's Open Banking section
// (Account Setup, OpenBanking PayByLinks, OpenBanking API) and the Pay by Bank merchant one-pager.

export const OPEN_BANKING_SECTION_URL = 'https://support.nomupay.com/hc/en-gb/sections/19215253523089-Open-Banking'
export const PAY_BY_LINKS_URL = 'https://support.nomupay.com/hc/en-gb/articles/9409128173201-Pay-by-Links'
export const COVERAGE_URL = 'https://token.io/coverage'
export const SALES_EMAIL = 'sales@nomupay.com'
export const SUPPORT_EMAIL = 'support@nomupay.com'


export const OB_BRAND = 'ACI_INSTANTPAY'
export const OB_CURRENCIES = ['GBP', 'EUR']

// The API steps on the Integration page; the transaction flow on Get started links to them
export const OB_STEPS = [
  { key: 'payment', id: 'send-the-payment', step: 1, title: 'Send the payment', tag: 'POST' },
  { key: 'redirect', id: 'send-the-shopper-to-their-bank', step: 2, title: 'Send the shopper to their bank' },
  { key: 'status', id: 'get-the-payment-status', step: 3, title: 'Get the payment status', tag: 'GET' },
]

// The shopper's bank country (bankAccount.country), with the currency that goes with it
export const OB_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IE', name: 'Ireland', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
]

export const currencyFor = (country) => OB_COUNTRIES.find((c) => c.code === country)?.currency || 'EUR'

// How long the bank's final confirmation takes, from the Help Centre's OpenBanking API article
export const CONFIRMATION_TIMES = [
  { label: 'Under 30 seconds', value: 24 },
  { label: 'Under 60 seconds', value: 64.57 },
  { label: 'Under 90 seconds', value: 97.74 },
  { label: 'Under 2 minutes', value: 99.23 },
  { label: 'Under 5 minutes', value: 99.88 },
  { label: 'Under 15 minutes', value: 99.91 },
]

export function defaultForm() {
  return { amount: '10.00', currency: 'GBP', country: 'GB', merchantTransactionId: '' }
}

const trim = (v) => String(v ?? '').trim()

/**
 * The Pay by Bank payment: POST /v1/payments
 * @param {object} input  { amount, currency, country, merchantTransactionId }
 * @param {object} env    { entityId, shopperResultUrl }
 */
export function buildPaymentParams(input, env) {
  return [
    ['entityId', env.entityId],
    ['amount', trim(input.amount)],
    ['currency', trim(input.currency)],
    ['paymentBrand', OB_BRAND],
    ['paymentType', 'DB'],
    ['bankAccount.country', trim(input.country)],
    ['merchantTransactionId', trim(input.merchantTransactionId)],
    ['shopperResultUrl', trim(env.shopperResultUrl)],
  ].filter(([, v]) => v !== '')
}

/** Mandatory fields still empty, as parameter names */
export function missingPayment(input) {
  let missing = []
  if (!trim(input.amount)) missing.push('amount')
  if (!trim(input.currency)) missing.push('currency')
  if (!trim(input.country)) missing.push('bankAccount.country')
  return missing
}

export const PAYMENT_ID = /^[0-9a-f]{32}$/

/** Server-side check. Returns an error message or null. */
export function validatePayment(input) {
  if (!/^\d{1,10}\.\d{2}$/.test(trim(input.amount))) return 'Amount must look like 10.00.'
  if (Number(input.amount) <= 0) return 'Amount must be more than 0.00.'
  if (!OB_CURRENCIES.includes(trim(input.currency))) return 'Pay by Bank takes GBP or EUR.'
  if (!/^[A-Z]{2}$/.test(trim(input.country))) return 'bankAccount.country must be a 2-letter code, like GB.'
  if (trim(input.merchantTransactionId) && !/^[\w.\-]{8,255}$/.test(trim(input.merchantTransactionId)))
    return 'Merchant transaction ID must be 8 to 255 letters, digits, . _ or -'
  return null
}
