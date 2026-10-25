import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { parseAdminCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/hacker-tags
// Admin only — list all hackers with their tags.
export async function GET(req: NextRequest) {
  try {
    const isAdmin = parseAdminCookie(req.headers.get('cookie'))
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — admin login required' },
        { status: 401 }
      )
    }

    const hackers = await readDb((db) =>
      db.hacker.findMany({
        select: {
          id: true,
          handle: true,
          team: true,
          country: true,
          totalHits: true,
          tags: true,
        },
        orderBy: { totalHits: 'desc' },
      })
    )

    return NextResponse.json({
      ok: true,
      items: hackers.map((h) => ({
        id: h.id,
        handle: h.handle,
        team: h.team,
        country: h.country,
        totalHits: h.totalHits,
        tags: JSON.parse(h.tags || '[]') as string[],
      })),
    })
  } catch (e) {
    console.error('[/api/admin/hacker-tags] GET error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}

// PUT /api/admin/hacker-tags
// Admin only — update tags for a hacker.
// Body: { hackerId: string, tags: string[] }
export async function PUT(req: NextRequest) {
  try {
    const isAdmin = parseAdminCookie(req.headers.get('cookie'))
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — admin login required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { hackerId, tags } = body ?? {}

    if (!hackerId || typeof hackerId !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing hackerId' }, { status: 400 })
    }
    if (!Array.isArray(tags)) {
      return NextResponse.json({ ok: false, error: 'tags must be an array of strings' }, { status: 400 })
    }

    // Sanitize tags — trim, dedupe, max 10 tags, max 30 chars each
    const cleanTags = [...new Set(
      tags
        .map((t: unknown) => String(t).trim())
        .filter((t) => t.length > 0 && t.length <= 30)
    )].slice(0, 10)

    await writeDb((db) =>
      db.hacker.update({
        where: { id: hackerId },
        data: { tags: JSON.stringify(cleanTags) },
      })
    )

    // Invalidate caches
    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/ranking')
      revalidatePath(`/defacer/[handle]`)
      revalidatePath('/')
    } catch {}

    return NextResponse.json({ ok: true, tags: cleanTags })
  } catch (e) {
    console.error('[/api/admin/hacker-tags] PUT error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
