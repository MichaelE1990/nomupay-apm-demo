// Payment brand catalogue.
//
// Which brands appear, and their countries and currencies, come from the
// production list merchants see: Help Centre "Ecommerce Payment Methods"
// (support.nomupay.com/hc/en-gb/articles/52156192050193).
// Field requirements per brand come from the Payment Knowledge Base,
// "NomuPay Wallets Brand details" > Fields mapping; formats and conditions from
// "NomuPay Wallets integration sheet" > Fields mapping (Request) and Custom
// Parameters; timeouts from "Brand details" > Brands Enabled in Test.
// The integration sheet's "Minimal Request" examples are not used.
//
// req: M = mandatory, C = conditional, O = optional. Mandatory fields are
// required in test too, so an integration is ready for production.

const FPX_BANKS = [
  'affin_bank', 'affin_bank_business', 'affin_max_business', 'agrobank', 'agrobank_business', 'alliance_bank', 'alliance_bank_business',
  'ambank', 'ambank_business', 'bank_islam', 'bank_islam_business', 'bank_muamalat', 'bank_muamalat_business', 'bank_of_china',
  'bank_rakyat', 'bank_rakyat_business', 'bank_simpanan_nasional', 'bnp_paribas_business', 'cimb_bank', 'cimb_bank_business',
  'citibank_business', 'deutsche_bank_business', 'hong_leong_bank', 'hong_leong_bank_business', 'hsbc_bank', 'hsbc_bank_business',
  'kuwait_finance_house', 'kuwait_finance_house_business', 'maybank', 'maybank_business', 'ocbc_bank', 'ocbc_bank_business', 'public_bank',
  'public_bank_business', 'public_bank_enterprise_business', 'rhb_bank', 'rhb_bank_business', 'standard_chartered_bank',
  'standard_chartered_bank_business', 'united_overseas_bank', 'united_overseas_bank_business', 'united_overseas_bank_regional_business',
]

// Shared definitions; a brand can override sample, hint or options per field
export const FIELD_DEFS = {
  descriptor: { label: 'Descriptor', sample: '', hint: 'Up to 25 characters, shown on the shopper’s statement.' },
  merchantInvoiceId: { label: 'Merchant invoice ID', sample: '', hint: '8 to 100 characters: letters, digits, _ and -' },
  'customer.email': { label: 'Email', sample: 'test.shopper@example.com', type: 'email' },
  'customer.givenName': { label: 'Given name', sample: 'Test' },
  'customer.surname': { label: 'Surname', sample: 'Shopper' },
  'customer.merchantCustomerId': { label: 'Merchant customer ID', sample: 'cust-001', hint: 'Your ID for the shopper, up to 50 characters.' },
  'customer.mobile': { label: 'Mobile', type: 'phone', sample: '', hint: 'International format, for example +34700000000.' },
  'customer.ip': { label: 'Shopper IP address', sample: '', hint: 'Mandatory when customParameters[flow_type] is deep_link.' },
  'billing.country': { label: 'Billing country', type: 'country' },
  'billing.street1': { label: 'Street', sample: '' },
  'billing.houseNumber1': { label: 'House number', sample: '' },
  'billing.postcode': { label: 'Postcode', sample: '' },
  'billing.city': { label: 'City', sample: '' },
  'bankAccount.iban': { label: 'IBAN', sample: 'DE23100000001234567890' },
  'bankAccount.holder': { label: 'Account holder', sample: 'Test Shopper' },
  'bankAccount.mandate.id': { label: 'Mandate ID', sample: '' },
  'bankAccount.mandate.dateOfSignature': { label: 'Mandate signature date', sample: '', hint: 'YYYY-MM-DD' },
  'customParameters[mandate_url]': { label: 'Mandate URL', sample: '' },
  'virtualAccount.accountId': {
    label: 'MB WAY phone',
    type: 'phone',
    format: 'hash',
    sample: '',
    hint: 'Sent as 351#912345678: the shopper’s MB WAY phone number.',
  },
  'customParameters[FPXBANK_NAME]': {
    label: 'FPX bank',
    type: 'select',
    options: FPX_BANKS,
    sample: 'cimb_bank',
    hint: 'Banks ending in _business are for B2B payments.',
  },
  'customParameters[commercial_transaction_type]': { label: 'Transaction type', type: 'select', options: ['b2c', 'b2b'], sample: '' },
  'customParameters[flow_type]': { label: 'Flow type', type: 'select', options: ['qr_link', 'mobile_redirect'], sample: '', hint: 'Defaults to qr_link.' },
}

// Cart item fields a brand can take: cart.items[n].<field>
export const CART_FIELDS = ['name', 'quantity', 'price', 'totalAmount', 'currency', 'merchantItemId']

const EU_SEPA = ['AD', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'MC', 'NL', 'NO', 'PL', 'PT', 'RO', 'SM', 'SK', 'SI', 'ES', 'SE', 'CH', 'VA']
const API = 'Ecommerce API'
const GW = 'Nomupay Gateway'
const CS = 'Cardstream Gateway'

const f = (key, req, extra = {}) => ({ key, req, ...extra })
const invoice = f('merchantInvoiceId', 'O')
const givenName = f('customer.givenName', 'O')
const email = f('customer.email', 'M')
const japanCart = { req: 'M', fields: CART_FIELDS }

export const WALLET_BRANDS = [
  {
    code: 'CLEARPAY', name: 'Afterpay (UK)', countries: ['GB'], currencies: ['GBP'], timeout: '4.5 hours', integration: [API, GW, CS],
    fields: [email, givenName, invoice], cart: { req: 'O', fields: ['name', 'quantity', 'price', 'currency'] },
  },
  {
    code: 'AFTERPAY_PACIFIC', name: 'Afterpay (US)', countries: ['US'], currencies: ['USD'], timeout: '4.5 hours', integration: [API, GW, CS],
    fields: [email, givenName, invoice], cart: { req: 'O', fields: ['name', 'quantity', 'price', 'currency'] },
  },
  {
    code: 'ALIPAY', name: 'Alipay', countries: ['CN'], currencies: ['CNY', 'AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'HKD', 'JPY', 'MYR', 'NZD', 'SGD', 'USD'],
    timeout: '12.5 hours', integration: [API, GW],
    fields: [f('descriptor', 'O'), invoice, givenName, f('customParameters[flow_type]', 'O')], cart: { req: 'O', fields: ['name', 'quantity'] },
  },
  {
    code: 'ALIPAY_HK', name: 'Alipay (HK)', countries: ['HK', 'CN'], currencies: ['HKD', 'CNY'], timeout: '15 minutes', integration: [API, GW],
    fields: [f('descriptor', 'O'), invoice, f('customParameters[flow_type]', 'O')],
  },
  { code: 'ALIPAY_PLUS', name: 'Alipay+', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW], fields: [invoice] },
  { code: 'ATOME', name: 'Atome', countries: ['MY'], currencies: ['MYR'], timeout: '15 hours', integration: [API], fields: [invoice] },
  { code: 'BCMC_VA', name: 'Bancontact', countries: ['BE'], currencies: ['EUR'], timeout: '1 hour', integration: [API], fields: [f('descriptor', 'O'), invoice] },
  {
    code: 'BIZUM', name: 'Bizum', countries: ['ES'], currencies: ['EUR'], timeout: '10 minutes', integration: [API, GW, CS],
    fields: [f('customer.mobile', 'C', { hint: 'Leave it empty for the redirect flow. Send it and there’s no redirect: the shopper approves in their app.' }), givenName, invoice],
  },
  {
    code: 'BLIK', name: 'Blik', countries: ['PL'], currencies: ['PLN'], timeout: '3 minutes', integration: [API, GW, CS], fields: [givenName, invoice],
    note: 'The shopper enters a 6-digit BLIK code on the redirect page and approves it in their banking app.',
  },
  { code: 'BOOST', name: 'Boost', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS], fields: [email, invoice] },
  { code: 'CEBUANA', name: 'Cebuana', countries: ['PH'], currencies: ['PHP'], timeout: '7 days', integration: [API, GW, CS], fields: [email, invoice] },
  { code: 'DRAGONPAY', name: 'DragonPay', countries: ['PH'], currencies: ['PHP'], timeout: '8 hours', integration: [API, GW], fields: [email, invoice] },
  { code: 'DUITNOW_QR', name: 'DuitNow QR', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS], fields: [invoice] },
  {
    code: 'ECPAY', name: 'ECPay', countries: ['PH'], currencies: ['PHP'], timeout: '7 days', integration: [API, GW, CS],
    fields: [f('descriptor', 'M', { sample: 'NomuPay APM Demo' }), email, f('customer.mobile', 'M', { sample: '+639171234567' }), givenName, invoice],
  },
  { code: 'EPS_VA', name: 'Eps', countries: ['AT'], currencies: ['EUR'], timeout: '1.5 hours', integration: [API, GW, CS], fields: [f('descriptor', 'O'), givenName, invoice] },
  {
    code: 'FPX', name: 'FPX', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS],
    fields: [f('customParameters[FPXBANK_NAME]', 'M'), f('customParameters[commercial_transaction_type]', 'O', { hint: 'Send b2b with a _business bank.' }), invoice],
  },
  { code: 'GCASH', name: 'GCash', countries: ['PH'], currencies: ['PHP'], timeout: '8 hours', integration: [API, GW, CS], fields: [invoice] },
  { code: 'GRABPAY', name: 'GrabPay', countries: ['MY', 'PH'], currencies: ['MYR', 'PHP'], timeout: '8 hours', integration: [API, GW, CS], fields: [invoice] },
  { code: 'IDEAL_VA', name: 'iDEAL', countries: ['NL'], currencies: ['EUR'], timeout: '30 minutes', integration: [API, GW, CS], fields: [givenName, invoice] },
  {
    code: 'KONBINI', name: 'Konbini', countries: ['JP'], currencies: ['JPY'], timeout: '59 days', integration: [API, GW],
    fields: [f('customer.merchantCustomerId', 'M'), f('customer.email', 'O'), givenName, f('customer.surname', 'O'), f('customer.mobile', 'O'), invoice],
    cart: japanCart,
    note: 'Voucher payment: the shopper pays at a convenience store, so the payment stays pending until paid or 59 days pass.',
  },
  { code: 'MAE', name: 'MAE by Maybank', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS], fields: [invoice] },
  { code: 'MAYA', name: 'Maya', countries: ['PH'], currencies: ['PHP'], timeout: '8 hours', integration: [API, GW, CS], fields: [invoice] },
  {
    code: 'MBWAY', name: 'MB WAY', countries: ['PT'], currencies: ['EUR'], timeout: '6 minutes', integration: [API, GW, CS],
    fields: [givenName, f('virtualAccount.accountId', 'O'), invoice],
    note: 'The shopper approves a push request in the MB WAY app, identified by their phone number.',
  },
  {
    code: 'MULTIBANCO_VA', name: 'Multibanco', countries: ['PT'], currencies: ['EUR'], timeout: '7 days', integration: [API, GW, CS], fields: [givenName, invoice],
    note: 'Voucher payment: the shopper gets an entity and reference to pay later, so the payment stays pending until paid or 7 days pass.',
  },
  {
    code: 'PAYPAY', name: 'PayPay', countries: ['JP'], currencies: ['JPY'], timeout: '30 minutes', integration: [API, GW],
    fields: [f('customer.merchantCustomerId', 'M'), invoice], cart: japanCart,
  },
  {
    code: 'PAYSAFECARD', name: 'Paysafecard',
    countries: ['AT', 'AU', 'BE', 'BG', 'CA', 'HR', 'CY', 'CZ', 'DK', 'FI', 'FR', 'HU', 'IE', 'IT', 'GE', 'DE', 'GI', 'GR', 'LI', 'LT', 'LU', 'MT', 'MX', 'NL', 'NZ', 'NO', 'PE', 'PL', 'PT', 'RO', 'SI', 'SK', 'ES', 'SE', 'CH', 'GB', 'UY'],
    currencies: ['EUR', 'AUD', 'CAD', 'CHF', 'GBP', 'NOK', 'PLN', 'RON', 'SEK', 'USD'], timeout: '2.5 hours', integration: [API, GW, CS],
    fields: [f('billing.country', 'M'), givenName, invoice],
  },
  {
    code: 'PAYU', name: 'PayU', countries: ['PL', 'CZ'], currencies: ['PLN', 'CZK'], timeout: '2 hours', integration: [API, GW, CS],
    fields: [f('billing.country', 'M'), givenName, invoice],
  },
  {
    code: 'PRZELEWY', name: 'Przelewy 24', countries: ['PL'], currencies: ['PLN', 'EUR'], timeout: '1.5 hours', integration: [API, GW, CS],
    fields: [email, f('descriptor', 'O'), givenName, invoice],
    note: 'P24 doesn’t accept sole traders: the merchant must be set up as a company.',
  },
  { code: 'SATISPAY', name: 'Satispay', countries: ['IT'], currencies: ['EUR'], timeout: '2.5 hours', integration: [API, GW, CS], fields: [givenName, invoice] },
  {
    code: 'DIRECTDEBIT_SEPA', name: 'SEPA Direct Debit', countries: EU_SEPA, currencies: ['EUR'], timeout: '1.5 hours', paymentMethod: 'DD', integration: [API, CS],
    fields: [
      email, f('bankAccount.iban', 'M'), f('bankAccount.holder', 'M'),
      f('bankAccount.mandate.id', 'C', { group: 'mandate' }), f('bankAccount.mandate.dateOfSignature', 'C', { group: 'mandate' }), f('customParameters[mandate_url]', 'C', { group: 'mandate' }),
      f('billing.street1', 'C'), f('billing.houseNumber1', 'C'), f('billing.postcode', 'C'), f('billing.city', 'C'),
      f('descriptor', 'O'), invoice,
    ],
    note: 'Send the three mandate fields together for the sync flow, or leave all three empty for the async flow. The billing address is needed for some bank accounts outside the EU.',
  },
  { code: 'SHOPEEPAY', name: 'ShopeePay', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS], fields: [givenName, invoice] },
  {
    code: 'SWISH', name: 'Swish', countries: ['SE'], currencies: ['SEK'], timeout: '30 minutes', integration: [API, GW, CS],
    fields: [givenName, f('customer.mobile', 'O', { hint: 'Leave it empty for the redirect flow (QR or app switch). Send it and there’s no redirect: the shopper approves in the Swish app.' }), invoice],
  },
  { code: 'TOUCH_N_GO', name: 'Touch’n Go', countries: ['MY'], currencies: ['MYR'], timeout: '8 hours', integration: [API, GW, CS], fields: [email, invoice] },
  {
    code: 'TRUSTLY', name: 'Trustly', countries: ['AT', 'DK', 'EE', 'FI', 'DE', 'LV', 'LT', 'NL', 'NO', 'SE', 'GB'], currencies: ['EUR', 'DKK', 'GBP', 'NOK', 'SEK'],
    timeout: '7 days', integration: [API, GW, CS],
    fields: [f('billing.country', 'M'), email, f('customer.givenName', 'M'), f('customer.merchantCustomerId', 'M'), invoice],
  },
  { code: 'TWINT', name: 'Twint', countries: ['CH'], currencies: ['CHF'], timeout: '30 minutes', integration: [API, GW, CS], fields: [givenName, invoice] },
  {
    code: 'UPI', name: 'UPI', countries: ['IN'], currencies: ['USD', 'GBP'], timeout: '1 hour', integration: [API, GW, CS],
    fields: [f('billing.country', 'M'), f('descriptor', 'M', { sample: 'NomuPay APM Demo' }), givenName, invoice],
  },
  {
    code: 'WECHAT_PAY', name: 'WeChat Pay', countries: ['CN', 'HK'], currencies: ['CNY', 'CHF', 'EUR', 'GBP', 'HKD', 'MYR', 'USD'], timeout: '2.5 hours', integration: [API, GW],
    fields: [
      f('descriptor', 'M', { sample: 'NomuPay APM Demo' }),
      f('customParameters[flow_type]', 'O', { options: ['qr_link', 'deep_link'] }),
      f('customer.ip', 'C', { when: { key: 'customParameters[flow_type]', equals: 'deep_link' } }),
      givenName, invoice,
    ],
  },
  {
    code: 'WERO', name: 'Wero', countries: ['DE', 'BE', 'FR'], currencies: ['EUR'], timeout: '1 hour', integration: [API, GW, CS],
    fields: [f('billing.country', 'M'), givenName, invoice],
  },
]

// Cards run through the COPYandPAY widget only, on the card entity
export const CARD_BRANDS = [
  { code: 'VISA', name: 'Visa', countries: [], currencies: ['EUR', 'GBP', 'USD', 'SEK', 'DKK', 'NOK', 'PLN', 'CHF', 'CZK'], timeout: '', fields: [] },
  { code: 'MASTER', name: 'Mastercard', countries: [], currencies: ['EUR', 'GBP', 'USD', 'SEK', 'DKK', 'NOK', 'PLN', 'CHF', 'CZK'], timeout: '', fields: [] },
  { code: 'MAESTRO', name: 'Maestro', countries: [], currencies: ['EUR', 'GBP', 'USD'], timeout: '', fields: [] },
]

const REQ_ORDER = { M: 0, C: 1, O: 2 }

function finalise(b, type) {
  return {
    ...b,
    type,
    paymentMethod: b.paymentMethod || (type === 'card' ? 'CC' : 'VA'),
    cart: b.cart || null,
    fields: b.fields
      .map((field, i) => {
        const def = FIELD_DEFS[field.key] || { label: field.key }
        const merged = { type: 'text', sample: '', hint: '', ...def, ...field, i }
        if (field.key === 'billing.country') merged.options = b.countries
        return merged
      })
      .sort((a, z) => REQ_ORDER[a.req] - REQ_ORDER[z.req] || a.i - z.i)
      .map(({ i, ...rest }) => rest),
  }
}

export const BRANDS = [...WALLET_BRANDS.map((b) => finalise(b, 'wallet')), ...CARD_BRANDS.map((b) => finalise(b, 'card'))]
const BRAND_MAP = Object.fromEntries(BRANDS.map((b) => [b.code, b]))
export const getBrand = (code) => BRAND_MAP[String(code || '').toUpperCase()] || null
export const isCard = (code) => getBrand(code)?.type === 'card'
