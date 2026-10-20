import { getStats } from '@/lib/stats'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET /api/stats — dashboard summary + 14-day timeseries + category breakdown
// Cached at Vercel edge for 5 min (s-maxage=300) + stale-while-revalidate 10 min.
// Secondary defense: getStats() reads from Stat table cache (~30 row reads
// on cache hit, vs ~7M row reads before).
export async function GET() {
  const stats = await getStats()
  return cached(stats, { sMaxAgeSec: 300, swrSec: 600 })
}
