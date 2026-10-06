import { NextRequest, NextResponse } from 'next/server'
import { adminCredentials, adminCookieOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/auth/login { username, password }
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const cred = adminCredentials()
    if (!cred.username || !cred.password) {
      return NextResponse.json({ ok: false, error: 'Admin not configured' }, { status: 500 })
    }
    if (
      String(username ?? '') === cred.username &&
      String(password ?? '') === cred.password
    ) {
      const res = NextResponse.json({ ok: true, admin: true, username: cred.username })
      res.headers.set('Set-Cookie', adminCookieOptions())
      return res
    }
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
