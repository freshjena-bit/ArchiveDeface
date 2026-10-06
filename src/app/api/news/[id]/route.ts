import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { parseAdminCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// DELETE /api/news/[id] — admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookie = req.headers.get('cookie')
  if (!parseAdminCookie(cookie)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })
    }
    const db = await getDb()
    await db.news.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
