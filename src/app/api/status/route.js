import { credentialsFor, gateway, masked } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

function pathFrom(resourcePath, id) {
  if (/^\/v1\/(payments\/[0-9a-f]{32}|checkouts\/[0-9A-Za-z.\-]{10,64}\/payment)$/.test(resourcePath || '')) return resourcePath
  if (/^[0-9a-f]{32}$/.test(id || '')) return `/v1/payments/${id}`
  return null
}

async function status(path, kind, creds) {
  let params = [['entityId', creds.id]]
  try {
    let { httpStatus, data, status } = await gateway('GET', path, params, creds)
    return Response.json({ request: { method: 'GET', path, params: masked(params) }, entity: kind, httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}

// Step 3: GET the payment by resourcePath (either flow) or payment ID, with the demo's credentials
export async function GET(request) {
  let url = new URL(request.url)
  let kind = url.searchParams.get('entity') === 'card' ? 'card' : 'wallet'
  let creds = credentialsFor({}, kind)
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let path = pathFrom(url.searchParams.get('resourcePath'), url.searchParams.get('id'))
  if (!path) return Response.json({ error: 'Give a 32-character payment ID or a resourcePath.' }, { status: 400 })
  return status(path, kind, creds)
}

// The same with the merchant's own test credentials, which stay out of the URL
export async function POST(request) {
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor(input, 'wallet')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let path = pathFrom(input.resourcePath, input.id)
  if (!path) return Response.json({ error: 'Give a 32-character payment ID or a resourcePath.' }, { status: 400 })
  return status(path, 'wallet', creds)
}
