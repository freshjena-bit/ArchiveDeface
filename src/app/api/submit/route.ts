import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/submit — submit a defacement report (community submission)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetUrl, targetName, country, category, handle, team, note, severity } = body ?? {}

    if (!targetUrl || !country || !category || !handle) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // upsert hacker by handle
    const hacker = await db.hacker.upsert({
      where: { handle: String(handle) },
      update: { team: team ?? undefined },
      create: {
        handle: String(handle),
        team: team ?? 'INDEPENDENT',
        country: 'ID',
        avatarColor: '#22c55e',
      },
    })

    const record = await db.defacement.create({
      data: {
        targetUrl: String(targetUrl),
        targetName: targetName || targetUrl,
        country: String(country),
        category: String(category),
        attackerId: hacker.id,
        note: note ?? null,
        severity: severity ?? 'medium',
        status: 'archived',
        mirrorUrl: `https://mirror.archive-demo.test/snap-${Math.random().toString(36).slice(2, 10)}`,
      },
      include: { attacker: true },
    })

    // bump hacker counters
    await db.hacker.update({
      where: { id: hacker.id },
      data: { totalHits: { increment: 1 } },
    })

    return NextResponse.json({
      ok: true,
      id: record.id,
      createdAt: record.createdAt.toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
