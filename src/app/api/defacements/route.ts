import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/defacements?limit=20&offset=0&country=&category=&q=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const offset = Number(searchParams.get('offset') ?? 0)
  const country = searchParams.get('country') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const q = searchParams.get('q') ?? undefined

  const where: Record<string, unknown> = {}
  if (country) where.country = country
  if (category) where.category = category
  if (q) {
    where.OR = [
      { targetName: { contains: q } },
      { targetUrl: { contains: q } },
      { note: { contains: q } },
    ]
  }

  const [items, total] = await Promise.all([
    db.defacement.findMany({
      where,
      include: { attacker: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.defacement.count({ where }),
  ])

  return NextResponse.json({
    items: items.map((d) => ({
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
      createdAt: d.createdAt.toISOString(),
      attacker: {
        handle: d.attacker.handle,
        team: d.attacker.team,
        color: d.attacker.avatarColor,
        country: d.attacker.country,
      },
    })),
    total,
    limit,
    offset,
  })
}
