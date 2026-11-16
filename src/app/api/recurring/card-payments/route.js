import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'
import { buildRepeatedCardParams, validateRepeatedCard } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

// Recurring step 4, decline testing: a subsequent payment (REPEATED MIT) sent with the card
// details, POST /v1/payments, so card.holder can carry a negative testing result code.
// (On /v1/registrations/{id}/payments the gateway uses the stored card and ignores it.)
export async function POST(request) {
  if (!IS_TEST) return Response.json({ error: 'The recurring guide only runs against the test system.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor({}, 'recurring')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validateRepeatedCard(input)
  if (error) return Response.json({ error }, { status: 400 })

  let mtid = input.merchantTransactionId || `rec-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildRepeatedCardParams({ ...input, merchantTransactionId: mtid }, { entityId: creds.id })
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/payments', params, creds)
    return Response.json({ request: { method: 'POST', path: '/v1/payments', params: masked(params) }, entity: 'recurring', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
