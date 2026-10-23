import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

// Shared defacer fetcher — used by /api/defacer route AND
// server-side page rendering for SEO.
//
// FIX vs old version: removed `include: { attacker: true }` JOIN
// (which was causing failures). Now uses separate query for attacker
// info. Also added try/catch so the function returns null on error
// instead of throwing (which caused empty API responses).
export async function getDefacerData(handle: string) {
  try {
    promoteDueOnhold()

    const hacker = await readDb((db) =>
      db.hacker.findUnique({ where: { handle } })
    )
    if (!hacker) return null

    const where = { attackerId: hacker.id }

    // Run all count queries in parallel — they each scan the table.
    // On 360K-row Defacement this is ~2.4M row reads total, but with
    // the Stat-table cache layer (see src/lib/cache.ts), these are
    // cached per-key.
    const [
      total, special, onhold, archived, restored, mass, redeface, homepage, items,
    ] = await readDb(async (db) => {
      return await Promise.all([
        db.defacement.count({ where }),
        db.defacement.count({ where: { ...where, isSpecial: true } }),
        db.defacement.count({ where: { ...where, status: 'onhold' } }),
        db.defacement.count({ where: { ...where, status: 'archived' } }),
        db.defacement.count({ where: { ...where, status: 'restored' } }),
        db.defacement.count({ where: { ...where, isMass: true } }),
        db.defacement.count({ where: { ...where, isRedeface: true } }),
        db.defacement.count({ where: { ...where, isHomepage: true } }),
        // NO `include: { attacker: true }` — use separate query instead.
        // (Previously caused failures; JOIN may also have issues with
        // PgBouncer transaction mode.)
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
        }),
      ])
    })

    // Get attacker info separately (avoid JOIN).
    // All items belong to the same attacker (the hacker we already have).
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
    // Log and return null — caller can show "not found" instead of crashing.
    console.error('[getDefacerData] failed for handle:', handle, e)
    return null
  }
}
