// Parameter formats, patterns and descriptions as in the OPPWA parameters reference
// (nomupay.docs.oppwa.com/reference/parameters). Two of the reference's patterns are
// malformed there ({19|20)…} and {4,128}); the evident pattern is used instead.
// resultDetails names come from the Payment Knowledge Base, "NomuPay Wallets
// integration sheet" > Response field mapping.
//
// format: the reference's Format column (AN32, N10.N2…); pattern: its regex;
// text: its description; example: shown when the request or response has no value

const ANY = (min, max) => `[\\s\\S]{${min},${max}}`
const DATE = '(19|20)([0-9]{2})-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])'

export const REQUEST_DOCS = {
  amount: {
    format: 'N10.N2',
    pattern: '[0-9]{1,10}(\\.[0-9]{2})?',
    text: 'Indicates the amount of the payment request. The dot is used as decimal separator.',
    example: '92.00',
  },
  currency: { format: 'A3', pattern: '[A-Z]{3}', text: 'The currency code of the payment request’s amount (ISO 4217).', example: 'EUR' },
  paymentBrand: { format: 'AN32', pattern: '[a-zA-Z0-9_]{1,32}', text: 'The brand specifies the method of payment for the request.', example: 'IDEAL_VA' },
  paymentType: { format: 'A2', text: 'The payment type for the request.', example: 'DB' },
  merchantTransactionId: {
    format: 'AN255',
    pattern: ANY(8, 255),
    text: 'Merchant-provided reference number, should be unique for your transactions. Some receivers require this ID. This identifier is often used for reconciliation.',
    example: 'order-12345678',
  },
  shopperResultUrl: {
    format: 'AN2048',
    pattern: ANY(6, 2048),
    text: 'This URL will receive the result of an asynchronous payment. It is used to redirect the shopper to the merchant’s website or application. Must be sent URL encoded and only absolute URLs are supported.',
    example: 'https://demo/paymentresult',
  },
  descriptor: {
    format: 'AN127',
    pattern: ANY(1, 127),
    text: 'Can be used to populate all or part of the Merchant Name descriptor, which often appears on the first line of the shopper’s statement. The full use of this field depends on the Merchant Account configuration.',
    example: 'Nomupay Demo',
  },
  merchantInvoiceId: {
    format: 'AN255',
    pattern: ANY(8, 255),
    text: 'Merchant-provided invoice number, should be unique for your transactions. This identifier is not sent onwards.',
    example: 'invoice-0001',
  },
  'customer.givenName': {
    format: 'AN50',
    pattern: '[\\s\\S]',
    text: 'The first name or given name of the customer. Required if you send in any other customer parameters, also required for some risk checks and payment providers. Max 50 characters.',
    example: 'Test',
  },
  'customer.surname': {
    format: 'AN50',
    pattern: '[\\s\\S]',
    text: 'The last name or surname of the customer. Required if you send in any other customer parameters, also required for some risk checks and payment providers. Max 50 characters.',
    example: 'Shopper',
  },
  'customer.email': {
    format: 'AN128',
    pattern: ANY(6, 128),
    text: 'The customer’s email address. Required for some risk checks and transmission of direct debit mandates.',
    example: 'test.shopper@example.com',
  },
  'customer.phone': { format: 'AN25', pattern: '[+0-9][0-9 \\.()/-]{0,25}', text: 'The customer’s phone number. Required for some risk checks.', example: '+441611234567' },
  'customer.mobile': { format: 'AN25', pattern: '[+0-9][0-9 \\.()/-]{0,25}', text: 'The customer’s mobile number. Required for some risk checks.', example: '+34700000000' },
  'customer.merchantCustomerId': {
    format: 'AN255',
    pattern: ANY(1, 255),
    text: 'An identifier for this customer. Typically this is the ID that identifies the shopper in the shop’s system.',
    example: 'cust-001',
  },
  'customer.ip': { format: 'AN255', pattern: ANY(1, 255), text: 'The customer’s IP address.', example: '192.0.2.10' },
  'billing.street1': {
    format: 'AN100',
    pattern: ANY(1, 100),
    text: 'The door number, floor, building number, building name, and/or street name of the billing address.',
    example: '10 Ancoats Street',
  },
  'billing.houseNumber1': {
    format: 'AN100',
    pattern: ANY(1, 100),
    text: 'Primary house number (door number or building number) of the billing address. If present, then billing.street1 is assumed to contain only the name of the street.',
    example: '10',
  },
  'billing.city': { format: 'AN80', pattern: ANY(1, 80), text: 'The town, district or city of the billing address.', example: 'Manchester' },
  'billing.state': { format: 'AN50', pattern: '[a-zA-Z0-9\\.]{1,50}', text: 'The county, state or region of the billing address.', example: 'Lancashire' },
  'billing.postcode': { format: 'AN16', pattern: '[A-Za-z0-9]{1,16}', text: 'The postal code or zip code of the billing address.', example: 'M46AA' },
  'billing.country': { format: 'A2', pattern: '[A-Z]{2}', text: 'The country of the billing address (ISO 3166-1).', example: 'GB' },
  'shipping.street1': {
    format: 'AN100',
    pattern: ANY(1, 100),
    text: 'The door number, floor, building number, building name, and/or street name of the shipping address.',
    example: '10 Ancoats Street',
  },
  'shipping.city': { format: 'AN80', pattern: ANY(1, 80), text: 'The town, district or city of the shipping address.', example: 'Manchester' },
  'shipping.postcode': { format: 'AN16', pattern: '[A-Za-z0-9]{1,16}', text: 'The postal code or zip code of the shipping address.', example: 'M46AA' },
  'shipping.country': { format: 'A2', pattern: '[A-Z]{2}', text: 'The country of the shipping address (ISO 3166-1).', example: 'GB' },
  'bankAccount.holder': { format: 'AN128', pattern: ANY(4, 128), text: 'Holder of the bank account.', example: 'Test Shopper' },
  'bankAccount.iban': {
    format: 'AN31',
    pattern: '[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{11,27}',
    text: 'The IBAN (International Bank Account Number) associated with the bank account.',
    example: 'DE23100000001234567890',
  },
  'bankAccount.mandate.id': { format: 'AN256', pattern: '[a-zA-Z\\-]{0,256}', text: 'The id of the mandate for direct debit.', example: 'mandate-abc' },
  'bankAccount.mandate.dateOfSignature': { format: 'AN10', pattern: DATE, text: 'The date the direct debit mandate was signed.', example: '2026-11-01' },
  'virtualAccount.accountId': { format: 'AN100', pattern: ANY(1, 100), text: 'The identifier of the shopper’s virtual account.', example: '351#912345678' },
  // customParameters[name]: the name is AN64 [a-zA-Z0-9\._]{3,64}; these are the value's format
  customParameters: { format: 'AN2048', pattern: ANY(0, 2048), text: 'A name value pair used for sending custom information.' },
  'cart.items[n].name': { format: 'AN255', pattern: ANY(1, 255), text: 'The name of the item in the shopping cart.', example: 'Gift card' },
  'cart.items[n].merchantItemId': { format: 'AN255', pattern: ANY(1, 255), text: 'The unique identifier of the item in the shopping cart.', example: 'item-001' },
  'cart.items[n].quantity': { format: 'N5', pattern: '[0-9]{1,12}(\\.[0-9]{0,3})', text: 'The number of items in the shopping cart.', example: '1' },
  'cart.items[n].price': {
    format: 'N13',
    pattern: '[0-9]{1,10}\\.[0-9]{2}',
    text: 'The price of the item in the shopping cart (including tax and discount). The item’s price is independent of the quantity.',
    example: '10.00',
  },
  'cart.items[n].totalAmount': { format: 'N13', pattern: '[0-9]{1,10}\\.[0-9]{2}', text: 'The total amount of the cart item including quantity.', example: '10.00' },
  'cart.items[n].currency': { format: 'A3', pattern: 'ISO 4217 currency code', text: 'The currency of the price of the shopping cart.', example: 'JPY' },
  testMode: {
    pattern: 'EXTERNAL|INTERNAL',
    text: 'Test system only. EXTERNAL forwards test transactions to the processor’s test system for end-to-end testing; INTERNAL sends them to the simulators, and is the default if no testMode is sent. A production request with testMode is declined with 600.200.701.',
    example: 'EXTERNAL',
  },
  id: {
    format: 'AN32',
    pattern: '[a-zA-Z0-9]{32}',
    text: 'The identifier of the payment request that can be used to reference the payment later. You get this as the field id of a payment’s response.',
    example: '8ac7a4a1a1a0e53501a1a12ca8c62c86',
  },
}

// Cards, card-on-file and 3D Secure (server-to-server cards). standingInstruction
// values and conditions from the KB, Credential on File (COF) integration sheet;
// the identifiers' mapping from the KB, NomuPay Integration Sheet
export const CARD_REQUEST_DOCS = {
  'card.number': { format: 'N19', pattern: '[0-9]{12,19}', text: 'The PAN or account number of the card.', example: '5555555555554444' },
  'card.holder': { format: 'AN128', pattern: ANY(3, 128), text: 'Holder of the credit card account.', example: 'Test Shopper' },
  'card.expiryMonth': { format: 'N2', pattern: '(0[1-9]|1[0-2])', text: 'The expiry month of the card.', example: '01' },
  'card.expiryYear': { format: 'N4', pattern: '(19|20)([0-9]{2})', text: 'The expiry year of the card.', example: '2030' },
  'card.cvv': { format: 'N4', pattern: '[0-9]{3,4}', text: 'The card security code or CVV. Sent on the initial payment only, never on a repeated MIT.', example: '333' },
  createRegistration: {
    format: 'A5',
    pattern: 'true|false',
    text: 'Stores the card with the payment. A successful payment returns a registrationId for later payments.',
    example: 'true',
  },
  'standingInstruction.type': {
    pattern: 'UNSCHEDULED|INSTALLMENT|RECURRING',
    text: 'The type of card-on-file agreement.',
    example: 'RECURRING',
  },
  'standingInstruction.mode': {
    pattern: 'INITIAL|REPEATED',
    text: 'INITIAL: the first payment of the series, with the CVV and 3D Secure. REPEATED: a subsequent payment, without shopper authentication data on an MIT.',
    example: 'INITIAL',
  },
  'standingInstruction.source': { pattern: 'CIT|MIT', text: 'Who triggers the payment: the cardholder (CIT) or the merchant (MIT).', example: 'CIT' },
  'standingInstruction.recurringType': {
    pattern: 'STANDING_ORDER|SUBSCRIPTION',
    text: 'Required for all Mastercard CIT and MIT recurring payments. SUBSCRIPTION: fixed amount and frequency. STANDING_ORDER: variable amount, fixed frequency.',
    example: 'SUBSCRIPTION',
  },
  'standingInstruction.frequency': {
    format: 'N4',
    pattern: '[0-9]{4}',
    text: 'The minimum number of days between payments. Mandatory when 3D Secure runs on a recurring payment; used in the 3D Secure request, not sent to NomuPay.',
    example: '0030',
  },
  'standingInstruction.expiry': {
    format: 'date',
    pattern: 'yyyy-mm-dd',
    text: 'Date after which no further payments are made. Mandatory when 3D Secure runs on a recurring payment; used in the 3D Secure request, not sent to NomuPay.',
    example: '2035-12-31',
  },
  'standingInstruction.initialTransactionId': {
    pattern: ANY(1, 64),
    text: 'The scheme transaction ID from the initial CIT, returned in resultDetails.CardholderInitiatedTransactionID. Optional over a registration: the gateway adds it.',
    example: '486292702388291',
  },
  'standingInstruction.agreementId': {
    format: 'AN35',
    pattern: ANY(1, 35),
    text: 'Mastercard economically related TLID, returned in resultDetails.LifecycleId. With a registration, NomuPay fills it in automatically.',
    example: 'f7t-wTAZTYSh0YaThWaxzw',
  },
  'customParameters[authorization_type]': {
    pattern: 'FINAL_AUTHORIZATION|PRE_AUTHORIZATION',
    text: 'PA only. On NomuPay a PA is a pre-authorisation by default; FINAL_AUTHORIZATION marks it as final, as card schemes expect for recurring payments.',
    example: 'FINAL_AUTHORIZATION',
  },
  'threeDSecure.eci': { format: 'N2', pattern: '[0-9]{2}', text: 'The Electronic Commerce Indicator from the 3D Secure authentication.', example: '05' },
  'threeDSecure.authenticationStatus': { pattern: 'Y|A|N|U|R', text: 'The 3D Secure transaction status. Y: authenticated.', example: 'Y' },
  'threeDSecure.version': { pattern: '2.1.0|2.2.0', text: 'The 3D Secure protocol version.', example: '2.2.0' },
  'threeDSecure.dsTransactionId': { format: 'AN36', text: 'The Directory Server transaction ID from the authentication.', example: 'c75f23af-9454-43f6-ba17-130ed529507e' },
  'threeDSecure.acsTransactionId': { format: 'AN36', text: 'The ACS transaction ID from the authentication.', example: '2c42c553-176f-4f08-af6c-f9364ecbd0e8' },
  'threeDSecure.verificationId': { format: 'AN128', text: 'The authentication value (CAVV or AAV) from the authentication.', example: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=' },
  'threeDSecure.amount': { format: 'N10.N2', pattern: '[0-9]{1,10}(\\.[0-9]{2})?', text: 'The amount the shopper authenticated.', example: '10.00' },
  'threeDSecure.currency': { format: 'A3', pattern: '[A-Z]{3}', text: 'The currency of the authenticated amount.', example: 'EUR' },
  'threeDSecure.flow': { pattern: 'challenge|frictionless', text: 'How the authentication ran.', example: 'challenge' },
  'customer.browser': {
    text: 'Browser data for 3D Secure 2 when the gateway authenticates the shopper on a server-to-server request: read from the shopper’s browser.',
  },
}

// Format of any name not listed (custom parameters share one format)
export function requestDoc(key) {
  if (REQUEST_DOCS[key]) return REQUEST_DOCS[key]
  if (CARD_REQUEST_DOCS[key]) return CARD_REQUEST_DOCS[key]
  if (key.startsWith('customer.browser.')) return CARD_REQUEST_DOCS['customer.browser']
  if (key.startsWith('customParameters[')) return REQUEST_DOCS.customParameters
  let cart = key.match(/^cart\.items\[\d+\]\.(\w+)$/)
  if (cart) return REQUEST_DOCS[`cart.items[n].${cart[1]}`] || {}
  return {}
}

// Response parameters. children: shown with "Show child parameters"
const DETAIL = { format: 'AN2048', pattern: ANY(0, 2048) }

export const RESULT_DETAILS = [
  { name: 'ExtendedDescription', ...DETAIL, req: 'C', text: 'The payment brand’s status, or the reason it gave.', example: 'An additional step is needed to complete the payment.' },
  { name: 'ConnectorTxID1', ...DETAIL, req: 'C', text: 'The gateway’s ID for the transaction (the same as id).', example: '8ac7a4a1a1a0e53501a1a1308cfc3851' },
  { name: 'ConnectorTxID2', ...DETAIL, req: 'C', text: 'The payment brand’s ID for this transaction. A refund gets a new one.', example: '3LawqTvgkRYEx2WX7aORHi2sSAw' },
  {
    name: 'ConnectorTxID3',
    ...DETAIL,
    req: 'C',
    text: 'The payment brand’s ID for the payment. It stays the same for every transaction on the payment, so it links a refund to its payment.',
    example: '3LawqTvgkRYEx2WX7aORHi2sSAw',
  },
  {
    name: 'AcquirerResponse',
    ...DETAIL,
    req: 'C',
    text: 'Represents the acquirer original response code retrieved from the acquirer directly: the status the payment brand returned.',
    example: 'pending',
  },
  { name: 'ConnectorReasonCode', ...DETAIL, req: 'C', text: 'The payment brand’s reason code, for example succeeded, required_next_step, or why it declined.', example: 'required_next_step' },
  { name: 'AcquirerTimestamp', ...DETAIL, req: 'C', text: 'When the payment brand processed the transaction.', example: '2026-11-03 11:34:36+00:00' },
  { name: 'ConnectorErrorField', ...DETAIL, req: 'C', text: 'Only on errors: the request field the payment brand rejected.', example: 'customer.mobile' },
  { name: 'ConnectorErrorFieldDetails', ...DETAIL, req: 'C', text: 'Only on errors: why that field was rejected.', example: 'invalid format' },
]

const REDIRECT = {
  name: 'redirect',
  type: 'object',
  req: 'C',
  text: 'Only while an asynchronous payment is pending: where to send the shopper, and how.',
  children: [
    { name: 'url', format: 'AN2048', pattern: ANY(6, 2048), req: 'C', text: 'URL the shopper must be redirected to in order to proceed.', example: 'https://…' },
    { name: 'method', req: 'C', text: 'GET or POST. If it’s missing, use POST when there are parameters and GET when there aren’t.', example: 'POST' },
    {
      name: 'parameters',
      type: 'array',
      req: 'C',
      text: 'The name and value pairs to pass with the redirect: query parameters for GET, hidden form fields for POST.',
      children: [
        {
          name: 'name',
          format: 'AN255',
          pattern: ANY(1, 255),
          req: 'C',
          text: 'List of parameter names for the redirect.url. The corresponding parameter value is the same parameter number ending with .value.',
        },
        { name: 'value', format: 'AN255', pattern: ANY(1, 255), req: 'C', text: 'The parameter values corresponding to the names as described above.' },
      ],
    },
  ],
}

export const RESPONSE_BASE = {
  id: {
    name: 'id',
    format: 'AN32',
    pattern: '[a-zA-Z0-9]{32}',
    req: 'A',
    text: 'The identifier of the payment request that can be used to reference the payment later, as the {id} part of the URL for sending referencing requests.',
    example: '8ac7a4a1a1a0e53501a1a12ca8c62c86',
  },
  paymentType: { name: 'paymentType', format: 'A2', req: 'A', text: 'The payment type of the request.', example: 'DB' },
  paymentBrand: { name: 'paymentBrand', format: 'AN32', pattern: '[a-zA-Z0-9_]{1,32}', req: 'C', text: 'The payment brand of the request.', example: 'IDEAL_VA' },
  amount: {
    name: 'amount',
    format: 'N10.N2',
    pattern: '[0-9]{1,10}\\.[0-9]{2}',
    req: 'C',
    text: 'The amount of the transaction approved by the acquirer, alternative payment method or other payment platform.',
    example: '10.00',
  },
  currency: { name: 'currency', format: 'A3', pattern: '[a-zA-Z]{3}', req: 'C', text: 'The currency of the request.', example: 'EUR' },
  descriptor: { name: 'descriptor', format: 'AN127', pattern: ANY(1, 127), req: 'C', text: 'The descriptor of the request.', example: '1234.5678.9012 Nomupay Demo' },
  merchantTransactionId: {
    name: 'merchantTransactionId',
    format: 'AN255',
    pattern: ANY(8, 255),
    req: 'C',
    text: 'The merchant reference sent in the request, used as an end-to-end identifier for reconciliation.',
    example: 'order-12345678',
  },
  result: {
    name: 'result',
    type: 'object',
    req: 'A',
    text: 'The result of the request.',
    children: [
      {
        name: 'code',
        format: 'AN11',
        pattern: '[0-9\\.]{2,11}',
        req: 'A',
        text: 'The unique code that indicates the result status of the request.',
        example: '000.200.000',
      },
      { name: 'description', format: 'AN255', pattern: ANY(0, 255), req: 'O', text: 'A textual description explaining the result.code’s meaning.', example: 'transaction pending' },
    ],
  },
  resultDetails: {
    name: 'resultDetails',
    type: 'object',
    req: 'O',
    text: 'A container for name value pairs that enrich the response with bank-specific details. Shown when the entity has “Show Connector details in Response”.',
    children: RESULT_DETAILS,
  },
  redirect: REDIRECT,
  buildNumber: { name: 'buildNumber', format: 'AN255', pattern: ANY(0, 255), req: 'A', text: 'Useful for support purposes.', example: 'b9f2…@2026-11-03' },
  timestamp: { name: 'timestamp', format: 'date', pattern: 'yyyy-MM-dd hh:mm:ssZ', req: 'A', text: 'The timestamp the response has generated.', example: '2026-11-03 11:34:36.125+0000' },
  ndc: { name: 'ndc', format: 'AN69', pattern: '[a-zA-Z0-9\\-]{1,69}', req: 'A', text: 'An internal unique identifier for the request.', example: '8ac7a4…_83281e55…' },
}

export const REDIRECT_DOC = REDIRECT

// Card payment responses: resultDetails from the KB, NomuPay Integration Sheet >
// Response Fields Mapping, plus the card-on-file objects
export const CARD_RESULT_DETAILS = [
  {
    name: 'CardholderInitiatedTransactionID',
    ...DETAIL,
    req: 'C',
    text: 'The scheme transaction ID (paymentMethod.scheme.transactionId). On a CIT, store it: it links later MITs to this payment.',
    example: '486292702388291',
  },
  {
    name: 'LifecycleId',
    ...DETAIL,
    req: 'C',
    text: 'Mastercard TLID (paymentMethod.scheme.transactionLinkId). Without a registration, send it back as standingInstruction.agreementId on each MIT.',
    example: 'f7t-wTAZTYSh0YaThWaxzw',
  },
  { name: 'AuthCode', ...DETAIL, req: 'C', text: 'The approval code from the scheme, when there is one.', example: '000001' },
  { name: 'ConnectorTxID1', ...DETAIL, req: 'C', text: 'The identifier of the ACI transaction.', example: '8ac7a4a1a1a0e53501a1a1308cfc3851' },
  { name: 'ConnectorTxID2', ...DETAIL, req: 'C', text: 'NomuPay’s reference for this transaction.' },
  { name: 'ConnectorTxID3', ...DETAIL, req: 'C', text: 'NomuPay’s reference for the payment, the same for every transaction on it.' },
  { name: 'AcquirerResponse', ...DETAIL, req: 'C', text: 'NomuPay’s status for the transaction.' },
  { name: 'SchemeResponseCode', ...DETAIL, req: 'C', text: 'The response code as returned by the scheme.', example: '00' },
  {
    name: 'MerchantAdviceCode',
    ...DETAIL,
    req: 'C',
    text: 'On a decline, whether and when to retry, e.g. 03 do not try again, 21 recurring payment cancelled, 24-30 retry after a set time (Mastercard).',
    example: '02',
  },
  { name: 'ExtendedDescription', ...DETAIL, req: 'C', text: 'The status, or the reason in case of a decline.' },
]

export const CARD_RESPONSE = {
  registrationId: {
    name: 'registrationId',
    format: 'AN32',
    pattern: '[a-zA-Z0-9]{32}',
    req: 'C',
    text: 'The stored card, once the payment with createRegistration=true succeeds. Send repeated payments to /v1/registrations/{registrationId}/payments.',
    example: '8ac7a4a2a162d40101a1688b2963127d',
  },
  card: {
    name: 'card',
    type: 'object',
    req: 'C',
    text: 'The card the payment used.',
    children: [
      { name: 'bin', format: 'N6', req: 'C', text: 'The first six digits of the card number.', example: '555555' },
      { name: 'last4Digits', format: 'N4', req: 'C', text: 'The last four digits of the card number.', example: '4444' },
      { name: 'holder', format: 'AN128', req: 'C', text: 'Holder of the card.', example: 'Test Shopper' },
      { name: 'expiryMonth', format: 'N2', req: 'C', text: 'The expiry month.', example: '01' },
      { name: 'expiryYear', format: 'N4', req: 'C', text: 'The expiry year.', example: '2030' },
    ],
  },
  standingInstruction: {
    name: 'standingInstruction',
    type: 'object',
    req: 'C',
    text: 'The card-on-file details of the payment.',
    children: [
      { name: 'type', req: 'C', text: 'UNSCHEDULED, INSTALLMENT or RECURRING.', example: 'RECURRING' },
      { name: 'mode', req: 'C', text: 'INITIAL or REPEATED.', example: 'INITIAL' },
      { name: 'source', req: 'C', text: 'CIT or MIT.', example: 'CIT' },
      { name: 'recurringType', req: 'C', text: 'SUBSCRIPTION or STANDING_ORDER.', example: 'SUBSCRIPTION' },
      { name: 'initialTransactionId', req: 'C', text: 'The scheme transaction ID of the initial payment.', example: '486292702388291' },
      { name: 'agreementId', req: 'C', text: 'Mastercard economically related TLID.', example: 'f7t-wTAZTYSh0YaThWaxzw' },
    ],
  },
  threeDSecure: {
    name: 'threeDSecure',
    type: 'object',
    req: 'C',
    text: 'The 3D Secure result of the payment.',
    children: [
      { name: 'eci', format: 'N2', req: 'C', text: 'The Electronic Commerce Indicator.', example: '05' },
      { name: 'authenticationStatus', req: 'C', text: 'The 3D Secure transaction status.', example: 'Y' },
      { name: 'version', req: 'C', text: 'The 3D Secure version.', example: '2.2.0' },
    ],
  },
}
