import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/defacements/{id} — single defacement record with attacker info.
// Used by the per-incident detail page (/defacement/[id]).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const d = await db.defacement.findUnique({
    where: { id },
    include: { attacker: true },
  })

  if (!d) {
    return NextResponse.json(
      { ok: false, error: 'Record not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
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
    attacker: {
      id: d.attacker.id,
      handle: d.attacker.handle,
      team: d.attacker.team,
      color: d.attacker.avatarColor,
      country: d.attacker.country,
    },
  })
}
