import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Vercel: use the `db` export directly — Prisma connects to PostgreSQL via DATABASE_URL.
// No need for the dual-mode getDb() / D1 adapter (that was Cloudflare-specific).
export async function getDb(): Promise<PrismaClient> {
  return db
}
