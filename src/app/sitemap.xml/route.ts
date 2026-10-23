import { readDb } from '@/lib/db'

// Sitemap index — lists all sub-sitemaps.
// Google fetches this first, then crawls each sub-sitemap.
//
// URL pattern:
//   /sitemap.xml      → this file (sitemap index)
//   /sitemap/0        → static + profile routes (homepage, archive, defacers, teams, news)
//   /sitemap/1..8     → defacement chunks (50K URLs each)

export const revalidate = 3600 // 1 hour

// Force dynamic — don't prerender at build time (DB query for count
// would fail during build with connection pool issues).
export const dynamic = 'force-dynamic'

const BASE_URL = 'https://defacer.zone.id'

export async function GET() {
  let totalDefacements = 0
  try {
    totalDefacements = await readDb((db) =>
      db.defacement.count({
        where: { status: { in: ['archived', 'restored', 'live'] } },
      })
    )
  } catch {
    // DB unreachable — return minimal index with just static sitemap
  }

  const defacementSitemapCount = Math.max(1, Math.ceil(totalDefacements / 50000))
  const now = new Date().toISOString()

  const sitemaps: string[] = []
  // Page 0: static + profile routes
  sitemaps.push(`  <sitemap>
    <loc>${BASE_URL}/sitemap/0</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`)
  // Pages 1..N: defacement chunks
  for (let i = 1; i <= defacementSitemapCount; i++) {
    sitemaps.push(`  <sitemap>
    <loc>${BASE_URL}/sitemap/${i}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join('\n')}
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
