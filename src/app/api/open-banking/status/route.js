import { IS_TEST, gateway } from '@/lib/gateway'
import { PAYMENT_ID } from '@/lib/openBanking'
import { openBankingCredentials } from '@/lib/openBankingServer'

export const dynamic = 'force-dynamic'

// Pay by Bank step 3: GET /v1/payments/{id} with the Open Banking entity
export async function POST(request) {
  if (!IS_TEST) return Response.json({ error: 'The Pay by Bank guide only runs against the test system.' }, { status: 400 })
  let { id } = await request.json().catch(() => ({}))
  if (!PAYMENT_ID.test(id || '')) return Response.json({ error: 'Payment ID must be 32 characters.' }, { status: 400 })
  let creds = openBankingCredentials()
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let path = `/v1/payments/${id}`
  try {
    let { httpStatus, data, status } = await gateway('GET', path, [['entityId', creds.id]], creds)
    return Response.json({ request: { method: 'GET', path }, httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
