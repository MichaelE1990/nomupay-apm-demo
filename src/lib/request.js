// Builds request parameters for both the live preview (browser) and the real
// request (server), so what the page shows is exactly what gets sent. The
// required-field check runs in both places too.
import { CART_FIELDS, getBrand } from '@/lib/brands'

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
  /^(customer\.(givenName|surname|email|phone|mobile|merchantCustomerId|ip)|billing\.(street1|houseNumber1|city|postcode|state|country)|shipping\.(street1|city|postcode|state|country)|virtualAccount\.accountId|bankAccount\.(iban|holder|mandate\.id|mandate\.dateOfSignature)|customParameters\[(mandate_url|FPXBANK_NAME|commercial_transaction_type|flow_type)\]|descriptor|merchantInvoiceId)$/

const REQ_RANK = { M: 0, C: 1, O: 2 }

function brandsOf(codes) {
  return (codes || []).map(getBrand).filter(Boolean)
}

// One spec per field across the chosen brands: the strictest requirement wins.
// mode 'sync' adds the fields that make a payment synchronous (no redirect);
// any other mode leaves them out, because sending them removes the redirect.
export function fieldSpecs(brandCodes, mode) {
  const specs = new Map()
  for (const b of brandsOf(brandCodes)) {
    for (const field of b.fields) {
      if (field.sync && mode !== 'sync') continue
      const prev = specs.get(field.key)
      const usedBy = [...(prev?.usedBy || []), b.name]
      if (!prev || REQ_RANK[field.req] < REQ_RANK[prev.req]) {
        const options = field.key === 'billing.country' && prev?.options ? [...new Set([...prev.options, ...field.options])] : field.options
        specs.set(field.key, { ...field, options, usedBy })
      } else {
        if (field.key === 'billing.country') prev.options = [...new Set([...prev.options, ...field.options])]
        prev.usedBy = usedBy
      }
    }
  }
  return [...specs.values()].sort((a, z) => REQ_RANK[a.req] - REQ_RANK[z.req])
}

export function brandFieldKeys(brandCodes, mode) {
  return fieldSpecs(brandCodes, mode).map((s) => s.key)
}

// Cart sub-fields the chosen brands take, and whether any of them requires a cart
export function cartSpec(brandCodes) {
  const brands = brandsOf(brandCodes).filter((b) => b.cart)
  if (!brands.length) return null
  const fields = CART_FIELDS.filter((k) => brands.some((b) => b.cart.fields.includes(k)))
  const required = brands.filter((b) => b.cart.req === 'M').map((b) => b.name)
  return { fields, required }
}

// The cart is switched on for brands that require it, and off for brands that don't take one
export function withRequiredExtras(form) {
  const cart = cartSpec(form.brands)
  const on = cart ? (cart.required.length ? true : Boolean(form.extras?.cart)) : false
  return { ...form, extras: { ...form.extras, cart: on } }
}

// Fill a brand's sample values and defaults into empty fields
export function withBrandDefaults(form, codes) {
  const fields = { ...form.fields }
  for (const s of fieldSpecs(codes, form.mode)) {
    if (s.key === 'billing.country' && s.options?.length && !s.options.includes(fields[s.key])) fields[s.key] = s.options[0]
    else if (!String(fields[s.key] ?? '').trim() && s.sample) fields[s.key] = s.sample
  }
  return { ...form, brands: codes, fields }
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

const filled = (v) => String(v ?? '').trim() !== ''

/**
 * Mandatory and conditional fields still missing for the chosen brands.
 * @returns {string[]} parameter names, e.g. ['customer.email', 'cart.items[0].merchantItemId']
 */
export function missingFields(input) {
  const fields = input.fields || {}
  const missing = []
  const specs = fieldSpecs(input.brands, input.mode)
  for (const s of specs) {
    if (s.req === 'M' && !filled(fields[s.key])) missing.push(s.key)
    if (s.req === 'C' && s.when && fields[s.when.key] === s.when.equals && !filled(fields[s.key])) missing.push(s.key)
  }
  // Conditional groups are all-or-nothing (the SEPA mandate fields)
  const groups = {}
  for (const s of specs) if (s.group) (groups[s.group] = groups[s.group] || []).push(s.key)
  for (const keys of Object.values(groups)) {
    if (keys.some((k) => filled(fields[k]))) missing.push(...keys.filter((k) => !filled(fields[k])))
  }
  const cart = cartSpec(input.brands)
  if (cart?.required.length) {
    const items = (input.extras?.cart ? input.cart : null) || []
    if (!items.length) missing.push('cart.items')
    items.forEach((item, i) => {
      if (!filled(item.name)) missing.push(`cart.items[${i}].name`)
      if (!(Number(item.quantity) > 0)) missing.push(`cart.items[${i}].quantity`)
      if (!filled(item.price)) missing.push(`cart.items[${i}].price`)
      if (cart.fields.includes('merchantItemId') && !filled(item.merchantItemId)) missing.push(`cart.items[${i}].merchantItemId`)
    })
  }
  return missing
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
    ['paymentType', input.paymentType === 'PA' ? 'PA' : 'DB'],
  ]
  if (input.flow === 's2s' && brands[0]) params.push(['paymentBrand', brands[0]])
  if (env.testMode && usesWallet(brands)) params.push(['testMode', env.testMode])
  if (input.merchantTransactionId) params.push(['merchantTransactionId', input.merchantTransactionId])

  const allowed = new Set(brandFieldKeys(brands, input.mode))
  if (extras.customer) CUSTOMER_FIELDS.forEach((f) => allowed.add(f.key))
  for (const key of allowed) {
    const value = String(fields[key] ?? '').trim()
    if (value) params.push([key, value])
  }

  const cart = cartSpec(brands)
  if (cart && extras.cart) {
    ;(input.cart || []).forEach((item, i) => {
      if (!item.name) return
      const price = Number(item.price || 0)
      const quantity = String(item.quantity || 1)
      const values = {
        name: item.name,
        quantity,
        price: price.toFixed(2),
        totalAmount: (price * Number(quantity)).toFixed(2),
        currency: String(input.currency || ''),
        merchantItemId: String(item.merchantItemId || '').trim(),
      }
      for (const k of cart.fields) if (values[k]) params.push([`cart.items[${i}].${k}`, values[k]])
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
