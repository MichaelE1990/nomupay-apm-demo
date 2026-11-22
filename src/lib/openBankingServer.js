// Server-only: the credentials for the Pay by Bank guide. Never import this from a client component.

// The test system's Open Banking channel ("Open Banking Test channel"), from the Help Centre's
// OpenBanking API article. OPEN_BANKING_ENTITY_ID and OPEN_BANKING_ACCESS_TOKEN override it
// when the demo's own access token can't use that channel.
const OPEN_BANKING_TEST_ENTITY = '8ac7a4ca88fd9b770188fdb188910016'

const env = (k) => (process.env[k] || '').trim()

export function openBankingCredentials() {
  let id = env('OPEN_BANKING_ENTITY_ID') || OPEN_BANKING_TEST_ENTITY
  let token = env('OPEN_BANKING_ACCESS_TOKEN') || env('ACCESS_TOKEN')
  if (!token) return { error: 'ACCESS_TOKEN is not set on the server.', status: 503 }
  return { id, token }
}
