import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deriveMeta } from '@/lib/site'

export const dynamic = 'force-dynamic'

// POST /api/submit
// Body: { urls: string, attacker: string, team?: string, poc?: string, reason?: string }
// `urls` is a newline-separated list — one defacement record is created per URL.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { urls, attacker, team, poc, reason } = body ?? {}

    if (!urls || typeof urls !== 'string' || !urls.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing target URLs' },
        { status: 400 }
      )
    }
    if (!attacker || typeof attacker !== 'string' || !attacker.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Missing attacker handle' },
        { status: 400 }
      )
    }

    // parse URLs (one per line, ignore blanks / duplicates)
    const list = Array.from(
      new Set(
        String(urls)
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    )

    if (list.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid URLs found' },
        { status: 400 }
      )
    }
    if (list.length > 50) {
      return NextResponse.json(
        { ok: false, error: 'Too many URLs in one submission (max 50)' },
        { status: 400 }
      )
    }

    // upsert hacker by handle
    const hacker = await db.hacker.upsert({
      where: { handle: String(attacker).trim() },
      update: { team: team?.trim() || undefined },
      create: {
        handle: String(attacker).trim(),
        team: team?.trim() || 'INDEPENDENT',
        country: 'ID',
        avatarColor: '#22c55e',
      },
    })

    const cleanPoc = poc?.trim() || null
    const cleanReason = reason?.trim() || null

    // create one record per URL, deriving display metadata from each URL
    const created: string[] = []
    for (const url of list) {
      const meta = deriveMeta(url)
      const record = await db.defacement.create({
        data: {
          targetUrl: url,
          targetName: meta.targetName,
          country: meta.country,
          category: meta.category,
          attackerId: hacker.id,
          poc: cleanPoc,
          reason: cleanReason,
          severity: meta.severity,
          status: 'archived',
          mirrorUrl: `https://mirror.archive-demo.test/snap-${Math.random().toString(36).slice(2, 10)}`,
        },
      })
      created.push(record.id)
    }

    // bump hacker counters by the number of records created
    await db.hacker.update({
      where: { id: hacker.id },
      data: { totalHits: { increment: list.length } },
    })

    return NextResponse.json({
      ok: true,
      created: created.length,
      ids: created,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
