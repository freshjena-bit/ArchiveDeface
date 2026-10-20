import { NextRequest, NextResponse } from 'next/server'
import { getDefacerData } from '@/lib/defacer'
import { cached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const handle = new URL(req.url).searchParams.get('handle')?.trim()
  if (!handle) {
    return NextResponse.json({ ok: false, error: 'Missing handle' }, { status: 400 })
  }
  const data = await getDefacerData(handle)
  if (!data) {
    return NextResponse.json({ ok: false, error: 'Defacer not found' }, { status: 404 })
  }
  // Per-defacer profile changes only when new defacements are attributed
  // to them — cache 5 min at edge.
  return cached(data, { sMaxAgeSec: 300, swrSec: 600 })
}
