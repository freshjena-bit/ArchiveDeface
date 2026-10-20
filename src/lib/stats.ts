import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import { getCachedInt, getCachedBreakdown } from '@/lib/cache'
import type { Stats } from '@/lib/types'

/**
 * Optimized stats fetcher with Stat-table caching.
 *
 * Before this, every /api/stats call scanned the 319K-row Defacement
 * table ~20 times (count + 14x daily count + 2x groupBy) = ~7M row reads.
 *
 * Now: first call computes everything and caches each piece in the Stat
 * table; subsequent calls within TTL are ~30 row reads total.
 *
 * The CDN edge cache (Cache-Control: s-maxage=300 in the route) is the
 * primary defense; this Stat-table cache is the secondary defense for
 * CDN-miss requests.
 */
export async function getStats(): Promise<Stats> {
  promoteDueOnhold()

  // ─── Scalar counts (cached individually) ────────────────────────────
  const totalDefacements = await getCachedInt('totalDefacements', () =>
    readDb((db) => db.defacement.count())
  )

  const totalAttackers = await getCachedInt(
    'totalAttackers',
    () => readDb((db) => db.hacker.count()),
    1800 // 30 min — hackers rarely change
  )

  // todayAttacks + thisMonth are computed against a rolling reference date.
  // Cache them with a 60s TTL so they stay accurate without hammering the DB.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayAttacks = await getCachedInt(
    'todayAttacks',
    () => readDb((db) => db.defacement.count({ where: { createdAt: { gte: startOfToday } } })),
    60 // 1 min — keep fresh for "today" counter
  )

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = await getCachedInt(
    'thisMonth',
    () => readDb((db) => db.defacement.count({ where: { createdAt: { gte: monthStart } } })),
    300 // 5 min
  )

  // ─── 14-day timeseries (cached per day) ─────────────────────────────
  // Each day is a separate cache key: `daily:YYYY-MM-DD`.
  // Past days never change after the day ends, so we cache them for 24h.
  // Today's count is cached for 60s.
  const now = new Date()
  const days: { date: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - i)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const dateKey = start.toISOString().slice(0, 10)
    const isToday = i === 0
    const ttl = isToday ? 60 : 86400 // today: 1min | past days: 24h
    const count = await getCachedInt(
      `daily:${dateKey}`,
      () =>
        readDb((db) =>
          db.defacement.count({ where: { createdAt: { gte: start, lt: end } } })
        ),
      ttl
    )
    days.push({ date: dateKey, count })
  }

  // ─── Category + Country breakdowns (cached as groups) ──────────────
  // groupBy scans the whole table (~319K reads), so cache the result.
  const categoryGroups = await getCachedBreakdown(
    'cat:',
    () =>
      readDb((db) =>
        db.defacement.groupBy({ by: ['category'], _count: { _all: true } })
      ).then((gs) => gs.map((g) => ({ key: g.category, count: g._count._all }))),
    600 // 10 min
  )
  const categories = categoryGroups
    .map((g) => ({ name: g.key, count: g.count }))
    .sort((a, b) => b.count - a.count)

  const countryGroups = await getCachedBreakdown(
    'country:',
    () =>
      readDb((db) =>
        db.defacement.groupBy({ by: ['country'], _count: { _all: true } })
      ).then((gs) => gs.map((g) => ({ key: g.country, count: g._count._all }))),
    600
  )
  const countries = countryGroups
    .map((g) => ({ code: g.key, count: g.count }))
    .sort((a, b) => b.count - a.count)

  return {
    counters: {
      totalDefacements,
      totalAttackers,
      totalCountries: countries.length,
      todayAttacks,
      thisMonth,
    },
    timeseries: days,
    categories,
    countries,
  }
}
