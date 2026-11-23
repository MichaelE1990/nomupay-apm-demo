// Server-only: the credentials for the Pay by Bank guide. Never import this from a client component.
import { entity } from '@/lib/gateway'

const env = (k) => (process.env[k] || '').trim()

// Pay by Bank runs on the same merchant account and entity as the recurring guide ("Demo Channel -
// 3DV2", which has the Open Banking test channel), with the same access token.
// OPEN_BANKING_ENTITY_ID and OPEN_BANKING_ACCESS_TOKEN override them.
export function openBankingCredentials() {
  let recurring = entity('recurring')
  let id = env('OPEN_BANKING_ENTITY_ID') || recurring.id
  let token = env('OPEN_BANKING_ACCESS_TOKEN') || recurring.token
  if (!token) return { error: 'ACCESS_TOKEN is not set on the server.', status: 503 }
  return { id, token }
}
