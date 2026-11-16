import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'
import { REGISTRATION_ID, buildDeleteParams } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

// Recurring step 5: delete the stored card, DELETE /v1/registrations/{id}. The gateway has
// no request to change a stored card (POST /v1/registrations/{id} answers 404).
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'The recurring guide only runs against the test system.' }, { status: 400 })
  let { id } = await routeParams
  if (!REGISTRATION_ID.test(id || '')) return Response.json({ error: 'The registrationId must be 32 characters.' }, { status: 400 })
  let creds = credentialsFor({}, 'recurring')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })

  let params = buildDeleteParams({ entityId: creds.id })
  let path = `/v1/registrations/${id}`
  try {
    let { httpStatus, data, status } = await gateway('DELETE', path, params, creds)
    return Response.json({ request: { method: 'DELETE', path, params: masked(params) }, entity: 'recurring', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
