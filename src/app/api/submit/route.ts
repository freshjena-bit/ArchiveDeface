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

    // the attacker handle MUST be a registered defacer in the registry.
    // unknown handles → rejected outright (no auto-registration).
    const hacker = await db.hacker.findUnique({
      where: { handle: String(attacker).trim() },
    })
    if (!hacker) {
      return NextResponse.json(
        {
          ok: false,
          error: `Attacker "${String(attacker).trim()}" is not a registered defacer. Submission rejected.`,
        },
        { status: 400 }
      )
    }

    const cleanPoc = poc?.trim() || null
    const cleanReason = reason?.trim() || null

    // every accepted submission is held for a 10-minute verification window
    // before being promoted to verified (archived). pendingUntil = now + 10m.
    const pendingUntil = new Date(Date.now() + 10 * 60 * 1000)

    // create one record per URL, deriving display metadata + HMRLS marks from each URL
    const created: string[] = []
    const isMass = list.length > 1 // multi-URL submit = mass-deface campaign
    for (const url of list) {
      const meta = deriveMeta(url)
      // H — homepage defaced if the URL has no path (or just "/")
      let isHomepage = true
      try {
        const u = new URL(url)
        isHomepage = u.pathname === '/' || u.pathname === ''
      } catch {
        isHomepage = true
      }
      // R — redeface if this target URL was already archived before
      const prior = await db.defacement.findFirst({
        where: { targetUrl: url },
        select: { id: true },
      })
      const isRedeface = !!prior
      // S — special if it belongs to a special archive (gov / edu / critical)
      const isSpecial =
        meta.category === 'gov' ||
        meta.category === 'edu' ||
        meta.severity === 'critical'

      const record = await db.defacement.create({
        data: {
          targetUrl: url,
          targetName: meta.targetName,
          country: meta.country,
          category: meta.category,
          attackerId: hacker.id,
          poc: cleanPoc,
          reason: cleanReason,
          isHomepage,
          isMass,
          isRedeface,
          isSpecial,
          severity: meta.severity,
          status: 'onhold',
          pendingUntil,
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
      status: 'onhold',
      pendingMinutes: 10,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
