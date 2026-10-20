import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import type { LeaderEntry } from '@/lib/types'

export async function getLeaderboard(opts?: {
  mode?: 'defacers' | 'teams'
  year?: string
  month?: string
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

  // Simple approach: read Hacker table directly (totalHits is stored)
  // Avoids groupBy/findFirst with where — which fail on Turso/SQLite
  const hackers = await readDb((db) =>
    db.hacker.findMany({
      orderBy: { totalHits: 'desc' },
      take: 500,
    })
  )

  let years: number[] = [2026]
  let months: number[] = []
  if (yearParam !== 'all') {
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }

  if (mode === 'teams') {
    const teams = new Map<string, { count: number; members: Set<string> }>()
    for (const h of hackers) {
      const team = (h.team || 'INDEPENDENT').trim() || 'INDEPENDENT'
      const entry = teams.get(team) ?? { count: 0, members: new Set<string>() }
      entry.count += h.totalHits
      entry.members.add(h.id)
      teams.set(team, entry)
    }
    const items = [...teams.entries()]
      .map(([team, e]) => ({ team, members: e.members.size, totalHits: e.count, rank: 0 }))
      .sort((a, b) => b.totalHits - a.totalHits)
      .map((t, i) => ({ ...t, rank: i + 1 }))
    return { mode: 'teams', year: yearParam, month: monthParam, years, months, items: items as unknown as LeaderEntry[] }
  }

  const items = hackers.map((h, i) => ({
    id: h.id,
    handle: h.handle,
    team: h.team,
    country: h.country,
    color: h.avatarColor,
    bio: h.bio,
    totalHits: h.totalHits,
    rank: i + 1,
    joinedAt: h.joinedAt.toISOString(),
    badges: [],
  }))

  return { mode: 'defacers', year: yearParam, month: monthParam, years, months, items }
}

// Fetch latest N defacements — NO include (avoid JOIN)
export async function getRecentDefacements(limit: number = 10) {
  const items = await readDb((db) =>
    db.defacement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  )
  const attackerIds = [...new Set(items.map((d) => d.attackerId))]
  const attackers = attackerIds.length > 0
    ? await readDb((db) => db.hacker.findMany({ where: { id: { in: attackerIds } } }))
    : []
  const attackerMap = new Map(attackers.map((a) => [a.id, a]))

  return items.map((d) => {
    const a = attackerMap.get(d.attackerId)
    return {
      id: d.id, targetUrl: d.targetUrl, targetName: d.targetName,
      country: d.country, category: d.category, severity: d.severity,
      status: d.status, note: d.note, poc: d.poc, reason: d.reason,
      mirrorUrl: d.mirrorUrl, isHomepage: d.isHomepage, isMass: d.isMass,
      isRedeface: d.isRedeface, isSpecial: d.isSpecial,
      createdAt: d.createdAt.toISOString(),
      attacker: {
        handle: a?.handle ?? 'unknown', team: a?.team ?? null,
        color: a?.avatarColor ?? '#22c55e', country: a?.country ?? null,
      },
    }
  })
}

export async function getLatestNews(limit: number = 3) {
  return readDb((db) =>
    db.news.findMany({
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
  ).then((items) =>
    items.map((n) => ({
      id: n.id, title: n.title, body: n.body, author: n.author,
      pinned: n.pinned, createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }))
  )
}
