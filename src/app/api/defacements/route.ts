import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import { cached, getCachedInt } from '@/lib/cache'

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
  promoteDueOnhold()
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
  // Note: Turso/SQLite doesn't support { not: 'onhold' } — use { in: [...] } instead
  if (onhold === 'true') {
    where.status = 'onhold'
  } else {
    // default: only verified records (exclude on-hold)
    where.status = { in: ['archived', 'restored', 'live'] }
  }

  // Days filter: only show records from last N days.
  // Used by main archive page (days=7) so it only shows recent incidents.
  // Special archive and onhold views don't pass `days` → show all.
  // Home-recent + live-ticker also don't pass `days` → show all.
  const days = searchParams.get('days')
  if (days && !special) {
    const d = parseInt(days, 10)
    if (!Number.isNaN(d) && d > 0) {
      const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000)
      where.createdAt = { gte: cutoff }
    }
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

  // Sequential queries (SQLite/Turso doesn't support JOIN well via adapter)
  const items = await readDb((db) =>
    db.defacement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
  )

  // Total count: cached per "shape" of the where-clause.
  // The `total` is used for pagination ("page X of Y"). For the unfiltered
  // default, we cache the full-table count under a stable key; for any
  // filtered variant, fall back to a direct count() — but the CDN cache
  // (s-maxage=60) ensures the same filtered URL only hits DB once per min.
  const whereKeys = Object.keys(where).sort()
  const isUnfiltered =
    whereKeys.length === 1 && whereKeys[0] === 'status'
  let total: number
  if (isUnfiltered) {
    // Unfiltered (only the default status filter) — use the cached total
    total = await getCachedInt(
      'defacements:totalVerified',
      () => readDb((db) => db.defacement.count({ where })),
      300 // 5 min
    )
  } else {
    total = await readDb((db) => db.defacement.count({ where }))
  }

  // Get attacker info separately (avoid JOIN/include)
  const attackerIds = [...new Set(items.map((d) => d.attackerId))]
  const attackers = attackerIds.length > 0
    ? await readDb((db) =>
        db.hacker.findMany({
          where: { id: { in: attackerIds } },
        })
      )
    : []
  const attackerMap = new Map(attackers.map((a) => [a.id, a]))

  return cached({
    items: items.map((d) => {
      const a = attackerMap.get(d.attackerId)
      return {
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
          handle: a?.handle ?? 'unknown',
          team: a?.team ?? null,
          color: a?.avatarColor ?? '#22c55e',
          country: a?.country ?? null,
        },
      }
    }),
    total,
    limit,
    offset,
  }, { sMaxAgeSec: 60, swrSec: 300 }) // 1 min cache, 5 min stale-while-revalidate
}
