import { BRANDS } from '@/lib/brands'
import { publicConfig } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ ...publicConfig(), brands: BRANDS })
}
