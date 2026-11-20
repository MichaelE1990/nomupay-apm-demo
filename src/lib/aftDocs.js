// Parameter docs for the AFT guide, in the same shape as paramDocs.js. The AFT fields, their
// formats and requirements come from the Help Centre's 6211 - Security Brokers/Dealers article
// (required parameters table); the allowed values from what the test gateway accepts; the card
// and 3-D Secure fields are shared with the recurring guide.
import { RESPONSE_BASE } from '@/lib/paramDocs'
import { CARD_DOC, CARD_RESULT_DETAILS, REC_REQUEST_DOCS, THREE_D_SECURE_DOC } from '@/lib/recurringDocs'

const ANY = (min, max) => `[\\s\\S]{${min},${max}}`

export const AFT_REQUEST_DOCS = {
  ...REC_REQUEST_DOCS,
  merchantTransactionId: {
    ...REC_REQUEST_DOCS.merchantTransactionId,
    format: 'AN255',
    text: 'The ID your system gives the transaction, to help identify it. Mandatory for AFTs.',
    example: 'ORD-20261027-0001',
  },
  shopperResultUrl: {
    ...REC_REQUEST_DOCS.shopperResultUrl,
    text: 'Where the shopper comes back to after 3-D Secure. The gateway adds the payment’s id and resourcePath to it.',
  },
  transactionProcessingCode: {
    pattern: 'PURCHASE|FUNDING|PAYMENT',
    text: 'Classifies the card transaction. AFT transactions must always be set to FUNDING.',
    example: 'FUNDING',
  },
  transactionPurposeCode: {
    format: 'AN20',
    pattern: '[A-Za-z0-9_]{1,20}',
    text: 'Classifies the purpose of the funding transaction, for example HIGHRISKSEC. Required for Mastercard AFT transactions.',
    example: 'HIGHRISKSEC',
  },
  'customParameters[FundsTransferType]': {
    format: 'AN50',
    pattern: ANY(1, 50),
    text: 'Classifies what the funds are being used for. The gateway maps it to the Visa Business Application Identifier (BAI) and the Mastercard Transaction Type Identifier (TTI), so you don’t send those. Only the values allowed for your MCC on the card’s scheme can be used.',
    example: 'wallet_high_risk_securities',
  },
  'customParameters[isDirectPurchase]': {
    pattern: 'true|false',
    text: 'Whether the payment buys an asset immediately (true) or funds an account for a later purchase (false). For account top-ups, send false.',
    example: 'false',
  },
  'sender.accountNumberType': {
    pattern: 'CARD_ACCOUNT',
    text: 'Where the funds are collected from. In nearly all cases that’s the card, so CARD_ACCOUNT. If you use another method, contact Nomupay support.',
    example: 'CARD_ACCOUNT',
  },
  'sender.givenName': { format: 'AN50', pattern: ANY(1, 50), text: 'The cardholder’s first name. Send it in this field as well as in the customer details.', example: 'Jane' },
  'sender.surname': { format: 'AN50', pattern: ANY(1, 50), text: 'The cardholder’s surname. Send it in this field as well as in the customer details.', example: 'Doe' },
  'sender.birthDate': {
    format: 'AN10',
    pattern: 'yyyy-MM-dd',
    text: 'The cardholder’s date of birth. Required when the card was issued outside the country where you’re registered.',
    example: '2000-01-21',
  },
  'sender.street': { format: 'AN100', pattern: ANY(1, 100), text: 'The billing street address, sent in this field as well as in the billing details.', example: '229 Green Ln' },
  'sender.city': { format: 'AN50', pattern: ANY(1, 50), text: 'The billing city, sent in this field as well as in the billing details.', example: 'Ilford' },
  'sender.state': {
    format: 'AN50',
    pattern: ANY(1, 50),
    text: 'The billing state, county or province. Where the country has no states or provinces, send the city.',
    example: 'Greater London',
  },
  'sender.postcode': { format: 'AN16', pattern: ANY(1, 16), text: 'The billing postcode.', example: 'IG1 1XR' },
  'sender.country': { format: 'A2', pattern: '[A-Z]{2}', text: 'The billing country, as a 2-letter ISO 3166-1 code.', example: 'GB' },
  'recipient.givenName': {
    format: 'AN50',
    pattern: ANY(1, 50),
    text: 'The recipient’s first name, or the business name when the funds are for the business.',
    example: 'Jane',
  },
  'recipient.surname': { format: 'AN50', pattern: ANY(1, 50), text: 'The recipient’s surname. Only when the recipient is a person, not a business.', example: 'Doe' },
  'recipient.accountNumberType': {
    pattern: 'WALLET_ID',
    text: 'The type of account the funds go to. Nomupay currently supports WALLET_ID only.',
    example: 'WALLET_ID',
  },
  'recipient.accountNumber': {
    format: 'AN50',
    pattern: ANY(1, 50),
    text: 'The number of the account the funds go to, of the type in recipient.accountNumberType: the shopper’s account or wallet ID with you.',
    example: '1234567890',
  },
}

export function aftDoc(key, extra = {}) {
  return { name: key, ...(AFT_REQUEST_DOCS[key] || {}), ...extra }
}

// The AFT classification the gateway echoes back
const CUSTOM_PARAMETERS_DOC = {
  name: 'customParameters',
  type: 'object',
  req: 'C',
  text: 'The custom parameters the request sent, including the AFT classification.',
  children: [
    { name: 'FundsTransferType', format: 'AN50', req: 'C', text: 'What the funds are being used for.', example: 'wallet_high_risk_securities' },
    { name: 'isDirectPurchase', pattern: 'true|false', req: 'C', text: 'Whether the payment bought an asset straight away.', example: 'false' },
  ],
}

const RECIPIENT_DOC = {
  name: 'recipient',
  type: 'object',
  req: 'C',
  text: 'The recipient the request sent. The sender details aren’t returned.',
  children: [
    { name: 'givenName', format: 'AN50', req: 'C', text: 'The recipient’s first name, or the business name.', example: 'Jane' },
    { name: 'surname', format: 'AN50', req: 'C', text: 'The recipient’s surname, for a person.', example: 'Doe' },
    { name: 'accountNumber', format: 'AN50', req: 'C', text: 'The account the funds go to.', example: '1234567890' },
    { name: 'accountNumberType', req: 'C', text: 'The type of that account.', example: 'WALLET_ID' },
  ],
}

const B = RESPONSE_BASE

export const AFT_RESPONSE_DOCS = [
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
  CUSTOM_PARAMETERS_DOC,
  RECIPIENT_DOC,
  THREE_D_SECURE_DOC,
  B.redirect,
  B.buildNumber,
  B.timestamp,
  B.ndc,
]

export const CAPTURE_RESPONSE_DOCS = [
  { ...B.id, text: 'The identifier of the capture, a payment of its own.' },
  {
    name: 'referencedId',
    format: 'AN32',
    pattern: '[a-zA-Z0-9]{32}',
    req: 'C',
    text: 'The id of the pre-authorization this capture confirms.',
    example: '8ac7a4a1a1a0e53501a1a12ca8c62c86',
  },
  { ...B.paymentType, example: 'CP' },
  B.amount,
  B.currency,
  B.descriptor,
  B.result,
  { ...B.resultDetails, children: CARD_RESULT_DETAILS },
  B.buildNumber,
  B.timestamp,
  B.ndc,
]
