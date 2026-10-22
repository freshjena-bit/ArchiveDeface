import { NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

/**
 * CDN edge caching helper.
 *
 * Vercel's edge network respects `Cache-Control: s-maxage=...` —
 * a single URL's response is cached at the edge for `sMaxAgeSec` seconds,
 * then served stale for another `swrSec` seconds while a background
 * revalidation fetches fresh data.
 *
 * This is the PRIMARY defense against Turso row-read quota exhaustion:
 * 1000 page views in 5 min → 1 DB hit instead of 1000.
 */
export function cached(
  data: unknown,
  opts: { sMaxAgeSec?: number; swrSec?: number; status?: number } = {}
) {
  const sMaxAge = opts.sMaxAgeSec ?? 300 // 5 min default
  const swr = opts.swrSec ?? 600 // 10 min stale-while-revalidate default
  return NextResponse.json(data, {
    status: opts.status,
    headers: {
      'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      // Help Vercel know it's safe to cache even though route is force-dynamic
      'Vercel-CDN-Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
      'Vercel-Edge-Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    },
  })
}

// ---------------------------------------------------------------------------
// Stat-table cache (secondary defense — for CDN cache misses)
// ---------------------------------------------------------------------------

const DEFAULT_TTL_SEC = 300 // 5 min — same as CDN cache
const TTL_SUFFIX = ':at'   // separate row holding epoch seconds

/**
 * Read a cached integer stat. If missing or stale (older than ttlSec),
 * recompute via `recompute()` and persist before returning.
 *
 * Cost when cache hit: 2 row reads (value + timestamp).
 * Cost when cache miss: recompute() + 2 upserts.
 */
export async function getCachedInt(
  key: string,
  recompute: () => Promise<number>,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<number> {
  const atKey = `${key}${TTL_SUFFIX}`
  const rows = await readDb((db) =>
    db.stat.findMany({ where: { key: { in: [key, atKey] } } })
  )
  const valRow = rows.find((r) => r.key === key)
  const atRow = rows.find((r) => r.key === atKey)

  const nowSec = Math.floor(Date.now() / 1000)
  if (valRow && atRow) {
    const age = nowSec - atRow.value
    if (age < ttlSec) {
      return valRow.value
    }
  }

  // Recompute
  const value = await recompute()
  try {
    await writeDb(async (db) => {
      await db.stat.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
      await db.stat.upsert({
        where: { key: atKey },
        create: { key: atKey, value: nowSec },
        update: { value: nowSec },
      })
    })
  } catch (e) {
    // Cache write failure is non-fatal — we still return the fresh value.
    console.error('[cache] write failed for', key, e)
  }
  return value
}

/**
 * Read a cached array/breakdown. Stored as one row per item with
 * `prefix` + key, plus a single `prefix + 'at'` timestamp marker.
 *
 * Cost when cache hit: N+1 row reads (N items + 1 timestamp).
 * Cost when cache miss: recompute() + bulk upserts.
 */
export async function getCachedBreakdown(
  prefix: string,
  recompute: () => Promise<{ key: string; count: number }[]>,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<{ key: string; count: number }[]> {
  const atKey = `${prefix}at`
  // First check freshness with a single read
  const atRow = await readDb((db) => db.stat.findUnique({ where: { key: atKey } }))
  const nowSec = Math.floor(Date.now() / 1000)

  if (atRow && nowSec - atRow.value < ttlSec) {
    // Cache fresh — read all items with this prefix.
    // Note: Prisma `startsWith` works on SQLite (translates to LIKE 'prefix%').
    const items = await readDb((db) =>
      db.stat.findMany({ where: { key: { startsWith: prefix } } })
    )
    return items
      .filter((r) => r.key !== atKey)
      .map((r) => ({
        key: r.key.slice(prefix.length),
        count: r.value,
      }))
  }

  // Cache stale or missing — recompute
  const fresh = await recompute()
  try {
    await writeDb(async (db) => {
      // Upsert each item
      for (const item of fresh) {
        const k = `${prefix}${item.key}`
        await db.stat.upsert({
          where: { key: k },
          create: { key: k, value: item.count },
          update: { value: item.count },
        })
      }
      // Upsert timestamp marker
      await db.stat.upsert({
        where: { key: atKey },
        create: { key: atKey, value: nowSec },
        update: { value: nowSec },
      })
    })
  } catch (e) {
    console.error('[cache] breakdown write failed for', prefix, e)
  }
  return fresh
}

/**
 * Invalidate all stat-table cache entries.
 *
 * Called after a new defacement is inserted — forces the next read to
 * recompute fresh values instead of serving stale cache.
 *
 * Safe to call multiple times. Reads all Stat rows, deletes any whose
 * key ends with `:at` or equals `...at` (the freshness markers).
 */
export async function invalidateStatsCache(): Promise<void> {
  try {
    await writeDb(async (db) => {
      const all = await db.stat.findMany()
      const stale = all.filter(
        (r) => r.key.endsWith(TTL_SUFFIX) || r.key.endsWith('at')
      )
      for (const r of stale) {
        await db.stat.delete({ where: { id: r.id } })
      }
    })
  } catch (e) {
    console.error('[cache] invalidate failed', e)
  }
}
