import { CURRENCIES, TEST_MODES, buildCaptureParams } from '@/lib/cards'
import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// Capture (CP) of a pre-authorised card payment: POST /v1/payments/{id}. The same
// testMode as the pre-authorisation, or the gateway answers 700.100.600.
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'Card payments in this demo only run on the test system.' }, { status: 400 })
  let { id } = await routeParams
  if (!/^[0-9a-f]{32}$/.test(id || '')) return Response.json({ error: 'Payment ID must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor(input, 'card')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  if (!/^\d{1,9}(\.\d{2})?$/.test(String(input.amount || ''))) return Response.json({ error: 'Amount must look like 10.00.' }, { status: 400 })
  if (!CURRENCIES.includes(input.currency)) return Response.json({ error: 'Unknown currency.' }, { status: 400 })
  let testMode = String(input.testMode || '')
  if (!TEST_MODES.some((t) => t.value === testMode)) return Response.json({ error: 'testMode must be EXTERNAL, INTERNAL or not sent.' }, { status: 400 })

  let params = buildCaptureParams({ amount: input.amount, currency: input.currency, testMode }, { entityId: creds.id })
  let path = `/v1/payments/${id}`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, creds)
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: 'card', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
