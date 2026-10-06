import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

export const dynamic = 'force-dynamic'

// GET /api/leaderboard?mode=defacers|teams&year=all|2026
// Aggregates from the Defacement table. Only VERIFIED records
// (archived / restored) are counted — on-hold records are excluded.
// When a year is given, only incidents whose createdAt falls in that
// calendar year are counted.
export async function GET(req: NextRequest) {
  const db = await getDb()
  await promoteDueOnhold()
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'defacers'
  const yearParam = searchParams.get('year') ?? 'all'

  // available years (distinct, desc) for the selector — from verified records
  const allDates = await db.defacement.findMany({
    where: { status: { not: 'onhold' } },
    select: { createdAt: true },
  })
  const yearSet = new Set<number>()
  for (const d of allDates) yearSet.add(d.createdAt.getFullYear())
  const years = [...yearSet].sort((a, b) => b - a)

  // base filter: verified records only (exclude on-hold)
  const where: Record<string, unknown> = { status: { not: 'onhold' } }
  if (yearParam && yearParam !== 'all') {
    const y = parseInt(yearParam, 10)
    if (!Number.isNaN(y)) {
      where.createdAt = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
    }
  }

  // fetch incidents (with attacker) for the window
  const records = await db.defacement.findMany({
    where,
    select: {
      attackerId: true,
      attacker: {
        select: { id: true, handle: true, team: true, country: true, avatarColor: true, bio: true, joinedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (mode === 'teams') {
    const teams = new Map<string, { count: number; members: Set<string> }>()
    for (const r of records) {
      const team = (r.attacker.team || 'INDEPENDENT').trim() || 'INDEPENDENT'
      const entry = teams.get(team) ?? { count: 0, members: new Set<string>() }
      entry.count += 1
      entry.members.add(r.attackerId)
      teams.set(team, entry)
    }
    const items = [...teams.entries()]
      .map(([team, e], i) => ({
        team,
        members: e.members.size,
        totalHits: e.count,
        rank: i + 1,
      }))
      .sort((a, b) => b.totalHits - a.totalHits)
      .map((t, i) => ({ ...t, rank: i + 1 }))

    return NextResponse.json({ mode: 'teams', year: yearParam, years, items })
  }

  // defacers
  const defacers = new Map<string, { attacker: typeof records[number]['attacker']; count: number }>()
  for (const r of records) {
    const entry = defacers.get(r.attackerId) ?? { attacker: r.attacker, count: 0 }
    entry.count += 1
    defacers.set(r.attackerId, entry)
  }
  const items = [...defacers.entries()]
    .map(([id, e], i) => ({
      id,
      handle: e.attacker.handle,
      team: e.attacker.team,
      country: e.attacker.country,
      color: e.attacker.avatarColor,
      bio: e.attacker.bio,
      totalHits: e.count,
      rank: i + 1,
      joinedAt: e.attacker.joinedAt.toISOString(),
      badges: [] as string[],
    }))
    .sort((a, b) => b.totalHits - a.totalHits)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  return NextResponse.json({ mode: 'defacers', year: yearParam, years, items })
}
