// Server-only: gateway credentials and calls. Never import this from a client component.
import { getBrand } from '@/lib/brands'
import { classify } from '@/lib/codes'
import { FIELD_KEY_PATTERN, maskEntity, usesCard } from '@/lib/request'

const env = (k) => (process.env[k] || '').trim()

export const API_HOST = env('API_HOST') || 'eu-test.oppwa.com'
// API_BASE_URL only exists so the app can be pointed at a local mock gateway
export const API_BASE_URL = (env('API_BASE_URL') || `https://${API_HOST}`).replace(/\/+$/, '')
export const IS_TEST = /test/i.test(API_HOST)
export const TEST_MODE = process.env.TEST_MODE !== undefined ? env('TEST_MODE') : IS_TEST ? 'EXTERNAL' : ''

const ENTITIES = {
  wallet: { id: env('ENTITY_ID'), token: env('ACCESS_TOKEN') },
  card: { id: env('CARD_ENTITY_ID') || env('ENTITY_ID'), token: env('CARD_ACCESS_TOKEN') || env('ACCESS_TOKEN') },
}

export function entity(kind) {
  return ENTITIES[kind === 'card' ? 'card' : 'wallet']
}

export const CONFIGURED = Boolean(ENTITIES.wallet.id && ENTITIES.wallet.token)

export function publicConfig() {
  return {
    configured: CONFIGURED,
    environment: IS_TEST ? 'TEST' : 'LIVE',
    apiHost: API_HOST,
    testMode: TEST_MODE,
    entities: {
      wallet: maskEntity(ENTITIES.wallet.id),
      card: maskEntity(ENTITIES.card.id),
      cardDedicated: Boolean(env('CARD_ENTITY_ID')),
    },
  }
}

export function publicBase(request) {
  let fixed = env('PUBLIC_BASE_URL').replace(/\/+$/, '')
  if (fixed) return fixed
  let h = request.headers
  let proto = (h.get('x-forwarded-proto') || 'https').split(',')[0]
  let host = h.get('x-forwarded-host') || h.get('host')
  return `${proto}://${host}`
}

export async function gateway(method, path, params, kind) {
  let { token } = entity(kind)
  let query = new URLSearchParams(params).toString()
  let url = method === 'GET' ? `${API_BASE_URL}${path}?${query}` : `${API_BASE_URL}${path}`
  let response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? query : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(30000),
  })
  let text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text.slice(0, 2000) }
  }
  return { httpStatus: response.status, data, status: classify(data.result?.code) }
}

export function masked(params) {
  return params.map(([k, v]) => [k, k === 'entityId' ? maskEntity(v) : v])
}

/** Validate a payment input from the browser. Returns an error message or null. */
export function validateInput(input, { flow }) {
  let brands = Array.isArray(input.brands) ? input.brands : []
  if (!brands.length) return 'Choose at least one payment method.'
  if (brands.length > 25) return 'Too many payment methods.'
  for (let code of brands) if (!getBrand(code)) return `Unknown payment method ${code}.`
  if (flow === 's2s') {
    if (brands.length !== 1) return 'Server-to-server takes one payment method per payment.'
    if (usesCard(brands)) return 'Cards are only available through COPYandPAY in this demo.'
  }
  if (!/^\d{1,9}(\.\d{2})?$/.test(String(input.amount || ''))) return 'Amount must look like 10.00.'
  if (!/^[A-Z]{3}$/.test(String(input.currency || ''))) return 'Currency must be a 3-letter code.'
  if (input.merchantTransactionId && !/^[\w.\-]{1,255}$/.test(input.merchantTransactionId))
    return 'Merchant transaction ID can use letters, digits, . _ and -'
  let fields = input.fields && typeof input.fields === 'object' ? input.fields : {}
  for (let [k, v] of Object.entries(fields)) {
    if (!FIELD_KEY_PATTERN.test(k)) return `Field ${k} isn't allowed.`
    if (String(v ?? '').length > 255) return `${k} is too long.`
  }
  if (fields['billing.country'] && !/^[A-Z]{2}$/.test(fields['billing.country'])) return 'Billing country must be a 2-letter code.'
  let cart = Array.isArray(input.cart) ? input.cart : []
  if (cart.length > 20) return 'Up to 20 cart items.'
  for (let item of cart) {
    if (String(item.name || '').length > 255) return 'Cart item name is too long.'
    if (!/^\d{1,4}$/.test(String(item.quantity ?? '1'))) return 'Cart quantity must be a whole number.'
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(String(item.price ?? '0'))) return 'Cart price must look like 10.00.'
  }
  return null
}

export const notConfigured = () =>
  Response.json({ error: 'ENTITY_ID and ACCESS_TOKEN are not set on the server.' }, { status: 503 })
