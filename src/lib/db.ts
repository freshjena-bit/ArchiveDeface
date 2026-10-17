import { PrismaClient } from '@prisma/client'

// ─── Database: Supabase (primary) + optional fallback ───
//
// DATABASE_URL          → Supabase connection string (PRIMARY, required)
// DATABASE_URL_FALLBACK → Optional fallback (e.g., Neon) for when Supabase is down
//
// Reads: try Supabase first, fallback to FALLBACK DB on connection error.
// Writes: write to Supabase first. If Supabase succeeds, also sync to
//         FALLBACK DB (non-blocking). If Supabase fails, write to FALLBACK.
//
// If DATABASE_URL_FALLBACK is not set, single-DB mode (Supabase only).

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaFallback: PrismaClient | undefined
}

// Primary: Supabase (uses DATABASE_URL from env/schema.prisma)
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

// Optional fallback (e.g., Neon — uses DATABASE_URL_FALLBACK, if set)
const fallbackUrl = process.env.DATABASE_URL_FALLBACK
export const dbFallback =
  fallbackUrl && !globalForPrisma.prismaFallback
    ? new PrismaClient({
        datasources: { db: { url: fallbackUrl } },
        log: ['error'],
      })
    : globalForPrisma.prismaFallback ?? null

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  if (dbFallback) globalForPrisma.prismaFallback = dbFallback
}

// ─── Read with fallback ───
export async function readDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db)
  } catch (e) {
    if (dbFallback) {
      console.error('[db] Primary read failed, falling back:', e)
      return await fn(dbFallback)
    }
    throw e
  }
}

// ─── Write with dual-sync + fallback ───
export async function writeDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  let primaryResult: T | null = null
  let primaryOk = false

  try {
    primaryResult = await fn(db)
    primaryOk = true
  } catch (e) {
    console.error('[db] Primary write failed:', e)
  }

  if (primaryOk && dbFallback) {
    try {
      await fn(dbFallback)
    } catch (e) {
      console.error('[db] Fallback sync write failed (non-critical):', e)
    }
  }

  if (!primaryOk && dbFallback) {
    try {
      return await fn(dbFallback)
    } catch (e) {
      throw new Error('Both databases failed.')
    }
  }

  if (primaryOk && primaryResult !== null) {
    return primaryResult
  }

  throw new Error('Write failed: no database available')
}
