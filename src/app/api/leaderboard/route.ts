import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/leaderboard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = (searchParams.get('mode') ?? 'defacers') as 'defacers' | 'teams'
    const year = searchParams.get('year') ?? 'all'
    const month = searchParams.get('month') ?? 'all'

    const result = await getLeaderboard({ mode, year, month })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
