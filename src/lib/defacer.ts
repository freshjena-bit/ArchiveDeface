import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

// Shared defacer fetcher — used by /api/defacer route AND
// server-side page rendering for SEO.
//
// Uses SEQUENTIAL queries (not Promise.all) to avoid connection pool
// contention when connection_limit=1 (PgBouncer transaction mode).
// Also wraps in try/catch — returns null on error instead of throwing
// (which caused empty API responses before).
export async function getDefacerData(handle: string) {
  try {
    promoteDueOnhold()

    const hacker = await readDb((db) =>
      db.hacker.findUnique({ where: { handle } })
    )
    if (!hacker) return null

    const where = { attackerId: hacker.id }

    // Sequential queries — no Promise.all.
    // Each count() uses index on attackerId, ~100-500ms each.
    // Total ~1-3s for all 8 counts + 1 findMany.
    const total = await readDb((db) => db.defacement.count({ where }))
    const special = await readDb((db) => db.defacement.count({ where: { ...where, isSpecial: true } }))
    const onhold = await readDb((db) => db.defacement.count({ where: { ...where, status: 'onhold' } }))
    const archived = await readDb((db) => db.defacement.count({ where: { ...where, status: 'archived' } }))
    const restored = await readDb((db) => db.defacement.count({ where: { ...where, status: 'restored' } }))
    const mass = await readDb((db) => db.defacement.count({ where: { ...where, isMass: true } }))
    const redeface = await readDb((db) => db.defacement.count({ where: { ...where, isRedeface: true } }))
    const homepage = await readDb((db) => db.defacement.count({ where: { ...where, isHomepage: true } }))

    // NO `include: { attacker: true }` JOIN — use already-fetched hacker.
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
      },
      counts: { total, special, onhold, archived, restored, mass, redeface, homepage },
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
        // Attacker info from the hacker we already fetched (no JOIN needed)
        attacker: {
          handle: hacker.handle,
          team: hacker.team,
          color: hacker.avatarColor,
          country: hacker.country,
        },
      })),
    }
  } catch (e) {
    // Log and return null — caller shows "not found" instead of crashing.
    console.error('[getDefacerData] failed for handle:', handle, e)
    return null
  }
}
