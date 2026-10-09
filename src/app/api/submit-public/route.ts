import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deriveMeta, getHostname } from '@/lib/site'

export const dynamic = 'force-dynamic'
// Vercel serverless function timeout — default 10s gak cukup buat bulk DB ops.
// 60s cukup buat ~200-300 incident per request. Kalau mau lebih, chunk di client.
export const maxDuration = 60

interface IncomingIncident {
  targetUrl: string
  attacker: string
  team?: string
  poc?: string
  reason?: string
  status?: string
  severity?: string
  mirrorUrl?: string
  isHomepage?: boolean
  isSpecial?: boolean
}

// POST /api/submit-public
//
// Public bulk-import endpoint — NO limits on:
//   - number of incidents per request (can submit 1 or 10000)
//   - rate (call as many times as wanted)
//   - content validation (no page fetch, no signature check)
//
// Still applies hostname deduplication (skips duplicate hostnames, returns
// them in the response) — user explicitly asked for dedup earlier.
//
// Body:
//   { incidents: [{ targetUrl, attacker, team?, poc?, reason?, status?,
//                   severity?, mirrorUrl?, isHomepage?, isSpecial? }] }
//
// Returns:
//   { ok, created, duplicates, errors, ids, duplicateHosts, errorDetails }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const incidents: IncomingIncident[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.incidents)
        ? body.incidents
        : []

    if (incidents.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No incidents provided (expected: { incidents: [...] } or [...])' },
        { status: 400 }
      )
    }

    const createdIds: string[] = []
    const duplicateHosts: string[] = []
    const errors: { url: string; error: string }[] = []
    const hackerIds = new Set<string>()

    for (const inc of incidents) {
      try {
        if (!inc.targetUrl || typeof inc.targetUrl !== 'string' || !inc.targetUrl.trim()) {
          errors.push({ url: inc.targetUrl ?? '(none)', error: 'Missing targetUrl' })
          continue
        }
        if (!inc.attacker || typeof inc.attacker !== 'string' || !inc.attacker.trim()) {
          errors.push({ url: inc.targetUrl, error: 'Missing attacker handle' })
          continue
        }

        // Upsert hacker (auto-register on first submit)
        const hacker = await db.hacker.upsert({
          where: { handle: inc.attacker.trim() },
          update: { team: inc.team?.trim() || undefined },
          create: {
            handle: inc.attacker.trim(),
            team: inc.team?.trim() || 'INDEPENDENT',
            country: 'ID',
            avatarColor: '#22c55e',
          },
        })
        hackerIds.add(hacker.id)

        // Dedup check — skip if hostname already archived
        const hostname = getHostname(inc.targetUrl)
        const candidates = await db.defacement.findMany({
          where: { targetUrl: { contains: hostname } },
          select: { targetUrl: true },
        })
        const existingHosts = new Set(candidates.map((c) => getHostname(c.targetUrl)))
        if (existingHosts.has(hostname)) {
          duplicateHosts.push(hostname)
          continue
        }

        // Derive metadata from URL
        const meta = deriveMeta(inc.targetUrl)
        const prior = await db.defacement.findFirst({
          where: { targetUrl: inc.targetUrl },
          select: { id: true },
        })

        // Allow caller to override isHomepage / isSpecial if provided
        const isHomepage = inc.isHomepage ?? meta.isHomepage
        const isSpecial = inc.isSpecial ?? (meta.specialDomain !== null)

        const record = await db.defacement.create({
          data: {
            targetUrl: inc.targetUrl.trim(),
            targetName: meta.targetName,
            country: meta.country,
            category: meta.category,
            attackerId: hacker.id,
            poc: inc.poc?.trim() || null,
            reason: inc.reason?.trim() || null,
            isHomepage,
            isMass: false,
            isRedeface: !!prior,
            isSpecial,
            status: inc.status || 'archived',
            severity: inc.severity || 'medium',
            mirrorUrl:
              inc.mirrorUrl ||
              `https://mirror.archive.test/snap-${Math.random().toString(36).slice(2, 10)}`,
          },
        })
        createdIds.push(record.id)
      } catch (e) {
        errors.push({ url: inc.targetUrl ?? '(none)', error: (e as Error).message })
      }
    }

    // Recompute totalHits for all hackers touched in this batch
    for (const hid of hackerIds) {
      const count = await db.defacement.count({ where: { attackerId: hid } })
      await db.hacker.update({
        where: { id: hid },
        data: { totalHits: { set: count } },
      })
    }

    return NextResponse.json({
      ok: true,
      created: createdIds.length,
      duplicates: duplicateHosts.length,
      errors: errors.length,
      ids: createdIds,
      duplicateHosts,
      errorDetails: errors,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
