import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/stats — dashboard summary + 14-day timeseries + category breakdown
export async function GET() {
  const stats = await db.stat.findMany()
  const statMap = Object.fromEntries(stats.map((s) => [s.key, s.value]))

  const totalDefacements = await db.defacement.count()
  const totalAttackers = await db.hacker.count()
  const distinctCountries = await db.defacement.findMany({
    distinct: ['country'],
    select: { country: true },
  })

  // 14-day timeseries
  const days: { date: string; count: number }[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - i)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const count = await db.defacement.count({
      where: { createdAt: { gte: start, lt: end } },
    })
    days.push({ date: start.toISOString().slice(0, 10), count })
  }

  // category breakdown
  const all = await db.defacement.findMany({ select: { category: true, country: true } })
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

  return NextResponse.json({
    counters: {
      totalDefacements,
      totalAttackers,
      totalCountries: distinctCountries.length,
      todayAttacks: statMap['today_attacks'] ?? 0,
    },
    timeseries: days,
    categories,
    countries,
  })
}
