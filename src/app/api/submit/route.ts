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

    // fetch every registered handle so we can scan each target URL for one.
    // the target URL must contain a registered attacker's name (the signature
    // left on the defaced page). no name → reject outright.
    const ownHandle = String(attacker).trim().toLowerCase()
    const allHackers = await db.hacker.findMany({ select: { handle: true } })
    const handles = allHackers.map((h) => h.handle).filter(Boolean)
    const lowerHandles = handles.map((h) => h.toLowerCase())

    // pre-validate: each URL must contain at least one registered handle
    for (const url of list) {
      const u = url.toLowerCase()
      const found = lowerHandles.some((h) => u.includes(h))
      if (!found) {
        return NextResponse.json(
          {
            ok: false,
            error: `Target URL must contain a registered attacker's name. Rejected: ${url}`,
          },
          { status: 400 }
        )
      }
    }

    // every accepted submission starts on hold.
    // - URL contains the submitter's OWN handle → held 10 min, then auto-verified.
    // - URL contains a DIFFERENT registered handle → held indefinitely (needs review).
    const ownPending = new Date(Date.now() + 10 * 60 * 1000)

    // create one record per URL, deriving display metadata + HMRLS marks from each URL
    const created: string[] = []
    let ownName = 0
    let otherName = 0
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

      // does the URL contain the submitter's own handle?
      const hasOwn = url.toLowerCase().includes(ownHandle)
      const recordPending = hasOwn ? ownPending : null
      if (hasOwn) ownName += 1
      else otherName += 1

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
          pendingUntil: recordPending,
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
      ownName,
      otherName,
      pendingMinutes: 10,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
