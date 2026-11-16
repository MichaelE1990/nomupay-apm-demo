import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'
import { REGISTRATION_ID, buildRepeatedParams, validateRepeated } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

// Recurring step 4: a subsequent payment (MIT) on the stored card.
// POST /v1/registrations/{id}/payments with standingInstruction REPEATED, and
// card.holder set to a decline code when the merchant is negative testing
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'The recurring guide only runs against the test system.' }, { status: 400 })
  let { id } = await routeParams
  if (!REGISTRATION_ID.test(id || '')) return Response.json({ error: 'The registrationId must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor({}, 'recurring')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validateRepeated(input)
  if (error) return Response.json({ error }, { status: 400 })

  let mtid = input.merchantTransactionId || `rec-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildRepeatedParams({ ...input, merchantTransactionId: mtid }, { entityId: creds.id })
  let path = `/v1/registrations/${id}/payments`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, creds)
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: 'recurring', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
