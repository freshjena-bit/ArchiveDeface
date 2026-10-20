import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

// ─── Database: Turso (primary) + optional fallback ───
//
// DATABASE_URL          → libsql://xxx.tur.so?authToken=xxx (Turso, required)
// DATABASE_URL_FALLBACK → postgresql://... (Supabase, optional backup)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaFallback: PrismaClient | undefined
}

const dbUrl = process.env.DATABASE_URL ?? ''
const isTurso = dbUrl.startsWith('libsql:')
const isPostgres = dbUrl.startsWith('postgresql:') || dbUrl.startsWith('postgres:')

// Primary DB
export const db =
  globalForPrisma.prisma ??
  (isTurso
    ? new PrismaClient({ adapter: new PrismaLibSQL({ url: dbUrl }) } as never)
    : isPostgres
      ? new PrismaClient({ datasources: { db: { url: dbUrl } }, log: ['error', 'warn'] })
      : new PrismaClient({ log: ['error', 'warn'] }))

// Optional fallback
const fallbackUrl = process.env.DATABASE_URL_FALLBACK
export const dbFallback =
  fallbackUrl && !globalForPrisma.prismaFallback
    ? fallbackUrl.startsWith('libsql:')
      ? new PrismaClient({ adapter: new PrismaLibSQL({ url: fallbackUrl }) } as never)
      : new PrismaClient({ datasources: { db: { url: fallbackUrl } }, log: ['error'] })
    : globalForPrisma.prismaFallback ?? null

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  if (dbFallback) globalForPrisma.prismaFallback = dbFallback
}

export async function readDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db)
  } catch (e) {
    if (dbFallback) {
      console.error('[db] Primary read failed, fallback:', e)
      return await fn(dbFallback)
    }
    throw e
  }
}

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
      console.error('[db] Fallback sync failed:', e)
    }
  }
  if (!primaryOk && dbFallback) {
    try {
      return await fn(dbFallback)
    } catch {
      throw new Error('Both databases failed.')
    }
  }
  if (primaryOk && primaryResult !== null) return primaryResult
  throw new Error('Write failed')
}


// Optional fallback
const fallbackUrl = process.env.DATABASE_URL_FALLBACK
export const dbFallback =
  fallbackUrl && !globalForPrisma.prismaFallback
    ? createPrismaClient(fallbackUrl)
    : globalForPrisma.prismaFallback ?? null

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  if (dbFallback) globalForPrisma.prismaFallback = dbFallback
}

export async function readDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(db)
  } catch (e) {
    if (dbFallback) {
      console.error('[db] Primary read failed, fallback:', e)
      return await fn(dbFallback)
    }
    throw e
  }
}

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
      console.error('[db] Fallback sync failed:', e)
    }
  }
  if (!primaryOk && dbFallback) {
    try {
      return await fn(dbFallback)
    } catch {
      throw new Error('Both databases failed.')
    }
  }
  if (primaryOk && primaryResult !== null) return primaryResult
  throw new Error('Write failed')
}
