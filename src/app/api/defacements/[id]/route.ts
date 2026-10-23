import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/db'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET /api/defacements/{id} — single defacement record with attacker info.
// Used by the per-incident detail page (/defacement/[id]).
//
// FIX vs old: removed `include: { attacker: true }` JOIN — fetch attacker
// separately. Also added try/catch + cached() for CDN caching.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch defacement WITHOUT JOIN
    const d = await readDb((db) =>
      db.defacement.findUnique({
        where: { id },
      })
    )

    if (!d) {
      return NextResponse.json(
        { ok: false, error: 'Record not found' },
        { status: 404 }
      )
    }

    // Fetch attacker separately (avoid JOIN)
    const attacker = await readDb((db) =>
      db.hacker.findUnique({
        where: { id: d.attackerId },
        select: {
          id: true,
          handle: true,
          team: true,
          avatarColor: true,
          country: true,
        },
      })
    )

    return cached({
      ok: true,
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
      pendingUntil: d.pendingUntil?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      attacker: attacker
        ? {
            id: attacker.id,
            handle: attacker.handle,
            team: attacker.team,
            color: attacker.avatarColor,
            country: attacker.country,
          }
        : null,
    }, { sMaxAgeSec: 3600, swrSec: 86400 }) // 1h cache, 24h stale-while-revalidate
  } catch (e) {
    console.error('[/api/defacements/[id]] error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
