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

  // GROUP BY via raw SQL — more reliable with SQLite/Turso
  let dateFilter = ''
  if (yearParam !== 'all') {
    const y = parseInt(yearParam, 10)
    if (!Number.isNaN(y)) {
      if (monthParam !== 'all') {
        const m = parseInt(monthParam, 10)
        if (!Number.isNaN(m) && m >= 1 && m <= 12) {
          dateFilter = `AND "createdAt" >= '${y}-${String(m).padStart(2,'0')}-01' AND "createdAt" < '${y}-${String(m+1).padStart(2,'0')}-01'`
        }
      } else {
        dateFilter = `AND "createdAt" >= '${y}-01-01' AND "createdAt" < '${y+1}-01-01'`
      }
    }
  }

  const grouped = await readDb(async (db) =>
    db.$queryRawUnsafe(`
      SELECT "attackerId" as attackerId, COUNT(*) as count
      FROM "Defacement"
      WHERE "status" != 'onhold' ${dateFilter}
      GROUP BY "attackerId"
      ORDER BY count DESC
    `)
  ) as { attackerId: string; count: number }[]

  // Fetch hacker details
  const attackerIds = grouped.map((g) => g.attackerId)
  const hackers = attackerIds.length > 0
    ? await readDb((db) =>
        db.hacker.findMany({
          where: { id: { in: attackerIds } },
          select: {
            id: true, handle: true, team: true, country: true,
            avatarColor: true, bio: true, joinedAt: true,
          },
        })
      )
    : []

  const hackerMap = new Map(hackers.map((h) => [h.id, h]))

  // Years: get oldest + newest
  let years: number[] = []
  try {
    const oldest = await readDb((db) =>
      db.defacement.findFirst({
        where: { status: { not: 'onhold' } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      })
    )
    const newest = await readDb((db) =>
      db.defacement.findFirst({
        where: { status: { not: 'onhold' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
    )
    if (oldest && newest) {
      const sY = oldest.createdAt.getFullYear()
      const eY = newest.createdAt.getFullYear()
      for (let y = eY; y >= sY; y--) years.push(y)
    }
  } catch {}

  let months: number[] = []
  if (yearParam !== 'all') {
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }

  // Teams mode
  if (mode === 'teams') {
    const teams = new Map<string, { count: number; members: Set<string> }>()
    for (const g of grouped) {
      const h = hackerMap.get(g.attackerId)
      const team = (h?.team || 'INDEPENDENT').trim() || 'INDEPENDENT'
      const entry = teams.get(team) ?? { count: 0, members: new Set<string>() }
      entry.count += g.count
      entry.members.add(g.attackerId)
      teams.set(team, entry)
    }
    const items = [...teams.entries()]
      .map(([team, e]) => ({ team, members: e.members.size, totalHits: e.count, rank: 0 }))
      .sort((a, b) => b.totalHits - a.totalHits)
      .map((t, i) => ({ ...t, rank: i + 1 }))

    return { mode: 'teams', year: yearParam, month: monthParam, years, months, items: items as unknown as LeaderEntry[] }
  }

  // Defacers mode
  const items = grouped
    .map((g) => {
      const h = hackerMap.get(g.attackerId)
      if (!h) return null
      return {
        id: h.id,
        handle: h.handle,
        team: h.team,
        country: h.country,
        color: h.avatarColor,
        bio: h.bio,
        totalHits: g.count,
        rank: 0,
        joinedAt: h.joinedAt.toISOString(),
        badges: [] as string[],
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
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
