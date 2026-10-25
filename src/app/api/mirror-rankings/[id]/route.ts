import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { parseAdminCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

// PUT /api/mirror-rankings/[id]
// Admin only — update an existing entry.
// Body: { handle?, totalArchive?, mirror?, country?, team?, notes? }
export async function PUT(req: NextRequest, { params }: { params: Params }) {
  try {
    const isAdmin = parseAdminCookie(req.headers.get('cookie'))
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — admin login required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.handle !== undefined) data.handle = String(body.handle).trim()
    if (body.totalArchive !== undefined) data.totalArchive = Number(body.totalArchive)
    if (body.mirror !== undefined) data.mirror = String(body.mirror).trim()
    if (body.country !== undefined) data.country = body.country?.trim() || null
    if (body.team !== undefined) data.team = body.team?.trim() || null
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 })
    }

    await writeDb((db) =>
      db.mirrorRanking.update({ where: { id }, data })
    )

    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/mirrors')
      revalidatePath('/api/mirror-rankings')
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[/api/mirror-rankings/[id]] PUT error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}

// DELETE /api/mirror-rankings/[id]
// Admin only — delete an entry.
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const isAdmin = parseAdminCookie(req.headers.get('cookie'))
    if (!isAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized — admin login required' },
        { status: 401 }
      )
    }

    const { id } = await params
    await writeDb((db) =>
      db.mirrorRanking.delete({ where: { id } })
    )

    try {
      const { revalidatePath } = await import('next/cache')
      revalidatePath('/mirrors')
      revalidatePath('/api/mirror-rankings')
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[/api/mirror-rankings/[id]] DELETE error:', e)
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
