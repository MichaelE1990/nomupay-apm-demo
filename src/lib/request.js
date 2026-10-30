// Builds request parameters for both the live preview (browser) and the real
// request (server), so what the page shows is exactly what gets sent.
import { getBrand } from '@/lib/brands'

export const CUSTOMER_FIELDS = [
  { key: 'customer.givenName', label: 'Given name', sample: 'Test' },
  { key: 'customer.surname', label: 'Surname', sample: 'Shopper' },
  { key: 'customer.email', label: 'Email', sample: 'test.shopper@example.com' },
  { key: 'customer.phone', label: 'Phone', sample: '' },
  { key: 'billing.street1', label: 'Billing street', sample: '10 Ancoats Street' },
  { key: 'billing.city', label: 'Billing city', sample: 'Manchester' },
  { key: 'billing.postcode', label: 'Billing postcode', sample: 'M4 6AA' },
  { key: 'billing.country', label: 'Billing country', sample: 'GB' },
  { key: 'shipping.street1', label: 'Shipping street', sample: '' },
  { key: 'shipping.city', label: 'Shipping city', sample: '' },
  { key: 'shipping.postcode', label: 'Shipping postcode', sample: '' },
  { key: 'shipping.country', label: 'Shipping country', sample: '' },
]

// Every field a request may carry, checked again on the server
export const FIELD_KEY_PATTERN =
  /^(customer\.(givenName|surname|email|phone|mobile|merchantCustomerId)|billing\.(street1|houseNumber1|city|postcode|state|country)|shipping\.(street1|city|postcode|state|country)|virtualAccount\.accountId|bankAccount\.(iban|holder|mandate\.id|mandate\.dateOfSignature)|customParameters\[mandate_url\]|descriptor|merchantInvoiceId)$/

export function brandFieldKeys(brandCodes) {
  const keys = []
  for (const code of brandCodes) {
    const b = getBrand(code)
    if (!b) continue
    if (b.type === 'wallet' && b.countryRequirement === 'M' && !keys.includes('billing.country')) keys.push('billing.country')
    for (const f of b.fields) if (!keys.includes(f.key)) keys.push(f.key)
  }
  return keys
}

export function cartTotal(cart) {
  const total = (cart || []).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0)
  return total.toFixed(2)
}

export function usesWallet(brandCodes) {
  return brandCodes.some((c) => getBrand(c)?.type === 'wallet')
}

export function usesCard(brandCodes) {
  return brandCodes.some((c) => getBrand(c)?.type === 'card')
}

/**
 * @param {object} input  { flow, brands[], amount, currency, merchantTransactionId, fields{}, extras{customer,cart}, cart[] }
 * @param {object} env    { entityId, testMode, shopperResultUrl }
 * @returns {Array<[string,string]>} ordered parameters
 */
export function buildPaymentParams(input, env) {
  const brands = input.brands || []
  const extras = input.extras || {}
  const fields = input.fields || {}
  const params = [
    ['entityId', env.entityId],
    ['amount', String(input.amount || '')],
    ['currency', String(input.currency || '')],
    ['paymentType', 'DB'],
  ]
  if (input.flow === 's2s' && brands[0]) params.push(['paymentBrand', brands[0]])
  if (env.testMode && usesWallet(brands)) params.push(['testMode', env.testMode])
  if (input.merchantTransactionId) params.push(['merchantTransactionId', input.merchantTransactionId])

  const allowed = new Set(brandFieldKeys(brands))
  if (extras.customer) CUSTOMER_FIELDS.forEach((f) => allowed.add(f.key))
  for (const key of allowed) {
    const value = String(fields[key] ?? '').trim()
    if (value) params.push([key, value])
  }

  if (extras.cart) {
    ;(input.cart || []).forEach((item, i) => {
      if (!item.name) return
      params.push([`cart.items[${i}].name`, item.name])
      params.push([`cart.items[${i}].quantity`, String(item.quantity || 1)])
      params.push([`cart.items[${i}].price`, Number(item.price || 0).toFixed(2)])
      params.push([`cart.items[${i}].currency`, String(input.currency || '')])
    })
  }

  if (input.flow === 'copyandpay' && extras.integrity !== false) params.push(['integrity', 'true'])
  if (input.flow === 's2s' && env.shopperResultUrl) params.push(['shopperResultUrl', env.shopperResultUrl])
  return params
}

export function maskEntity(id) {
  if (!id) return ''
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : '••••'
}
