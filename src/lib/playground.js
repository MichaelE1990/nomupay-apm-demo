// Checkout playground: the shop, the shopper's market, and how the settings
// turn into a POST /v1/checkouts input (the same input /api/checkouts takes).
import { BRANDS, getBrand } from '@/lib/brands'
import { cartTotal } from '@/lib/request'

export const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', person: ['Test', 'Shopper'], street: '10 Ancoats Street', city: 'Manchester', postcode: 'M4 6AA' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR', person: ['Sanne', 'de Vries'], street: 'Prinsengracht 263', city: 'Amsterdam', postcode: '1016 GV' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR', person: ['Lucas', 'Peeters'], street: 'Meir 50', city: 'Antwerpen', postcode: '2000' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', person: ['Lena', 'Schmidt'], street: 'Torstraße 1', city: 'Berlin', postcode: '10119' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR', person: ['Anna', 'Gruber'], street: 'Mariahilfer Straße 10', city: 'Wien', postcode: '1070' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', person: ['Camille', 'Martin'], street: '12 Rue de Rivoli', city: 'Paris', postcode: '75004' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', person: ['Lucía', 'García'], street: 'Calle de Alcalá 20', city: 'Madrid', postcode: '28014' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', person: ['João', 'Silva'], street: 'Rua Augusta 100', city: 'Lisboa', postcode: '1100-053' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', person: ['Giulia', 'Rossi'], street: 'Via del Corso 15', city: 'Roma', postcode: '00186' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN', person: ['Anna', 'Nowak'], street: 'ul. Marszałkowska 10', city: 'Warszawa', postcode: '00-590' },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿', currency: 'CZK', person: ['Jan', 'Novák'], street: 'Václavské náměstí 1', city: 'Praha', postcode: '110 00' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK', person: ['Elsa', 'Andersson'], street: 'Drottninggatan 5', city: 'Stockholm', postcode: '111 51' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF', person: ['Noah', 'Müller'], street: 'Bahnhofstrasse 10', city: 'Zürich', postcode: '8001' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', person: ['Sam', 'Taylor'], street: '350 Fifth Avenue', city: 'New York', postcode: '10118' },
]
export const getCountry = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0]

// A made-up shop, priced in EUR and converted to round numbers per currency
const RATES = { EUR: 1, GBP: 0.86, PLN: 4.3, CZK: 25, SEK: 11.5, CHF: 0.95, USD: 1.1 }
export const PRODUCTS = [
  { id: 'blend', name: 'House blend, whole bean', detail: '1 kg bag', eur: 24, tone: 'from-amber-700 to-amber-900' },
  { id: 'dripper', name: 'Ceramic pour-over dripper', detail: 'Size 02, white', eur: 18.5, tone: 'from-zinc-200 to-zinc-400' },
  { id: 'filters', name: 'Paper filters', detail: 'Pack of 100', eur: 4.5, tone: 'from-orange-100 to-orange-300' },
]
export function price(product, currency) {
  let value = product.eur * (RATES[currency] || 1)
  let step = value >= 100 ? 1 : 0.5
  return (Math.round(value / step) * step).toFixed(2)
}

export function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(amount))
  } catch {
    return `${amount} ${currency}`
  }
}

const CARD_CODES = ['VISA', 'MASTER', 'AMEX']

// Payment methods a shopper in this country can use in its currency
export function methodsFor(countryCode) {
  let country = getCountry(countryCode)
  let wallets = BRANDS.filter((b) => b.type === 'wallet' && b.countries.includes(country.code) && b.currencies.includes(country.currency))
  let local = wallets.filter((b) => b.countries.length <= 3)
  let other = wallets.filter((b) => b.countries.length > 3)
  return { local, other, cards: CARD_CODES.map(getBrand).filter((b) => b.currencies.includes(country.currency)) }
}

export function defaultMethods(countryCode) {
  let { local, cards } = methodsFor(countryCode)
  return [...cards.map((b) => b.code), ...local.map((b) => b.code)]
}

export function customerFor(countryCode) {
  let c = getCountry(countryCode)
  return { name: c.person.join(' '), email: 'test.shopper@example.com', street: c.street, city: c.city, postcode: c.postcode }
}

export function initialConfig(countryCode = 'NL') {
  return {
    country: countryCode,
    methods: defaultMethods(countryCode),
    quantities: { blend: 1, dripper: 1, filters: 2 },
    contact: true,
    billing: false,
    shipping: false,
    lineItems: true,
    save: false,
    integrity: true,
    customer: customerFor(countryCode),
  }
}

// Fields a selected method insists on (only those the merchant's page collects; the widget asks for the rest)
const MERCHANT_KEYS = /^(customer\.|billing\.country$)/
export function requiredFields(methods) {
  let out = {}
  for (let code of methods) {
    let b = getBrand(code)
    if (!b) continue
    if (b.type === 'wallet' && b.countryRequirement === 'M') (out['billing.country'] ||= []).push(b.name)
    for (let f of b.fields) if (f.req === 'M' && MERCHANT_KEYS.test(f.key)) (out[f.key] ||= []).push(b.name)
  }
  return out
}

export function cartFor(config) {
  let country = getCountry(config.country)
  return PRODUCTS.map((p) => ({ ...p, quantity: config.quantities[p.id] ?? 0, price: price(p, country.currency) })).filter((p) => p.quantity > 0)
}

// Ordered so the widget lists cards first, then local methods, then the rest
export function orderedMethods(config) {
  let { local, other, cards } = methodsFor(config.country)
  let order = [...cards, ...local, ...other].map((b) => b.code)
  return order.filter((code) => config.methods.includes(code))
}

/** Settings → the JSON body /api/checkouts expects */
export function checkoutInput(config, merchantTransactionId) {
  let country = getCountry(config.country)
  let methods = orderedMethods(config)
  let cart = cartFor(config)
  let need = requiredFields(methods)
  let c = config.customer
  let [givenName, ...rest] = String(c.name || '').trim().split(/\s+/)
  let fields = {}
  let wantCustomer = config.contact
  if (wantCustomer || need['customer.givenName']) fields['customer.givenName'] = givenName || ''
  if (wantCustomer) fields['customer.surname'] = rest.join(' ')
  if (wantCustomer || need['customer.email']) fields['customer.email'] = c.email
  if (need['customer.merchantCustomerId']) fields['customer.merchantCustomerId'] = 'cust-001'
  if (config.billing) {
    fields['billing.street1'] = c.street
    fields['billing.city'] = c.city
    fields['billing.postcode'] = c.postcode
  }
  if (config.billing || need['billing.country']) fields['billing.country'] = country.code
  if (config.shipping) {
    fields['shipping.street1'] = c.street
    fields['shipping.city'] = c.city
    fields['shipping.postcode'] = c.postcode
    fields['shipping.country'] = country.code
  }
  return {
    brands: methods,
    amount: cartTotal(cart),
    currency: country.currency,
    merchantTransactionId,
    fields,
    extras: { customer: true, cart: config.lineItems, saveDetails: config.save, integrity: config.integrity },
    cart: cart.map((p) => ({ name: p.name, quantity: String(p.quantity), price: p.price })),
  }
}

// Splits checkout parameters into the groups the settings switch on, so the
// API panel can show what each setting adds to the request.
export const GROUPS = [
  { id: 'base', title: 'Every checkout', note: 'Which entity is charging, how much, and your order reference.' },
  { id: 'methods', title: 'NomuPay Wallets methods', note: 'On the test system, testMode=EXTERNAL sends APMs to the PPRO simulator. Leave it out in production.' },
  { id: 'contact', title: 'Name and email', note: 'Collected on your page before the checkout is created.' },
  { id: 'billing', title: 'Billing address', note: 'Sent with the checkout; the widget doesn’t ask for it.' },
  { id: 'shipping', title: 'Shipping address', note: 'Where the order goes. Some APMs and risk checks use it.' },
  { id: 'lineItems', title: 'Line items', note: 'One set of cart.items[n] fields per product. The amount must equal their total.' },
  { id: 'save', title: 'Save payment details', note: 'Stores the details and returns a registrationId with the result. The standing instruction marks this first payment as customer-initiated.' },
  { id: 'integrity', title: 'Integrity check', note: 'The response then includes an integrity hash for the script tag (see step 2).' },
]

export function groupOf(key) {
  if (key === 'testMode') return 'methods'
  if (key.startsWith('customer.')) return 'contact'
  if (key.startsWith('billing.')) return 'billing'
  if (key.startsWith('shipping.')) return 'shipping'
  if (key.startsWith('cart.')) return 'lineItems'
  if (key === 'createRegistration' || key.startsWith('standingInstruction.')) return 'save'
  if (key === 'integrity') return 'integrity'
  return 'base'
}

export function groupParams(params) {
  let byId = Object.fromEntries(GROUPS.map((g) => [g.id, []]))
  for (let p of params) byId[groupOf(p[0])].push(p)
  return GROUPS.map((g) => ({ ...g, params: byId[g.id] })).filter((g) => g.params.length)
}

// Which settings were switched on or off between two configs
export function configChange(before, after) {
  for (let id of ['contact', 'billing', 'shipping', 'lineItems', 'save', 'integrity']) {
    if (before[id] !== after[id]) return { id, kind: after[id] ? 'added' : 'removed' }
  }
  if (before.country !== after.country) return { id: 'base', kind: 'changed' }
  if (before.methods.join() !== after.methods.join()) return { id: 'brands', kind: 'changed' }
  if (JSON.stringify(before.quantities) !== JSON.stringify(after.quantities)) return { id: after.lineItems ? 'lineItems' : 'base', kind: 'changed' }
  // Typing in the shop's form updates values without jumping the panel around
  return null
}
