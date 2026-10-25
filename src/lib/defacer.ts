import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

// Shared defacer fetcher — used by /api/defacer route AND
// server-side page rendering for SEO.
//
// OPTIMIZED: uses single SQL aggregate query instead of 8 separate
// count() queries. Reduces 10 DB queries to 2 (1 aggregate + 1 findMany).
// With index on attackerId, total ~200-300ms instead of 5-10s.
export async function getDefacerData(handle: string) {
  try {
    promoteDueOnhold()

    const hacker = await readDb((db) =>
      db.hacker.findUnique({ where: { handle } })
    )
    if (!hacker) return null

    const where = { attackerId: hacker.id }

    // SINGLE aggregate query — replaces 8 separate count() queries.
    // Postgres FILTER (WHERE ...) does conditional aggregation in 1 pass.
    // With index on attackerId, this scans only the matching rows (~360K
    // for GadaLuBau, but index seek makes it ~100-200ms).
    const statsResult = await readDb(async (db) => {
      const rows = await db.$queryRawUnsafe<{
        total: bigint
        special: bigint
        onhold: bigint
        archived: bigint
        restored: bigint
        mass: bigint
        redeface: bigint
        homepage: bigint
      }[]>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE "isSpecial" = true) as special,
          COUNT(*) FILTER (WHERE status = 'onhold') as onhold,
          COUNT(*) FILTER (WHERE status = 'archived') as archived,
          COUNT(*) FILTER (WHERE status = 'restored') as restored,
          COUNT(*) FILTER (WHERE "isMass" = true) as mass,
          COUNT(*) FILTER (WHERE "isRedeface" = true) as redeface,
          COUNT(*) FILTER (WHERE "isHomepage" = true) as homepage
        FROM "Defacement"
        WHERE "attackerId" = $1
      `, hacker.id)
      const r = rows[0] ?? {}
      // Convert bigint to number (Postgres COUNT returns bigint)
      return {
        total: Number(r.total ?? 0),
        special: Number(r.special ?? 0),
        onhold: Number(r.onhold ?? 0),
        archived: Number(r.archived ?? 0),
        restored: Number(r.restored ?? 0),
        mass: Number(r.mass ?? 0),
        redeface: Number(r.redeface ?? 0),
        homepage: Number(r.homepage ?? 0),
      }
    })

    // Fetch recent items (single query, no JOIN)
    const items = await readDb((db) =>
      db.defacement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          targetUrl: true,
          targetName: true,
          country: true,
          category: true,
          severity: true,
          status: true,
          note: true,
          poc: true,
          reason: true,
          mirrorUrl: true,
          isHomepage: true,
          isMass: true,
          isRedeface: true,
          isSpecial: true,
          createdAt: true,
          attackerId: true,
        },
      })
    )

    return {
      ok: true as const,
      hacker: {
        id: hacker.id,
        handle: hacker.handle,
        team: hacker.team,
        country: hacker.country,
        color: hacker.avatarColor,
        bio: hacker.bio,
        joinedAt: hacker.joinedAt.toISOString(),
        totalHits: hacker.totalHits,
        tags: JSON.parse(hacker.tags || '[]') as string[],
      },
      counts: statsResult,
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
          handle: hacker.handle,
          team: hacker.team,
          color: hacker.avatarColor,
          country: hacker.country,
        },
      })),
    }
  } catch (e) {
    console.error('[getDefacerData] failed for handle:', handle, e)
    return null
  }
}
