// Parameter docs for the Pay by Bank guide, in the same shape as paramDocs.js. Formats from the
// Help Centre's OpenBanking API article; the response fields as the test gateway returns them.
import { REDIRECT_DOC, REQUEST_DOCS, RESPONSE_BASE } from '@/lib/paramDocs'

export const OB_REQUEST_DOCS = {
  amount: { ...REQUEST_DOCS.amount, example: '10.00' },
  currency: { ...REQUEST_DOCS.currency, text: 'The payment currency: GBP or EUR.', example: 'GBP' },
  paymentBrand: { ...REQUEST_DOCS.paymentBrand, text: 'The payment method. Pay by Bank is always ACI_INSTANTPAY.', example: 'ACI_INSTANTPAY' },
  paymentType: { ...REQUEST_DOCS.paymentType, text: 'Pay by Bank takes one-off debits only, so always DB.', example: 'DB' },
  'bankAccount.country': {
    format: 'A2',
    pattern: '[A-Z]{2}',
    text: 'The country of the shopper’s bank (ISO 3166-1). Token.io shows the banks for this country first.',
    example: 'GB',
  },
  merchantTransactionId: REQUEST_DOCS.merchantTransactionId,
  shopperResultUrl: {
    ...REQUEST_DOCS.shopperResultUrl,
    text: 'Where the shopper comes back to after approving with their bank. The gateway adds the payment’s id and resourcePath to it. Must be URL-encoded.',
  },
}

export const obDoc = (key, extra = {}) => ({ name: key, ...(OB_REQUEST_DOCS[key] || {}), ...extra })

const B = RESPONSE_BASE

const RESULT_DETAILS = [
  { name: 'ExtendedDescription', req: 'C', text: 'A longer description of the result.', example: 'Request created, operation in progress.' },
  { name: 'AcquirerResponse', req: 'C', text: 'The payment’s state at Token.io: PENDING, SUCCESS or a failure.', example: 'PENDING' },
  { name: 'Request Id', req: 'C', text: 'Token.io’s identifier for the payment request.', example: 'rq:2yjKxc4C43Mcuv9sBAF2mSneynzj:5zKtXEAq' },
  { name: 'Ref Id', req: 'C', text: 'The payment reference the shopper sees on Token.io’s page.', example: '085412460457' },
]

const BANK_ACCOUNT_DOC = {
  name: 'bankAccount',
  type: 'object',
  req: 'C',
  text: 'The bank details the request sent.',
  children: [{ name: 'country', format: 'A2', req: 'C', text: 'The country of the shopper’s bank.', example: 'GB' }],
}

export const PAYMENT_RESPONSE_DOCS = [
  B.id,
  { ...B.paymentType, example: 'DB' },
  { ...B.paymentBrand, example: 'ACI_INSTANTPAY' },
  { ...B.amount, example: '10.00' },
  { ...B.currency, example: 'GBP' },
  B.descriptor,
  B.merchantTransactionId,
  B.result,
  { ...B.resultDetails, children: RESULT_DETAILS },
  BANK_ACCOUNT_DOC,
  { ...REDIRECT_DOC, text: 'Where to send the shopper: Token.io’s page, opened with a GET request and no parameters.' },
  B.buildNumber,
  B.timestamp,
  B.ndc,
]

// The status also carries the bank country Token.io used, as a custom parameter
const CUSTOM_PARAMETERS_DOC = {
  name: 'customParameters',
  type: 'object',
  req: 'C',
  text: 'Details the connector adds to the payment.',
  children: [{ name: 'ACI_INSTANTPAY.COUNTRY', format: 'A2', req: 'C', text: 'The country of the shopper’s bank.', example: 'GB' }],
}

export const STATUS_RESPONSE_DOCS = PAYMENT_RESPONSE_DOCS.flatMap((d) =>
  d.name === 'redirect' ? [] : d.name === 'bankAccount' ? [d, CUSTOM_PARAMETERS_DOC] : [d],
)
