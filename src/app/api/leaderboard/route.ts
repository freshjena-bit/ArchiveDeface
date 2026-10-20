import { NextRequest } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = (searchParams.get('mode') ?? 'defacers') as 'defacers' | 'teams'
    const year = searchParams.get('year') ?? 'all'
    const month = searchParams.get('month') ?? 'all'

    const result = await getLeaderboard({ mode, year, month })
    // Leaderboard reads from Hacker table (~1 row in DB, super cheap).
    // Cache 10 min at edge since hackers rarely change ranking.
    return cached(result, { sMaxAgeSec: 600, swrSec: 1800 })
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
