import { buildAftParams, validateAft } from '@/lib/aft'
import { IS_TEST, credentialsFor, gateway, masked, publicBase } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// The shopper's IP for 3-D Secure: the first address Vercel's proxy forwarded
function clientIp(request) {
  let ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || ''
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : '192.0.2.10'
}

// AFT step 1: the Account Funding Transaction.
// POST /v1/payments with the card, transactionProcessingCode=FUNDING, the Funds Transfer Type,
// the sender and the recipient
export async function POST(request) {
  // Card data only ever goes to the test system from this demo
  if (!IS_TEST) return Response.json({ error: 'The AFT guide only runs against the test system.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor({}, 'aft')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validateAft(input)
  if (error) return Response.json({ error }, { status: 400 })

  let mtid = input.merchantTransactionId || `aft-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildAftParams(
    { ...input, merchantTransactionId: mtid },
    { entityId: creds.id, shopperResultUrl: `${publicBase(request)}/aft/server-to-server/return`, ip: clientIp(request) },
  )
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/payments', params, creds)
    return Response.json({ request: { method: 'POST', path: '/v1/payments', params: masked(params) }, entity: 'aft', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
