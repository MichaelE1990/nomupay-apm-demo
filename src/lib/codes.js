// Result code classification and plain-English meanings

const SUCCESS = /^(000\.000\.|000\.100\.1|000\.[36]|000\.400\.[1][12]0)/
const PENDING = /^(000\.200|800\.400\.5|100\.400\.500)/

export function classify(code) {
  if (SUCCESS.test(code || '')) return 'success'
  if (PENDING.test(code || '')) return 'pending'
  return 'failed'
}

export const RESULT_CODES = [
  { pattern: /^000\.000\.|^000\.100\.1/, example: '000.100.112', title: 'Successful', meaning: 'The payment succeeded. On the test environment this usually reads "Request successfully processed in Merchant in Connector Test Mode".' },
  { pattern: /^000\.200\.100/, example: '000.200.100', title: 'Checkout created', meaning: 'COPYandPAY: the checkout is ready. Use its id to render the payment form.' },
  { pattern: /^000\.200\.001/, example: '000.200.001', title: 'Waiting for a non-instant payment', meaning: 'For example a Multibanco voucher. It stays pending until the shopper pays or the brand’s timeout passes.' },
  { pattern: /^000\.200/, example: '000.200.000', title: 'Pending', meaning: 'The shopper still has to complete the payment. Send them to the redirect URL if one came back, or wait for them to approve in their app. This is not a failure.' },
  { pattern: /^100\.396\.101/, example: '100.396.101', title: 'Cancelled by user', meaning: 'The shopper cancelled on the payment page.' },
  { pattern: /^100\.396\.103/, example: '100.396.103', title: 'Pending payment timed out', meaning: 'The shopper didn’t complete the payment within the brand’s timeout window.' },
  { pattern: /^800\.100\.152/, example: '800.100.152', title: 'Declined by authorization system', meaning: 'Declined by the processor. If it happens instantly on an APM, check the brand is activated for this merchant at PPRO.' },
  { pattern: /^800\.100\.156/, example: '800.100.156', title: 'Format error', meaning: 'The processor rejected the request format.' },
  { pattern: /^600\.200\.500/, example: '600.200.500', title: 'Not configured', meaning: 'The gateway isn’t set up for this brand, currency or country on this entity. Check the merchant account configuration.' },
  { pattern: /^200\.300\.404/, example: '200.300.404', title: 'Invalid or missing parameter', meaning: 'Check ConnectorErrorField and ConnectorErrorFieldDetails, or the parameterErrors list, in the response.' },
  { pattern: /^800\.900\.30[01]/, example: '800.900.300', title: 'Authentication failed', meaning: 'Check the entity ID and access token.' },
  { pattern: /^900\.100\.200/, example: '900.100.200', title: 'Connector error', meaning: 'Error response from the connector or acquirer.' },
]

export function describeCode(code) {
  const hit = RESULT_CODES.find((c) => c.pattern.test(code || ''))
  if (hit) return hit.meaning
  const s = classify(code)
  if (s === 'success') return 'The payment succeeded.'
  if (s === 'pending') return 'Pending: the payment isn’t final yet.'
  return 'The request was rejected or the payment failed. See the description and connector details.'
}
