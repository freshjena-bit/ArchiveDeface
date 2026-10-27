import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { deriveMeta, getHostname } from '@/lib/site'
import { invalidateStatsCache } from '@/lib/cache'
import { revalidatePath } from 'next/cache'
import { getClientIP, checkSubmitLimit, logSuccessfulSubmit } from '@/lib/rate-limit'

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

    // ─── Admin bypass: X-Admin-Key header matches ADMIN_PASSWORD ────
    // Used by Python submit script / bulk migration tools.
    // If valid → skip rate limit + URL validation.
    const adminKey = req.headers.get('x-admin-key') ?? ''
    const expectedKey = process.env.ADMIN_PASSWORD ?? ''
    const isAdminBypass = expectedKey && adminKey === expectedKey

    // ─── URL validation: EVERY incident MUST have targetUrl ─────────
    // Skipped for admin bypass (script may submit partial data).
    if (!isAdminBypass) {
      const missingUrl = incidents.find((inc) => !inc.targetUrl?.trim())
      if (missingUrl) {
        return NextResponse.json(
          { ok: false, error: 'URL is required for every incident. Please provide a targetUrl for all entries.' },
          { status: 400 }
        )
      }
    }

    // ─── Rate limit check: max 1000 records per IP per 24h ──────────
    // Skipped for admin bypass.
    if (!isAdminBypass) {
      const clientIP = getClientIP(req)
      const limit = await checkSubmitLimit(clientIP)
      if (!limit.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: `Daily submit limit exceeded (${limit.limit}/day). You have used ${limit.used} submissions. Try again tomorrow.`,
            rateLimited: true,
            used: limit.used,
            limit: limit.limit,
          },
          { status: 429 }
        )
      }

      const validCount = incidents.filter((inc) => inc.targetUrl?.trim() && inc.attacker?.trim()).length
      if (limit.used + validCount > limit.limit) {
        return NextResponse.json(
          {
            ok: false,
            error: `Daily submit limit would be exceeded. You have ${limit.remaining} remaining, but this request has ${validCount} incidents.`,
            rateLimited: true,
            used: limit.used,
            remaining: limit.remaining,
            limit: limit.limit,
          },
          { status: 429 }
        )
      }
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

    // ─── Log successful submit for rate limiting ─────────────────────
    // Only counts ACTUALLY CREATED records (not duplicates/rejected).
    // Admin bypass submits are ALSO logged (for tracking/stats) but
    // the rate limit CHECK is still bypassed for admin (admin can
    // submit unlimited, but submissions are still tracked).
    if (createdCount > 0) {
      const clientIP = getClientIP(req)
      await logSuccessfulSubmit(clientIP, createdCount)
    }

    // Invalidate Stat-table cache so the next /api/stats read sees fresh counts.
    if (createdCount > 0) {
      await invalidateStatsCache()

      // Trigger on-demand ISR revalidation so sitemap + key pages
      // regenerate immediately (new defacement URL becomes discoverable
      // by Googlebot without waiting for the 24h revalidate cycle).
      try {
        revalidatePath('/sitemap.xml')
        revalidatePath('/sitemap/0')
        revalidatePath('/sitemap/1')
        revalidatePath('/')
        revalidatePath('/archive')
        revalidatePath('/ranking')
        // Defacer profile page — new submission updates their totalHits
        revalidatePath(`/defacer/${encodeURIComponent(firstInc.inc.attacker.trim())}`)
        // Team page if team is set
        if (firstInc.inc.team?.trim()) {
          revalidatePath(`/team/${encodeURIComponent(firstInc.inc.team.trim())}`)
        }
      } catch (e) {
        console.error('[submit-public] revalidatePath failed:', e)
        // Non-fatal — ISR will still regenerate on its own schedule
      }
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
