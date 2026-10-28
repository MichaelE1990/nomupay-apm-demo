import { CONFIGURED, entity, gateway, masked, notConfigured } from '@/lib/gateway'
import { REPEAT_PAYMENT_PARAMS } from '@/lib/request'

export const dynamic = 'force-dynamic'

// Step 4: charge a saved registration again (customer-initiated, one-click)
export async function POST(request, { params: routeParams }) {
  if (!CONFIGURED) return notConfigured()
  let { id } = await routeParams
  if (!/^[0-9a-f]{32}$/.test(id || '')) return Response.json({ error: 'Registration ID must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  if (!/^\d{1,9}(\.\d{2})?$/.test(String(input.amount || ''))) return Response.json({ error: 'Amount must look like 10.00.' }, { status: 400 })
  if (!/^[A-Z]{3}$/.test(String(input.currency || ''))) return Response.json({ error: 'Currency must be a 3-letter code.' }, { status: 400 })
  let kind = input.entity === 'wallet' ? 'wallet' : 'card'

  let params = [
    ['entityId', entity(kind).id],
    ['amount', input.amount],
    ['currency', input.currency],
    ['paymentType', 'DB'],
    ...REPEAT_PAYMENT_PARAMS,
  ]
  let path = `/v1/registrations/${id}/payments`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, kind)
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: kind, httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
