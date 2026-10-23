import { NextRequest } from 'next/server'
import { readDb } from '@/lib/db'

// Individual sub-sitemap route handler.
// Page 0: static + profile routes (homepage, archive, defacers, teams, news)
// Page 1..N: defacement chunks (50K URLs each, ordered by createdAt DESC)

export const revalidate = 3600 // 1 hour

// Force dynamic — don't prerender (DB queries would fail during build
// with connection pool timeout).
export const dynamic = 'force-dynamic'

const BASE_URL = 'https://defacer.zone.id'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page: pageStr } = await params
  const page = parseInt(pageStr, 10)

  if (isNaN(page) || page < 0) {
    return new Response('Invalid page', { status: 400 })
  }

  let urls: { url: string; lastModified: string; changeFrequency: string; priority: number }[] = []

  if (page === 0) {
    urls = await getStaticAndProfileUrls()
  } else {
    urls = await getDefacementChunk(page)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${u.lastModified}</lastmod>
    <changefreq>${u.changeFrequency}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}

async function getStaticAndProfileUrls() {
  const now = new Date().toISOString()
  const urls: { url: string; lastModified: string; changeFrequency: string; priority: number }[] = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/special`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/onhold`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${BASE_URL}/ranking`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/submit`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  // SEQUENTIAL queries — avoid connection pool contention
  try {
    const hackers = await readDb((db) =>
      db.hacker.findMany({
        select: { handle: true, joinedAt: true },
        orderBy: { totalHits: 'desc' },
        take: 500,
      })
    )
    urls.push(
      ...hackers.map((h) => ({
        url: `${BASE_URL}/defacer/${encodeURIComponent(h.handle)}`,
        lastModified: h.joinedAt.toISOString(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
    )

    const teamRows = await readDb((db) =>
      db.hacker.findMany({
        where: { team: { not: null } },
        select: { team: true },
        distinct: ['team'],
      })
    )
    urls.push(
      ...teamRows
        .map((r) => r.team!)
        .filter(Boolean)
        .map((team) => ({
          url: `${BASE_URL}/team/${encodeURIComponent(team)}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
        }))
    )

    const newsItems = await readDb((db) =>
      db.news.findMany({
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    )
    urls.push(
      ...newsItems.map((n) => ({
        url: `${BASE_URL}/news/${n.id}`,
        lastModified: n.updatedAt.toISOString(),
        changeFrequency: 'monthly',
        priority: 0.6,
      }))
    )
  } catch (e) {
    console.error('[sitemap/0] profile fetch failed:', e)
  }

  return urls
}

async function getDefacementChunk(page: number) {
  const skip = (page - 1) * 50000

  try {
    // Select only id + createdAt — minimizes Supabase egress
    const defacements = await readDb((db) =>
      db.defacement.findMany({
        where: { status: { in: ['archived', 'restored', 'live'] } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50000,
        skip,
      })
    )

    return defacements.map((d) => ({
      url: `${BASE_URL}/defacement/${d.id}`,
      lastModified: d.createdAt.toISOString(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  } catch (e) {
    console.error(`[sitemap/${page}] defacement fetch failed:`, e)
    return []
  }
}
