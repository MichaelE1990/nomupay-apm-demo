import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'
import { REGISTRATION_ID, buildManageParams, validateManage } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

// Recurring step 5: manage the stored card. action 'update' sends new card details with
// POST /v1/registrations/{id}; action 'delete' deregisters it with DELETE /v1/registrations/{id}
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'The recurring guide only runs against the test system.' }, { status: 400 })
  let { id } = await routeParams
  if (!REGISTRATION_ID.test(id || '')) return Response.json({ error: 'The registrationId must be 32 characters.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor({}, 'recurring')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validateManage(input)
  if (error) return Response.json({ error }, { status: 400 })

  let method = input.action === 'delete' ? 'DELETE' : 'POST'
  let params = buildManageParams(input, { entityId: creds.id })
  let path = `/v1/registrations/${id}`
  try {
    let { httpStatus, data, status } = await gateway(method, path, params, creds)
    return Response.json({ request: { method, path, params: masked(params) }, entity: 'card', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
