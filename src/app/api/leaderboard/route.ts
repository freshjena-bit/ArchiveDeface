import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/leaderboard?mode=defacers|teams
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'defacers'

  if (mode === 'teams') {
    // aggregate per team from the hacker table (totalHits = per-hacker incident count)
    const groups = await db.hacker.groupBy({
      by: ['team'],
      _sum: { totalHits: true },
      _count: { _all: true },
      orderBy: { _sum: { totalHits: 'desc' } },
      take: 50,
    })

    const items = groups
      .filter((g) => g.team && g.team.trim() !== '')
      .map((g, i) => ({
        team: g.team as string,
        members: g._count._all,
        totalHits: g._sum.totalHits ?? 0,
        rank: i + 1,
      }))

    return NextResponse.json({ mode: 'teams', items })
  }

  // default: defacers
  const hackers = await db.hacker.findMany({
    orderBy: { totalHits: 'desc' },
    take: 50,
  })

  const ranked = hackers.map((h, i) => ({
    id: h.id,
    handle: h.handle,
    team: h.team,
    country: h.country,
    color: h.avatarColor,
    bio: h.bio,
    totalHits: h.totalHits,
    rank: i + 1,
    joinedAt: h.joinedAt.toISOString(),
    badges: [] as string[],
  }))

  return NextResponse.json({ mode: 'defacers', items: ranked })
}
