import { BRANDS } from '@/lib/brands'
import { publicBase, publicConfig } from '@/lib/gateway'

export const dynamic = 'force-dynamic'

export function GET(request) {
  return Response.json({ ...publicConfig(), returnBase: publicBase(request), brands: BRANDS })
}
