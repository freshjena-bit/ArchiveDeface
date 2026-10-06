import { NextRequest, NextResponse } from 'next/server'
import { parseAdminCookie, adminCredentials } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/auth/me → { admin: boolean }
export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie')
  const isAdmin = parseAdminCookie(cookie)
  const cred = adminCredentials()
  return NextResponse.json({
    admin: isAdmin,
    username: isAdmin ? cred.username : null,
  })
}
