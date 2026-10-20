import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { deriveMeta, getHostname } from '@/lib/site'

export const dynamic = 'force-dynamic'
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
  isMass?: boolean
  isRedeface?: boolean
  category?: string
  country?: string
  targetName?: string
  createdAt?: string // ISO timestamp — preserves original submission time
}

// POST /api/submit-public
// Optimized: 4 DB queries total (not 4×N per incident).
// 1. Upsert hacker (once)
// 2. Batch dedup check (single findMany for ALL hostnames)
// 3. createMany (single INSERT for all non-duplicate records)
// 4. Update totalHits (once)
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

    // Validate + extract hostnames
    const valid: { inc: IncomingIncident; hostname: string; meta: ReturnType<typeof deriveMeta> }[] = []
    const errors: { url: string; error: string }[] = []

    for (const inc of incidents) {
      if (!inc.targetUrl?.trim()) {
        errors.push({ url: inc.targetUrl ?? '(none)', error: 'Missing targetUrl' })
        continue
      }
      if (!inc.attacker?.trim()) {
        errors.push({ url: inc.targetUrl, error: 'Missing attacker' })
        continue
      }
      const hostname = getHostname(inc.targetUrl)
      const meta = deriveMeta(inc.targetUrl)
      valid.push({ inc, hostname, meta })
    }

    if (valid.length === 0) {
      return NextResponse.json({
        ok: true, created: 0, duplicates: 0, errors: errors.length,
        ids: [], duplicateHosts: [], errorDetails: errors,
      })
    }

    // 1. Upsert hacker ONCE (all incidents share same attacker)
    const firstInc = valid[0].inc
    const hacker = await writeDb((db) =>
      db.hacker.upsert({
        where: { handle: firstInc.attacker.trim() },
        update: { team: firstInc.team?.trim() || undefined },
        create: {
          handle: firstInc.attacker.trim(),
          team: firstInc.team?.trim() || 'INDEPENDENT',
          country: 'ID',
          avatarColor: '#22c55e',
        },
      })
    )

    // 2. Batch dedup check — single findMany for ALL hostnames
    const allHostnames = [...new Set(valid.map((v) => v.hostname))]
    const candidates = await readDb((db) =>
      db.defacement.findMany({
        where: { OR: allHostnames.map((h) => ({ targetUrl: { contains: h } })) },
        select: { targetUrl: true },
      })
    )
    const existingHosts = new Set(candidates.map((c) => getHostname(c.targetUrl)))

    // Split into toCreate vs duplicates
    const toCreate = valid.filter((v) => !existingHosts.has(v.hostname))
    const duplicateHosts = valid.filter((v) => existingHosts.has(v.hostname)).map((v) => v.hostname)

    // 3. Batch insert via createMany — single INSERT for all records
    let createdCount = 0
    let createErrors: { url: string; error: string }[] = []

    if (toCreate.length > 0) {
      const records = toCreate.map((v) => ({
        targetUrl: v.inc.targetUrl.trim(),
        targetName: v.inc.targetName?.trim() || v.meta.targetName,
        country: v.inc.country?.trim() || v.meta.country,
        category: v.inc.category?.trim() || v.meta.category,
        attackerId: hacker.id,
        poc: v.inc.poc?.trim() || null,
        reason: v.inc.reason?.trim() || null,
        isHomepage: v.inc.isHomepage ?? v.meta.isHomepage,
        isMass: v.inc.isMass ?? true,
        isRedeface: v.inc.isRedeface ?? false,
        isSpecial: v.inc.isSpecial ?? (v.meta.specialDomain !== null),
        status: v.inc.status || 'archived',
        severity: v.inc.severity || 'medium',
        mirrorUrl: v.inc.mirrorUrl || `https://mirror.archive.test/snap-${Math.random().toString(36).slice(2, 10)}`,
        ...(v.inc.createdAt ? { createdAt: new Date(v.inc.createdAt) } : {}),
      }))

      try {
        const result = await writeDb((db) =>
          db.defacement.createMany({ data: records, skipDuplicates: true })
        )
        createdCount = result.count
      } catch (e) {
        // If createMany fails (e.g., constraint error), try individual creates
        for (const r of records) {
          try {
            await writeDb((db) => db.defacement.create({ data: r }))
            createdCount++
          } catch (e2) {
            createErrors.push({ url: r.targetUrl, error: (e2 as Error).message.slice(0, 100) })
          }
        }
      }
    }

    // 4. Update totalHits ONCE
    try {
      const totalCount = await readDb((db) =>
        db.defacement.count({ where: { attackerId: hacker.id } })
      )
      await writeDb((db) =>
        db.hacker.update({
          where: { id: hacker.id },
          data: { totalHits: { set: totalCount } },
        })
      )
    } catch (e) {
      // Non-critical: totalHits update failed
    }

    return NextResponse.json({
      ok: true,
      created: createdCount,
      duplicates: duplicateHosts.length,
      errors: errors.length + createErrors.length,
      ids: [],
      duplicateHosts: [...new Set(duplicateHosts)],
      errorDetails: [...errors, ...createErrors],
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
