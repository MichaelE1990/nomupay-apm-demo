// Parameter docs for the recurring guide, in the same shape as paramDocs.js. Formats
// and patterns from the OPPWA parameters reference; the standingInstruction values
// from the Card on File guide; the browser fields from the 3-D Secure parameters.
import { REQUEST_DOCS, RESPONSE_BASE } from '@/lib/paramDocs'

const ANY = (min, max) => `[\\s\\S]{${min},${max}}`

export const REC_REQUEST_DOCS = {
  ...REQUEST_DOCS,
  paymentBrand: {
    format: 'AN32',
    pattern: '[a-zA-Z0-9_]{1,32}',
    text: 'The brand specifies the method of payment for the request. For cards, the card scheme.',
    example: 'VISA',
  },
  'card.number': { format: 'N19', pattern: '[0-9]{12,19}', text: 'The PAN or account number of the card.', example: '4200000000000000' },
  'card.holder': { format: 'AN128', pattern: ANY(3, 128), text: 'Holder of the credit card account.', example: 'Test Shopper' },
  'card.expiryMonth': { format: 'N2', pattern: '(0[1-9]|1[0-2])', text: 'The expiry month of the card.', example: '12' },
  'card.expiryYear': { format: 'N4', pattern: '(19|20)([0-9]{2})', text: 'The expiry year of the card.', example: '2029' },
  'card.cvv': {
    format: 'N4',
    pattern: '[0-9]{3,4}',
    text: 'The CVV code found on the card. Sent on the initial payment only: a merchant-initiated payment carries no shopper authentication data.',
    example: '123',
  },
  createRegistration: {
    pattern: 'true|false',
    text: 'Stores the payment data in a registration (a token) once the payment succeeds. The response carries its registrationId, which every later payment uses.',
    example: 'true',
  },
  'standingInstruction.mode': { pattern: 'INITIAL|REPEATED', text: 'INITIAL on the first payment of the agreement, REPEATED on every payment after it.' },
  'standingInstruction.source': { pattern: 'CIT|MIT', text: 'CIT when the cardholder initiates the payment, MIT when the merchant does without the cardholder.' },
  'standingInstruction.type': {
    pattern: 'UNSCHEDULED|INSTALLMENT|RECURRING',
    text: 'The type of agreement: RECURRING for payments at a fixed interval, INSTALLMENT for a set number of payments, UNSCHEDULED for a stored card charged when needed.',
  },
  'standingInstruction.recurringType': {
    pattern: 'STANDING_ORDER|SUBSCRIPTION',
    text: 'The type of recurring agreement. Required for every Mastercard CIT and MIT, and for Visa recurring payments with cards issued in India.',
  },
  'standingInstruction.expiry': {
    format: 'AN10',
    pattern: 'yyyy-mm-dd',
    text: 'The date the agreement ends. Mandatory when processing 3-D Secure on recurring or installment payments.',
  },
  'standingInstruction.frequency': {
    format: 'N4',
    pattern: '[0-9]{4}',
    text: 'How often the agreement charges, as a number of days. Mandatory when processing 3-D Secure on recurring or installment payments; Mastercard defaults to 0001 when it’s left out.',
  },
  'standingInstruction.numberOfInstallments': {
    format: 'N3',
    pattern: '[0-9]{1,3}',
    text: 'The number of payments in the installment plan. Required for INSTALLMENT with 3-D Secure.',
  },
  'standingInstruction.initialTransactionId': {
    text: 'The scheme’s reference for the initial payment, from its response. Required on MIT payments when the card isn’t tokenized by the platform; when it is (a registration), the platform stores it for you.',
  },
  'customer.ip': { format: 'AN255', pattern: ANY(1, 255), text: 'The shopper’s IP address. Required for 3-D Secure in a browser.', example: '192.0.2.10' },
  'customer.browser.acceptHeader': { format: 'AN2048', pattern: ANY(1, 2048), text: 'The exact content of the HTTP Accept header the shopper’s browser sent.' },
  'customer.browser.language': { format: 'AN8', pattern: ANY(1, 8), text: 'The browser language, from navigator.language.', example: 'en-GB' },
  'customer.browser.screenHeight': { format: 'N6', pattern: '[0-9]{1,6}', text: 'The screen height in pixels, from screen.height.', example: '900' },
  'customer.browser.screenWidth': { format: 'N6', pattern: '[0-9]{1,6}', text: 'The screen width in pixels, from screen.width.', example: '1440' },
  'customer.browser.timezone': { format: 'N5', pattern: '-?[0-9]{1,4}', text: 'The difference from UTC in minutes, from getTimezoneOffset().', example: '0' },
  'customer.browser.userAgent': { format: 'AN2048', pattern: ANY(1, 2048), text: 'The browser’s user agent.' },
  'customer.browser.javaEnabled': { pattern: 'true|false', text: 'Whether the browser can run Java, from navigator.javaEnabled().', example: 'false' },
  'customer.browser.javascriptEnabled': { pattern: 'true|false', text: 'Whether the browser can run JavaScript.', example: 'true' },
  'customer.browser.screenColorDepth': { pattern: '1|4|8|15|16|24|32|48', text: 'The screen colour depth in bits, from screen.colorDepth.', example: '24' },
  'customer.browser.challengeWindow': {
    format: 'N2',
    pattern: '01|02|03|04|05',
    text: 'The size of the challenge window: 01 = 250 x 400, 02 = 390 x 400, 03 = 500 x 600, 04 = 600 x 400, 05 = full screen.',
    example: '05',
  },
  'customer.mobile': {
    format: 'AN20',
    pattern: '+ccc-nnnnnnnn',
    text: 'The customer’s mobile number. For 3-D Secure, send at least one of customer.phone, customer.workPhone or customer.mobile: a country code of up to 3 digits, a dash, then up to 15 digits.',
    example: '+44-7700900123',
  },
  'threeDSecure.challengeIndicator': {
    format: 'N2',
    pattern: '01|02|03|04|05|06|07|08|09',
    text: 'The merchant’s challenge preference; the issuer still decides. 01 no preference, 02 no challenge requested, 03 challenge requested (merchant preference), 04 challenge requested (mandate, as on the initial CIT of an MIT agreement), 05 to 08 no challenge (risk analysis, data share, SCA already done, whitelist), 09 challenge with a whitelist prompt. Defaults to 04 on an initial CIT and with createRegistration=true; on the test system, 04 forces a challenge.',
    example: '04',
  },
  'customParameters[3DS2_enrolled]': { pattern: 'true', text: 'Test system only: any test card can be used for 3-D Secure, even one the simulator doesn’t list.' },
  'customParameters[3DS2_flow]': { pattern: 'challenge|frictionless', text: 'Test system only: forces a challenge or a frictionless 3-D Secure flow.' },
}

export function recDoc(key, extra = {}) {
  return { name: key, ...(REC_REQUEST_DOCS[key] || {}), ...extra }
}

const DETAIL = { format: 'AN2048', pattern: ANY(0, 2048) }

// Card payments: the connector details worth reading on a card payment
export const CARD_RESULT_DETAILS = [
  { name: 'ExtendedDescription', ...DETAIL, req: 'C', text: 'The acquirer’s description of the result.', example: 'Approved' },
  { name: 'AcquirerResponse', ...DETAIL, req: 'C', text: 'The acquirer’s original response code.', example: '00' },
  { name: 'ConnectorTxID1', ...DETAIL, req: 'C', text: 'The acquirer’s ID for the transaction.', example: '8ac7a4a1a1a0e53501a1a1308cfc3851' },
  {
    name: 'CardholderInitiatedTransactionID',
    ...DETAIL,
    req: 'C',
    text: 'On some integrations, the scheme’s reference for the initial payment (otherwise in standingInstruction.initialTransactionId).',
    example: '019312345678901',
  },
]

export const CARD_DOC = {
  name: 'card',
  type: 'object',
  req: 'C',
  text: 'The card the payment used, with the number masked.',
  children: [
    { name: 'bin', format: 'N6', req: 'C', text: 'The first six digits of the card number.', example: '420000' },
    { name: 'last4Digits', format: 'N4', req: 'C', text: 'The last four digits of the card number.', example: '0000' },
    { name: 'holder', format: 'AN128', req: 'C', text: 'Holder of the card account.', example: 'Test Shopper' },
    { name: 'expiryMonth', format: 'N2', req: 'C', text: 'The expiry month of the card.', example: '12' },
    { name: 'expiryYear', format: 'N4', req: 'C', text: 'The expiry year of the card.', example: '2029' },
  ],
}

const STANDING_INSTRUCTION_DOC = {
  name: 'standingInstruction',
  type: 'object',
  req: 'C',
  text: 'The agreement the payment belongs to, as the request sent it.',
  children: [
    { name: 'source', req: 'C', text: 'CIT or MIT.', example: 'CIT' },
    { name: 'type', req: 'C', text: 'RECURRING, INSTALLMENT or UNSCHEDULED.', example: 'RECURRING' },
    { name: 'mode', req: 'C', text: 'INITIAL or REPEATED.', example: 'INITIAL' },
    {
      name: 'initialTransactionId',
      req: 'C',
      text: 'The scheme’s reference for the initial payment. Store it in your own systems too: it’s needed if the agreement ever moves to another acquirer.',
      example: '019312345678901',
    },
  ],
}

export const THREE_D_SECURE_DOC = {
  name: 'threeDSecure',
  type: 'object',
  req: 'C',
  text: 'The 3-D Secure authentication, when the payment had one.',
  children: [
    { name: 'eci', format: 'N2', req: 'C', text: 'The electronic commerce indicator the authentication returned.', example: '05' },
    { name: 'version', req: 'C', text: 'The 3-D Secure version used.', example: '2.2.0' },
  ],
}

const REGISTRATION_ID_DOC = {
  name: 'registrationId',
  format: 'AN32',
  pattern: '[a-zA-Z0-9]{32}',
  req: 'C',
  text: 'The registration (token) for the stored card, when createRegistration was sent and the payment succeeded. Send it in the URL of every later payment.',
  example: '8ac7a4a19a5a1e4c019a5bd2f1b23c4d',
}

const B = RESPONSE_BASE

export const INITIAL_RESPONSE_DOCS = [
  B.id,
  REGISTRATION_ID_DOC,
  B.paymentType,
  { ...B.paymentBrand, example: 'VISA' },
  B.amount,
  B.currency,
  B.descriptor,
  B.merchantTransactionId,
  B.result,
  { ...B.resultDetails, children: CARD_RESULT_DETAILS },
  CARD_DOC,
  STANDING_INSTRUCTION_DOC,
  THREE_D_SECURE_DOC,
  B.redirect,
  B.buildNumber,
  B.timestamp,
  B.ndc,
]

export const REPEATED_RESPONSE_DOCS = [
  B.id,
  B.paymentType,
  { ...B.paymentBrand, example: 'VISA' },
  B.amount,
  B.currency,
  B.descriptor,
  B.merchantTransactionId,
  B.result,
  { ...B.resultDetails, children: CARD_RESULT_DETAILS },
  CARD_DOC,
  STANDING_INSTRUCTION_DOC,
  B.buildNumber,
  B.timestamp,
  B.ndc,
]

export const MANAGE_RESPONSE_DOCS = [
  { ...B.id, text: 'The identifier of this request on the registration.' },
  B.result,
  B.buildNumber,
  B.timestamp,
  B.ndc,
]
