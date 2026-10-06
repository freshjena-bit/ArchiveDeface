import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/team?name=PHANTOM%20CREW
// Returns the team profile + count breakdown + members + their defacements.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim()

  if (!name) {
    return NextResponse.json({ ok: false, error: 'Missing team name' }, { status: 400 })
  }

  const members = await db.hacker.findMany({
    where: { team: name },
    orderBy: { totalHits: 'desc' },
  })

  if (!members.length) {
    return NextResponse.json({ ok: false, error: 'Team not found' }, { status: 404 })
  }

  const ids = members.map((m) => m.id)
  const where = { attackerId: { in: ids } }

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
