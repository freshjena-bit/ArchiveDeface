import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

// ─── Database: Turso (primary, free forever 9GB) + optional fallback ───
//
// DATABASE_URL          → Turso libSQL connection string (PRIMARY, required)
//                          Format: libsql://xxx.tur.so?authToken=xxx
// DATABASE_URL_FALLBACK → Optional fallback (e.g., Supabase postgresql) for when Turso is down
//
// If DATABASE_URL starts with "libsql:" → use Turso adapter
// If DATABASE_URL starts with "postgresql:" → use standard PrismaClient (fallback)
//
// Reads: try primary first, fallback on connection error.
// Writes: write to primary first. If primary succeeds, also sync to
//         fallback (non-blocking). If primary fails, write to fallback.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaFallback: PrismaClient | undefined
}

// Detect database type from URL
const dbUrl = process.env.DATABASE_URL ?? ''
const isTurso = dbUrl.startsWith('libsql:')
const isPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:')

// Primary: Turso (libSQL) or PostgreSQL
function createPrismaClient(url: string): PrismaClient {
  if (url.startsWith('libsql:')) {
    // Turso / libSQL — use adapter
    const libsql = createClient({
      url: url.split('?')[0],
      authToken: new URL(url).searchParams.get('authToken') ?? undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
  }
  // PostgreSQL (Supabase/Neon fallback)
  if (url.startsWith('postgresql:') || url.startsWith('postgres:')) {
    return new PrismaClient({ datasources: { db: { url } }, log: ['error'] })
  }
  // Fallback: standard (uses DATABASE_URL from schema)
  return new PrismaClient({ log: ['error', 'warn'] })
}

// Primary DB
export const db =
  globalForPrisma.prisma ??
  (isTurso
    ? createPrismaClient(dbUrl)
    : isPostgres
      ? new PrismaClient({ datasources: { db: { url: dbUrl } }, log: ['error', 'warn'] })
      : new PrismaClient({ log: ['error', 'warn'] }))

// Optional fallback (e.g., Supabase PostgreSQL)
const fallbackUrl = process.env.DATABASE_URL_FALLBACK
export const dbFallback =
  fallbackUrl && !globalForPrisma.prismaFallback
    ? createPrismaClient(fallbackUrl)
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
