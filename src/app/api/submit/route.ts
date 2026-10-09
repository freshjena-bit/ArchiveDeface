import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deriveMeta, getHostname } from '@/lib/site'
import { resolvePage } from '@/lib/page'

export const dynamic = 'force-dynamic'
// Vercel serverless timeout — 500 URLs × page fetch (5s timeout parallel) +
// DB ops. Default 10s gak cukup. 60s aman buat ~200-500 URLs parallel fetch.
export const maxDuration = 60

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
    if (list.length > 500) {
      return NextResponse.json(
        { ok: false, error: 'Too many URLs in one submission (max 500)' },
        { status: 400 }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // Duplicate-domain check (across archive / onhold / special)
    //
    // If the submitted URL's hostname already exists in the DB (any status),
    // reject with 409 Conflict.
    //
    // Same hostname == duplicate. Subdomains are different hostnames, so
    // they are allowed:
    //   test.com archived       → reject test.com      (duplicate)
    //   test.com archived       → allow  portal.test.com (subdomain, different host)
    //   test.com archived       → allow  test.org        (different domain)
    //   www.test.com archived   → reject test.com      (www. stripped, same host)
    // ─────────────────────────────────────────────────────────────
    const submittedHosts = Array.from(
      new Set(list.map((u) => getHostname(u)).filter(Boolean))
    )
    if (submittedHosts.length > 0) {
      // Broad filter: only fetch candidates whose targetUrl contains one of
      // the submitted hostnames. (targetUrl is stored as full URL, so we
      // post-filter for exact hostname match below.)
      const candidates = await db.defacement.findMany({
        where: {
          OR: submittedHosts.map((h) => ({ targetUrl: { contains: h } })),
        },
        select: { targetUrl: true },
      })
      const existingHosts = new Set(
        candidates.map((c) => getHostname(c.targetUrl)).filter(Boolean)
      )
      const duplicates = submittedHosts.filter((h) => existingHosts.has(h))
      if (duplicates.length > 0) {
        const sample = duplicates[0]
        return NextResponse.json(
          {
            ok: false,
            error: `Domain already archived: ${duplicates.join(', ')}. Submit a subdomain (e.g. portal.${sample}) or a different domain.`,
            duplicates,
          },
          { status: 409 }
        )
      }
    }

    // anyone can submit — the attacker handle is auto-registered if new.
    const ownHandleRaw = String(attacker).trim()
    const hacker = await db.hacker.upsert({
      where: { handle: ownHandleRaw },
      update: { team: team?.trim() || undefined },
      create: {
        handle: ownHandleRaw,
        team: team?.trim() || 'INDEPENDENT',
        country: 'ID',
        avatarColor: '#22c55e',
      },
    })

    const cleanPoc = poc?.trim() || null
    const cleanReason = reason?.trim() || null

    // the system FETCHES each target page and scans its content for an attacker's
    // signature (defacement activity), not the URL string.
    const ownHandle = ownHandleRaw.toLowerCase()
    const allHackers = await db.hacker.findMany({ select: { handle: true } })
    const lowerHandles = allHackers.map((h) => h.handle.toLowerCase()).filter(Boolean)

    // resolve every target page in parallel (real fetch with 5s timeout;
    // fictional demo URLs fall back to a simulated page)
    const pages = await Promise.all(list.map((u) => resolvePage(u)))

    // pre-validate each page:
    //  - unreachable (real URL that couldn't be fetched) → reject
    //  - no defacement activity (no registered handle on the page) → reject
    for (let i = 0; i < list.length; i++) {
      const url = list[i]
      const page = pages[i]
      if (!page.reachable) {
        return NextResponse.json(
          { ok: false, error: page.reason || `URL cannot be accessed: ${url}` },
          { status: 400 }
        )
      }
      const content = page.content.toLowerCase()
      const found = lowerHandles.some((h) => content.includes(h))
      if (!found) {
        return NextResponse.json(
          {
            ok: false,
            error: `No defacement activity (no attacker name) found on the page. Rejected: ${url}`,
          },
          { status: 400 }
        )
      }
    }

    // every accepted submission starts on hold.
    // - page contains the submitter's OWN handle → held 10 min, then auto-verified.
    // - page contains a DIFFERENT registered handle → held indefinitely (needs review).
    const ownPending = new Date(Date.now() + 10 * 60 * 1000)

    // create one record per URL, deriving display metadata + HMRLS marks from each URL
    const created: string[] = []
    let ownName = 0
    let otherName = 0
    const isMass = list.length > 1 // multi-URL submit = mass-deface campaign
    for (let i = 0; i < list.length; i++) {
      const url = list[i]
      const page = pages[i]
      const meta = deriveMeta(url)
      // H — homepage defaced only when the URL targets the root (no path)
      const isHomepage = meta.isHomepage
      // R — redeface if this target URL was already archived before
      const prior = await db.defacement.findFirst({
        where: { targetUrl: url },
        select: { id: true },
      })
      const isRedeface = !!prior
      // S — special if the domain matches a special-archive pattern
      // (*.gov.* / *.go.* / *.ac.* / *.edu.*) — NOT severity-based.
      const isSpecial = meta.specialDomain !== null

      // does the PAGE contain the submitter's own handle?
      const hasOwn = page.content.toLowerCase().includes(ownHandle)
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
          mirrorUrl: `https://mirror.archive.test/snap-${Math.random().toString(36).slice(2, 10)}`,
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
