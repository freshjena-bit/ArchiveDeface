import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import type { LeaderEntry } from '@/lib/types'

// Shared leaderboard fetcher — used by /api/leaderboard route AND
// server-side page rendering (so Google sees real defacer names in HTML).
export async function getLeaderboard(opts?: {
  mode?: 'defacers' | 'teams'
  year?: string  // 'all' or '2026'
  month?: string // 'all' or '1-12'
}): Promise<{
  mode: string
  year: string
  month: string
  years: number[]
  months: number[]
  items: LeaderEntry[]
}> {
  promoteDueOnhold()
  const mode = opts?.mode ?? 'defacers'
  const yearParam = opts?.year ?? 'all'
  const monthParam = opts?.month ?? 'all'

  // available years
  const allDates = await readDb((db) =>
    db.defacement.findMany({
      where: { status: { not: 'onhold' } },
      select: { createdAt: true },
    })
  )
  const yearSet = new Set<number>()
  for (const d of allDates) yearSet.add(d.createdAt.getFullYear())
  const years = [...yearSet].sort((a, b) => b - a)

  // available months for selected year
  let months: number[] = []
  if (yearParam !== 'all') {
    const y = parseInt(yearParam, 10)
    if (!Number.isNaN(y)) {
      const monthSet = new Set<number>()
      for (const d of allDates) {
        if (d.createdAt.getFullYear() === y) {
          monthSet.add(d.createdAt.getMonth() + 1)
        }
      }
      months = [...monthSet].sort((a, b) => a - b)
    }
  }

  // base filter
  const where: Record<string, unknown> = { status: { not: 'onhold' } }
  if (yearParam !== 'all') {
    const y = parseInt(yearParam, 10)
    if (!Number.isNaN(y)) {
      if (monthParam !== 'all') {
        const m = parseInt(monthParam, 10)
        if (!Number.isNaN(m) && m >= 1 && m <= 12) {
          where.createdAt = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
        }
      } else {
        where.createdAt = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
      }
    }
  }

  const records = await readDb((db) =>
    db.defacement.findMany({
      where,
      select: {
        attackerId: true,
        attacker: {
          select: { id: true, handle: true, team: true, country: true, avatarColor: true, bio: true, joinedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  )

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
      .map(([team, e]) => ({
        team,
        members: e.members.size,
        totalHits: e.count,
        rank: 0,
      }))
      .sort((a, b) => b.totalHits - a.totalHits)
      .map((t, i) => ({ ...t, rank: i + 1 }))

    return { mode: 'teams', year: yearParam, month: monthParam, years, months, items: items as unknown as LeaderEntry[] }
  }

  // defacers
  const defacers = new Map<string, { attacker: typeof records[number]['attacker']; count: number }>()
  for (const r of records) {
    const entry = defacers.get(r.attackerId) ?? { attacker: r.attacker, count: 0 }
    entry.count += 1
    defacers.set(r.attackerId, entry)
  }
  const items = [...defacers.entries()]
    .map(([id, e]) => ({
      id,
      handle: e.attacker.handle,
      team: e.attacker.team,
      country: e.attacker.country,
      color: e.attacker.avatarColor,
      bio: e.attacker.bio,
      totalHits: e.count,
      rank: 0,
      joinedAt: e.attacker.joinedAt.toISOString(),
      badges: [] as string[],
    }))
    .sort((a, b) => b.totalHits - a.totalHits)
    .map((d, i) => ({ ...d, rank: i + 1 }))

  return { mode: 'defacers', year: yearParam, month: monthParam, years, months, items }
}

// Fetch latest N defacements for LiveTicker + HomeRecent
export async function getRecentDefacements(limit: number = 10) {
  return readDb((db) =>
    db.defacement.findMany({
      where: { status: { not: 'onhold' } },
      include: { attacker: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  ).then((items) =>
    items.map((d) => ({
      id: d.id,
      targetUrl: d.targetUrl,
      targetName: d.targetName,
      country: d.country,
      category: d.category,
      severity: d.severity,
      status: d.status,
      note: d.note,
      poc: d.poc,
      reason: d.reason,
      mirrorUrl: d.mirrorUrl,
      isHomepage: d.isHomepage,
      isMass: d.isMass,
      isRedeface: d.isRedeface,
      isSpecial: d.isSpecial,
      createdAt: d.createdAt.toISOString(),
      attacker: {
        handle: d.attacker.handle,
        team: d.attacker.team,
        color: d.attacker.avatarColor,
        country: d.attacker.country,
      },
    }))
  )
}

// Fetch latest N news items
export async function getLatestNews(limit: number = 3) {
  return readDb((db) =>
    db.news.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
  ).then((items) =>
    items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      author: n.author,
      pinned: n.pinned,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }))
  )
}
