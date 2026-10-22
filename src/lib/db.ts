import { PrismaClient } from '@prisma/client'

/**
 * Single database client — PostgreSQL (Supabase) only.
 *
 * Previously this supported Turso (libsql) + Supabase fallback, but we
 * consolidated to Supabase as the sole database. The CDN cache +
 * Stat-table cache (see src/lib/cache.ts) keeps Supabase egress low
 * enough to stay within the free tier.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = process.env.DATABASE_URL ?? ''

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

/**
 * Pass-through wrapper for reads. Kept for API stability — many call
 * sites use `readDb((db) => ...)`, so we don't need to touch them.
 *
 * (Previously had fallback logic; now just calls the primary.)
 */
export async function readDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  return await fn(db)
}

/**
 * Pass-through wrapper for writes. Kept for API stability.
 *
 * (Previously synced to a fallback DB; now just calls the primary.)
 */
export async function writeDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  return await fn(db)
}
