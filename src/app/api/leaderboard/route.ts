import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/leaderboard — top hackers by total hits with computed rank
export async function GET() {
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

  return NextResponse.json({ items: ranked })
}
