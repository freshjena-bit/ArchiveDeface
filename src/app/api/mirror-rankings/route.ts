import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { cached } from '@/lib/cache'
import { parseAdminCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/mirror-rankings
// Public — returns all mirror rankings sorted by totalArchive desc.
// Supports ?mirror=ZONE-H filter.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mirror = searchParams.get('mirror')?.trim()

    const items = await readDb((db) =>
      db.mirrorRanking.findMany({
        where: mirror ? { mirror: { contains: mirror, mode: 'insensitive' } } : undefined,
        orderBy: [{ mirror: 'asc' }, { totalArchive: 'desc' }],
      })
    )

    return cached({
      ok: true,
      total: items.length,
      items: items.map((r) => ({
        id: r.id,
        handle: r.handle,
        totalArchive: r.totalArchive,
        mirror: r.mirror,
        country: r.country,
        team: r.team,
        notes: r.notes,
        updatedAt: r.updatedAt.toISOString(),
      })),
    }, { sMaxAgeSec: 300, swrSec: 600 })
  } catch (e) {
    console.error('[/api/mirror-rankings] GET error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/mirror-rankings
// Admin only — create a new mirror ranking entry.
// Body: { handle, totalArchive, mirror, country?, team?, notes? }
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const auth = parseAdminCookie(req)
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — admin login required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { handle, totalArchive, mirror, country, team, notes } = body ?? {}

    if (!handle || typeof handle !== 'string' || !handle.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing handle' }, { status: 400 })
    }
    if (!mirror || typeof mirror !== 'string' || !mirror.trim()) {
      return NextResponse.json({ ok: false, error: 'Missing mirror' }, { status: 400 })
    }
    if (typeof totalArchive !== 'number' || totalArchive < 0) {
      return NextResponse.json({ ok: false, error: 'totalArchive must be a non-negative number' }, { status: 400 })
    }

    const created = await writeDb((db) =>
      db.mirrorRanking.create({
        data: {
          handle: handle.trim(),
          totalArchive,
          mirror: mirror.trim(),
          country: country?.trim() || null,
          team: team?.trim() || null,
          notes: notes?.trim() || null,
        },
      })
    )

    // Invalidate CDN cache for mirrors page
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/mirrors')
      revalidatePath('/api/mirror-rankings')
    } catch {}

    return NextResponse.json({ ok: true, id: created.id })
  } catch (e) {
    console.error('[/api/mirror-rankings] POST error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
