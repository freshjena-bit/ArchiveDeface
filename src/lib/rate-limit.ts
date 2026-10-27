import { readDb, writeDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

const DAILY_LIMIT = 1000 // max 1000 records per IP per 24h
const WINDOW_HOURS = 24

/**
 * Get client IP from request headers.
 * Vercel sets x-forwarded-for (standard) + x-real-ip.
 */
export function getClientIP(req: NextRequest): string {
  // x-forwarded-for can be "client, proxy1, proxy2" — take first (client)
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const ips = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (ips.length > 0) return ips[0]
  }
  const xRealIP = req.headers.get('x-real-ip')
  if (xRealIP) return xRealIP.trim()
  return 'unknown'
}

/**
 * Check if IP is within daily submit limit.
 * Returns { allowed, used, remaining }.
 *
 * Only counts SUCCESSFUL submissions from SubmitLog table.
 * Rejected/duplicate submissions are NOT logged → don't count.
 */
export async function checkSubmitLimit(ip: string): Promise<{
  allowed: boolean
  used: number
  remaining: number
  limit: number
}> {
  const cutoff = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000)

  try {
    const logs = await readDb((db) =>
      db.submitLog.findMany({
        where: {
          ip,
          createdAt: { gte: cutoff },
        },
        select: { count: true },
      })
    )

    const used = logs.reduce((sum, log) => sum + log.count, 0)
    const remaining = Math.max(0, DAILY_LIMIT - used)
    const allowed = used < DAILY_LIMIT

    return { allowed, used, remaining, limit: DAILY_LIMIT }
  } catch (e) {
    console.error('[rate-limit] check failed:', e)
    // On error, ALLOW the submit (fail-open to avoid blocking legitimate users)
    return { allowed: true, used: 0, remaining: DAILY_LIMIT, limit: DAILY_LIMIT }
  }
}

/**
 * Log a successful submission.
 * Only called AFTER records are actually created in the DB.
 * Rejected/duplicate submissions are NOT logged.
 */
export async function logSuccessfulSubmit(ip: string, count: number): Promise<void> {
  if (count <= 0) return // nothing to log
  try {
    await writeDb((db) =>
      db.submitLog.create({
        data: { ip, count },
      })
    )
  } catch (e) {
    console.error('[rate-limit] log failed:', e)
    // Non-fatal — submit already succeeded, just couldn't log
  }
}

/**
 * Get remaining quota info for a given IP (for UI display).
 */
export async function getQuotaInfo(ip: string) {
  const { allowed, used, remaining, limit } = await checkSubmitLimit(ip)
  return { allowed, used, remaining, limit }
}
