import { PrismaClient } from '@prisma/client'

// ─── Dual database setup: Neon (primary) + Supabase (fallback) ───
//
// DATABASE_URL          → Neon connection string (primary, required)
// DATABASE_URL_SUPABASE → Supabase connection string (fallback, optional)
//
// Reads: try Neon first, fallback to Supabase on connection error.
// Writes: write to Neon first. If Neon succeeds, also sync to Supabase
//         (non-blocking — Supabase sync failure is logged but not fatal).
//         If Neon fails (e.g., 100% compute limit), write to Supabase as
//         primary fallback.
//
// If DATABASE_URL_SUPABASE is not set, behaves identically to single-DB
// (Neon only) — backward compatible.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSupabase: PrismaClient | undefined
}

// Primary: Neon (uses DATABASE_URL from env/schema.prisma)
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

// Fallback: Supabase (uses DATABASE_URL_SUPABASE, if set)
const supabaseUrl = process.env.DATABASE_URL_SUPABASE
export const dbFallback =
  supabaseUrl && !globalForPrisma.prismaSupabase
    ? new PrismaClient({
        datasources: { db: { url: supabaseUrl } },
        log: ['error'],
      })
    : globalForPrisma.prismaSupabase ?? null

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  if (dbFallback) globalForPrisma.prismaSupabase = dbFallback
}

// ─── Read with fallback ───
// Try Neon first. If connection error, try Supabase.
// Usage: const items = await readDb(db => db.defacement.findMany({...}))
export async function readDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db)
  } catch (e) {
    if (dbFallback) {
      console.error('[db] Neon read failed, falling back to Supabase:', e)
      return await fn(dbFallback)
    }
    throw e
  }
}

// ─── Write with dual-sync + fallback ───
// 1. Try Neon write. If success, also sync to Supabase (non-blocking).
// 2. If Neon fails (e.g., 100% compute), write to Supabase as primary.
// 3. If both fail, throw.
// Usage: const record = await writeDb(db => db.defacement.create({...}))
export async function writeDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  let neonResult: T | null = null
  let neonOk = false

  // Try Neon first
  try {
    neonResult = await fn(db)
    neonOk = true
  } catch (e) {
    console.error('[db] Neon write failed:', e)
  }

  // If Neon succeeded, sync to Supabase (non-blocking — failure is OK)
  if (neonOk && dbFallback) {
    try {
      await fn(dbFallback)
    } catch (e) {
      // Non-critical: Supabase sync failed, but Neon has the data
      console.error('[db] Supabase sync write failed (non-critical):', e)
    }
  }

  // If Neon failed, try Supabase as primary fallback
  if (!neonOk && dbFallback) {
    try {
      return await fn(dbFallback)
    } catch (e) {
      throw new Error(`Both databases failed. Neon + Supabase write errors.`)
    }
  }

  if (neonOk && neonResult !== null) {
    return neonResult
  }

  throw new Error('Write failed: no database available')
}

// ─── Count with fallback (for totalHits recompute, etc.) ───
export async function countDb(
  model: 'defacement' | 'hacker' | 'news' | 'stat',
  where?: Record<string, unknown>
): Promise<number> {
  return readDb(async (prisma) => {
    // @ts-expect-error — dynamic model access
    return await prisma[model].count({ where })
  })
}
