import { NextResponse } from 'next/server'
import { getStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

// GET /api/stats — dashboard summary + 14-day timeseries + category breakdown
export async function GET() {
  const stats = await getStats()
  return NextResponse.json(stats)
}
