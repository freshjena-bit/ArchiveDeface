import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseAdminCookie } from '@/lib/auth'
import { promoteDueOnhold } from '@/lib/promote'

export const dynamic = 'force-dynamic'

// POST /api/admin/promote { id } — manually promote an on-hold record to
// verified (archived). Admin-only.
export async function POST(req: NextRequest) {
  const cookie = req.headers.get('cookie')
  if (!parseAdminCookie(cookie)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  promoteDueOnhold()
  try {
    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing record id' }, { status: 400 })
    }
    const record = await db.defacement.update({
      where: { id },
      data: { status: 'archived', pendingUntil: null },
      select: { id: true, status: true },
    })
    return NextResponse.json({ ok: true, id: record.id, status: record.status })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
