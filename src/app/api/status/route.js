import { CONFIGURED, entity, gateway, masked, notConfigured } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// Step 3: GET the payment by resourcePath (either flow) or payment ID
export async function GET(request) {
  if (!CONFIGURED) return notConfigured()
  let url = new URL(request.url)
  let kind = url.searchParams.get('entity') === 'card' ? 'card' : 'wallet'
  let resourcePath = url.searchParams.get('resourcePath') || ''
  let id = url.searchParams.get('id') || ''
  let path = null
  if (/^\/v1\/(payments\/[0-9a-f]{32}|checkouts\/[0-9A-Za-z.\-]{10,64}\/payment)$/.test(resourcePath)) path = resourcePath
  else if (/^[0-9a-f]{32}$/.test(id)) path = `/v1/payments/${id}`
  if (!path) return Response.json({ error: 'Give a 32-character payment ID or a resourcePath.' }, { status: 400 })

  let params = [['entityId', entity(kind).id]]
  try {
    let { httpStatus, data, status } = await gateway('GET', path, params, kind)
    return Response.json({ request: { method: 'GET', path, params: masked(params) }, entity: kind, httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
