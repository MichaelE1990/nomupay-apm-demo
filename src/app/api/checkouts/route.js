import { CONFIGURED, TEST_MODE, entity, gateway, masked, notConfigured, validateInput } from '@/lib/gateway'
import { buildPaymentParams, usesCard } from '@/lib/request'

export const dynamic = 'force-dynamic'

// COPYandPAY step 1: POST /v1/checkouts
export async function POST(request) {
  if (!CONFIGURED) return notConfigured()
  let input = await request.json().catch(() => ({}))
  let error = validateInput(input, { flow: 'copyandpay' })
  if (error) return Response.json({ error }, { status: 400 })

  let kind = usesCard(input.brands) ? 'card' : 'wallet'
  let mtid = input.merchantTransactionId || `apm-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildPaymentParams(
    { ...input, flow: 'copyandpay', merchantTransactionId: mtid },
    { entityId: entity(kind).id, testMode: TEST_MODE },
  )
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/checkouts', params, kind)
    return Response.json({
      request: { method: 'POST', path: '/v1/checkouts', params: masked(params) },
      entity: kind,
      httpStatus,
      status: data.id ? 'pending' : status,
      response: data,
    })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
