import { BROWSER_FIELDS, buildInitialParams, initialError } from '@/lib/cards'
import { IS_TEST, credentialsFor, gateway, masked, publicBase } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// The shopper's IP, for gateway 3D Secure (customer.ip)
function shopperIp(request) {
  let forwarded = request.headers.get('x-forwarded-for') || ''
  let ip = forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || ''
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : ''
}

// Server-to-server card step 1: POST /v1/payments with createRegistration=true and the
// card-on-file fields (KB, COF integration sheet 1.3 / 1.7). Test system only, and only
// with the published test cards.
export async function POST(request) {
  if (!IS_TEST) return Response.json({ error: 'Card payments in this demo only run on the test system.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor(input, 'card')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let form = input.form && typeof input.form === 'object' ? input.form : {}
  let error = initialError(form)
  if (error) return Response.json({ error }, { status: 400 })

  // Browser data only for gateway 3D Secure, and only the known fields
  let browser = {}
  if (form.threeDS === 'gateway' && input.browser && typeof input.browser === 'object') {
    for (let key of BROWSER_FIELDS) {
      let v = String(input.browser[key] ?? '').slice(0, 2048)
      if (v) browser[key] = v
    }
  }
  let mtid = form.merchantTransactionId || `card-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
  let params = buildInitialParams(
    { ...form, merchantTransactionId: mtid, paymentType: input.paymentType, browser },
    { entityId: creds.id, shopperResultUrl: `${publicBase(request)}/server-to-server/return`, customerIp: shopperIp(request) },
  )
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/payments', params, creds)
    return Response.json({
      request: { method: 'POST', path: '/v1/payments', params: masked(params.map(([k, v]) => [k, k === 'card.cvv' ? '***' : v])) },
      entity: 'card',
      httpStatus,
      status,
      response: data,
    })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
