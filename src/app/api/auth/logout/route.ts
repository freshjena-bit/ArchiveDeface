import { NextResponse } from 'next/server'
import { clearCookieOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/auth/logout
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', clearCookieOptions())
  return res
}
