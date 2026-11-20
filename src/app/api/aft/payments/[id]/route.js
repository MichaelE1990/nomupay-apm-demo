import { PAYMENT_ID, buildCaptureParams, validateCapture } from '@/lib/aft'
import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// AFT step 4: capture a pre-authorized AFT. POST /v1/payments/{id} with paymentType=CP,
// sent with the same testMode as the pre-authorization (or the gateway answers 700.100.600)
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'The AFT guide only runs against the test system.' }, { status: 400 })
  let { id } = await routeParams
  if (!PAYMENT_ID.test(id || '')) return Response.json({ error: 'Payment ID must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor({}, 'aft')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validateCapture(input)
  if (error) return Response.json({ error }, { status: 400 })

  let params = buildCaptureParams(input, { entityId: creds.id })
  let path = `/v1/payments/${id}`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, creds)
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: 'aft', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
