import crypto from 'crypto'

export const ADMIN_COOKIE = 'deface_admin'

export function adminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? '',
    password: process.env.ADMIN_PASSWORD ?? '',
  }
}

// stable token = sha256(username:password). Used as the httpOnly session cookie.
export function adminToken(): string {
  const { username, password } = adminCredentials()
  return crypto.createHash('sha256').update(`${username}:${password}`).digest('hex')
}

export function parseAdminCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false
  const match = cookieHeader.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))
  if (!match) return false
  try {
    const value = decodeURIComponent(match[1])
    return value === adminToken()
  } catch {
    return false
  }
}

// cookie options for the admin session
export function adminCookieOptions(): string {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  return `${ADMIN_COOKIE}=${adminToken()}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export function clearCookieOptions(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}
