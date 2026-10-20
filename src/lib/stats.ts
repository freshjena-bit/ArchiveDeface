import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import type { Stats } from '@/lib/types'

// Shared stats fetcher — used by both /api/stats route AND server-side
// page rendering (so the initial HTML contains real numbers, not "000").
export async function getStats(): Promise<Stats> {
  promoteDueOnhold()

  const totalDefacements = await readDb((db) => db.defacement.count())
  const totalAttackers = await readDb((db) => db.hacker.count())
  const distinctCountries = await readDb((db) =>
    db.defacement.findMany({
      distinct: ['country'],
      select: { country: true },
    })
  )

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayCount = await readDb((db) =>
    db.defacement.count({
      where: { createdAt: { gte: startOfToday } },
    })
  )

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthCount = await readDb((db) =>
    db.defacement.count({
      where: { createdAt: { gte: monthStart } },
    })
  )

  // 14-day timeseries
  const days: { date: string; count: number }[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - i)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const count = await readDb((db) =>
      db.defacement.count({
        where: { createdAt: { gte: start, lt: end } },
      })
    )
    days.push({ date: start.toISOString().slice(0, 10), count })
  }

  // category + country breakdown
  const all = await readDb((db) =>
    db.defacement.findMany({ select: { category: true, country: true } })
  )
  const byCategory: Record<string, number> = {}
  const byCountry: Record<string, number> = {}
  for (const r of all) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
    byCountry[r.country] = (byCountry[r.country] ?? 0) + 1
  }
  const categories = Object.entries(byCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const countries = Object.entries(byCountry)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)

  return {
    counters: {
      totalDefacements,
      totalAttackers,
      totalCountries: distinctCountries.length,
      todayAttacks: todayCount,
      thisMonth: monthCount,
    },
    timeseries: days,
    categories,
    countries,
  }
}
