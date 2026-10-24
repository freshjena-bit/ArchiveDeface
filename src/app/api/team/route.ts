import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET /api/team?name=PHANTOM%20CREW
// Returns the team profile + count breakdown + members + their defacements.
//
// Uses SEQUENTIAL queries (not Promise.all) to avoid connection pool
// contention when connection_limit=1 (PgBouncer transaction mode).
// Each count() is ~100-500ms with index on attackerId, total ~1-3s.
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

    // Build attacker lookup map from members (avoid JOIN).
    const attackerMap = new Map(members.map((m) => [m.id, m]))

    // SINGLE aggregate query — replaces 8 separate count() queries.
    // Postgres FILTER (WHERE ...) + ANY($1) for attackerId IN (...).
    // Total: 2 DB queries (1 aggregate + 1 findMany) instead of 10.
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
        WHERE "attackerId" = ANY($1::text[])
      `, ids)
      const r = rows[0] ?? {}
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

    return cached({
      ok: true,
      team: {
        name,
        members: members.length,
        totalHits: statsResult.total,
      },
      memberList: members.map((m) => ({
        handle: m.handle,
        country: m.country,
        color: m.avatarColor,
        totalHits: m.totalHits,
      })),
      counts: {
        total: statsResult.total,
        special: statsResult.special,
        onhold: statsResult.onhold,
        archived: statsResult.archived,
        restored: statsResult.restored,
        mass: statsResult.mass,
        redeface: statsResult.redeface,
        homepage: statsResult.homepage,
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
