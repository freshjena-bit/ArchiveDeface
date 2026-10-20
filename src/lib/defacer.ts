import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

// Shared defacer fetcher — used by /api/defacer route AND
// server-side page rendering for SEO.
export async function getDefacerData(handle: string) {
  promoteDueOnhold()

  const hacker = await readDb((db) => db.hacker.findUnique({ where: { handle } }))
  if (!hacker) return null

  const where = { attackerId: hacker.id }
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
      db.defacement.findMany({
        where,
        include: { attacker: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])
  })

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
      attacker: {
        handle: d.attacker.handle,
        team: d.attacker.team,
        color: d.attacker.avatarColor,
        country: d.attacker.country,
      },
    })),
  }
}
