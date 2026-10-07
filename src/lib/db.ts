import { PrismaClient } from '@prisma/client'

// Single Prisma client for both local dev (Neon) and production (Neon).
// DATABASE_URL must point to a PostgreSQL connection string (e.g. Neon).
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
