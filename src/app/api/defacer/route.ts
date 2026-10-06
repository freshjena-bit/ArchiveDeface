import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { promoteDueOnhold } from '@/lib/promote'

export const dynamic = 'force-dynamic'

// GET /api/defacer?handle=n0vakane
// Returns the defacer profile + count breakdown + their defacements.
export async function GET(req: NextRequest) {
  const db = await getDb()
  await promoteDueOnhold()
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')?.trim()

  if (!handle) {
    return NextResponse.json({ ok: false, error: 'Missing handle' }, { status: 400 })
  }

  const hacker = await db.hacker.findUnique({ where: { handle } })
  if (!hacker) {
    return NextResponse.json({ ok: false, error: 'Defacer not found' }, { status: 404 })
  }

  const where = { attackerId: hacker.id }

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
  ] = await Promise.all([
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

  return NextResponse.json({
    ok: true,
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
  })
}
