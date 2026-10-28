import { CONFIGURED, TEST_MODE, entity, gateway, masked, notConfigured, publicBase, validateInput } from '@/lib/gateway'
import { buildPaymentParams } from '@/lib/request'

export const dynamic = 'force-dynamic'

// Server-to-server step 1: POST /v1/payments with paymentBrand
export async function POST(request) {
  if (!CONFIGURED) return notConfigured()
  let input = await request.json().catch(() => ({}))
  let error = validateInput(input, { flow: 's2s' })
  if (error) return Response.json({ error }, { status: 400 })

  let mtid = input.merchantTransactionId || `apm-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildPaymentParams(
    { ...input, flow: 's2s', merchantTransactionId: mtid },
    { entityId: entity('wallet').id, testMode: TEST_MODE, shopperResultUrl: `${publicBase(request)}/server-to-server/return` },
  )
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/payments', params, 'wallet')
    return Response.json({
      request: { method: 'POST', path: '/v1/payments', params: masked(params) },
      entity: 'wallet',
      httpStatus,
      status,
      response: data,
    })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
