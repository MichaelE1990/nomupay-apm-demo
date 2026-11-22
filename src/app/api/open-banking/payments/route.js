import { IS_TEST, gateway, masked, publicBase } from '@/lib/gateway'
import { buildPaymentParams, validatePayment } from '@/lib/openBanking'
import { openBankingCredentials } from '@/lib/openBankingServer'

export const dynamic = 'force-dynamic'

// Pay by Bank step 1: POST /v1/payments with paymentBrand=ACI_INSTANTPAY. The response is
// pending, with a redirect to Token.io where the shopper picks their bank and approves
export async function POST(request) {
  if (!IS_TEST) return Response.json({ error: 'The Pay by Bank guide only runs against the test system.' }, { status: 400 })
  let input = await request.json().catch(() => ({}))
  let creds = openBankingCredentials()
  if (creds.error) return Response.json({ error: creds.error }, { status: creds.status })
  let error = validatePayment(input)
  if (error) return Response.json({ error }, { status: 400 })

  let params = buildPaymentParams(input, { entityId: creds.id, shopperResultUrl: `${publicBase(request)}/open-banking/integration/return` })
  try {
    let { httpStatus, data, status } = await gateway('POST', '/v1/payments', params, creds)
    return Response.json({ request: { method: 'POST', path: '/v1/payments', params: masked(params) }, httpStatus, status, response: data })
  } catch (e) {
    return Response.json({ error: `Couldn't reach the gateway: ${e.message}` }, { status: 502 })
  }
}
