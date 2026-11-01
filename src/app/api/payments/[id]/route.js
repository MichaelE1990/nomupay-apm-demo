import { CONFIGURED, TEST_MODE, entity, gateway, masked, notConfigured } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// Back-office operations on an earlier payment: capture (CP) a pre-authorization,
// or refund (RF) a debit or capture. POST /v1/payments/{id}
export async function POST(request, { params: routeParams }) {
  if (!CONFIGURED) return notConfigured()
  let { id } = await routeParams
  if (!/^[0-9a-f]{32}$/.test(id || '')) return Response.json({ error: 'Payment ID must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let paymentType = String(input.paymentType || '')
  if (!['CP', 'RF'].includes(paymentType)) return Response.json({ error: 'paymentType must be CP or RF.' }, { status: 400 })
  if (!/^\d{1,9}(\.\d{2})?$/.test(String(input.amount || ''))) return Response.json({ error: 'Amount must look like 10.00.' }, { status: 400 })
  if (!/^[A-Z]{3}$/.test(String(input.currency || ''))) return Response.json({ error: 'Currency must be a 3-letter code.' }, { status: 400 })

  let params = [
    ['entityId', entity('wallet').id],
    ['amount', String(input.amount)],
    ['currency', String(input.currency)],
    ['paymentType', paymentType],
  ]
  // Must match the original payment's mode, or the gateway answers 700.100.600
  if (TEST_MODE) params.push(['testMode', TEST_MODE])
  let path = `/v1/payments/${id}`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, 'wallet')
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: 'wallet', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
