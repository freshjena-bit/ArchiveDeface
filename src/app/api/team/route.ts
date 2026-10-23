import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET /api/team?name=PHANTOM%20CREW
// Returns the team profile + count breakdown + members + their defacements.
export async function GET(req: NextRequest) {
  try {
    promoteDueOnhold()
    const { searchParams } = new URL(req.url)
    const name = searchParams.get('name')?.trim()

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Missing team name' }, { status: 400 })
    }

    const members = await readDb((db) =>
      db.hacker.findMany({
        where: { team: name },
        orderBy: { totalHits: 'desc' },
      })
    )

    if (!members.length) {
      return NextResponse.json({ ok: false, error: 'Team not found' }, { status: 404 })
    }

    const ids = members.map((m) => m.id)
    const where = { attackerId: { in: ids } }

    // Build a map of attacker info from members (avoid JOIN).
    const attackerMap = new Map(members.map((m) => [m.id, m]))

    const [
      total,
      special,
      onhold,
      archived,
      restored,
      mass,
      redeface,
      homepage,
      items,
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
        // NO `include: { attacker: true }` JOIN — use separate attacker lookup.
        // The items belong to attackers in `members`, which we already have.
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

    return cached({
      ok: true,
      team: {
        name,
        members: members.length,
        totalHits: total,
      },
      memberList: members.map((m) => ({
        handle: m.handle,
        country: m.country,
        color: m.avatarColor,
        totalHits: m.totalHits,
      })),
      counts: {
        total,
        special,
        onhold,
        archived,
        restored,
        mass,
        redeface,
        homepage,
      },
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
    }, { sMaxAgeSec: 300, swrSec: 600 })
  } catch (e) {
    console.error('[/api/team] error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
