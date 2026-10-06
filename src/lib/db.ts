import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Local SQLite singleton (used in `bun run dev` and Node scripts like the seed).
// On Cloudflare Pages there is no persistent filesystem, so the local SQLite
// file cannot be used in production — `getDb()` switches to D1 there.
function localClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

export const db =
  globalForPrisma.prisma ??
  localClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Dual-mode DB accessor.
 *
 * - On Cloudflare Pages (Workers runtime): builds a PrismaClient bound to the
 *   D1 database via the `@prisma/adapter-d1` adapter, using the `DB` binding
 *   exposed by OpenNext's `getCloudflareContext()`.
 * - Everywhere else (local dev / Node): returns the local SQLite singleton.
 *
 * Call this at the top of each route handler: `const db = await getDb()`.
 */
let _isCf: boolean | null = null
let _getCtx: (() => Promise<{ env: Record<string, unknown> }>) | null = null

export async function getDb(): Promise<PrismaClient> {
  // resolve whether we're on the Cloudflare runtime (once)
  if (_isCf === null) {
    try {
      // dynamic import so local dev (where the package still installs but has
      // no Cloudflare context) doesn't hard-crash at import time
      const mod = await import('@opennextjs/cloudflare')
      if (typeof (mod as { getCloudflareContext?: unknown }).getCloudflareContext === 'function') {
        _getCtx = (mod as { getCloudflareContext: () => Promise<{ env: Record<string, unknown> }> }).getCloudflareContext
        // probe: does calling it actually yield a context?
        await _getCtx()
        _isCf = true
      } else {
        _isCf = false
      }
    } catch {
      _isCf = false
    }
  }

  if (_isCf && _getCtx) {
    const { env } = await _getCtx()
    const d1 = (env as { DB?: unknown }).DB
    if (d1) {
      const { PrismaD1 } = await import('@prisma/adapter-d1')
      return new PrismaClient({ adapter: new PrismaD1(d1 as never) })
    }
  }

  return db
}
