import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

export const dynamic = 'force-dynamic'

// GET /api/defacements?limit=20&offset=0&country=&category=&q=&special=&onhold=
// `special` maps a named special archive to a where-clause:
//   all  → everything flagged special (isSpecial=true)
//   gov  → category = gov
//   edu  → category = edu
//   goid → category = gov AND country = ID (Government of Indonesia)
//   acid → severity = critical (special critical-incidents archive)
// `onhold`:
//   true → only on-hold records (pending verification)
//   else → verified records only (exclude on-hold: archived / restored)
export async function GET(req: NextRequest) {
  await promoteDueOnhold()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const offset = Number(searchParams.get('offset') ?? 0)
  const country = searchParams.get('country') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const special = searchParams.get('special') ?? undefined
  const onhold = searchParams.get('onhold')

  const where: Record<string, unknown> = {}
  if (country) where.country = country
  if (category) where.category = category
  if (q) {
    where.OR = [
      { targetName: { contains: q } },
      { targetUrl: { contains: q } },
      { note: { contains: q } },
      { poc: { contains: q } },
      { reason: { contains: q } },
    ]
  }
  // onhold vs verified filter
  if (onhold === 'true') {
    where.status = 'onhold'
  } else {
    // default: only verified records (exclude on-hold)
    where.status = { not: 'onhold' }
  }

  if (special) {
    switch (special) {
      case 'gov':
        where.category = 'gov'
        break
      case 'edu':
        where.category = 'edu'
        break
      case 'goid':
        where.category = 'gov'
        where.country = 'ID'
        break
      case 'acid':
      case 'all':
      default:
        // special archive "ALL" = every record whose domain matches a
        // special-archive pattern (gov / go / ac / edu) → isSpecial flag.
        where.isSpecial = true
        break
    }
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
    })),
    total,
    limit,
    offset,
  })
}
