import { COF_BRANDS, CURRENCIES, RECURRING_TYPES, SI_TYPES, TEST_MODES, buildRepeatedParams, repeatedError } from '@/lib/cards'
import { IS_TEST, credentialsFor, gateway, masked } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

// Server-to-server card step 3: the repeated payment (MIT) over the registration,
// POST /v1/registrations/{id}/payments (KB, COF integration sheet 1.4 / 1.8)
export async function POST(request, { params: routeParams }) {
  if (!IS_TEST) return Response.json({ error: 'Card payments in this demo only run on the test system.' }, { status: 400 })
  let { id } = await routeParams
  let input = await request.json().catch(() => ({}))
  let creds = credentialsFor(input, 'card')
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })

  let form = input.form && typeof input.form === 'object' ? input.form : {}
  let repeated = input.repeated && typeof input.repeated === 'object' ? input.repeated : {}
  let ids = input.ids && typeof input.ids === 'object' ? input.ids : {}
  if (!COF_BRANDS.some((b) => b.code === form.brand)) return Response.json({ error: 'Choose Visa or Mastercard.' }, { status: 400 })
  if (!/^\d{1,9}(\.\d{2})?$/.test(String(form.amount || ''))) return Response.json({ error: 'Amount must look like 10.00.' }, { status: 400 })
  if (!CURRENCIES.includes(form.currency)) return Response.json({ error: 'Unknown currency.' }, { status: 400 })
  if (!SI_TYPES.some((t) => t.value === form.siType)) return Response.json({ error: 'Unknown standingInstruction.type.' }, { status: 400 })
  if (form.siType === 'RECURRING' && !RECURRING_TYPES.some((t) => t.value === form.recurringType))
    return Response.json({ error: 'Unknown standingInstruction.recurringType.' }, { status: 400 })
  if (!TEST_MODES.some((t) => t.value === String(form.testMode || ''))) return Response.json({ error: 'testMode must be EXTERNAL, INTERNAL or not sent.' }, { status: 400 })
  let error = repeatedError({ registrationId: id, repeated, ids })
  if (error) return Response.json({ error }, { status: 400 })

  let params = buildRepeatedParams({ form, repeated, ids }, { entityId: creds.id })
  let path = `/v1/registrations/${id}/payments`
  try {
    let { httpStatus, data, status } = await gateway('POST', path, params, creds)
    return Response.json({ request: { method: 'POST', path, params: masked(params) }, entity: 'card', httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
