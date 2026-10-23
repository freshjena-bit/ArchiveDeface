import type { MetadataRoute } from 'next'
import { readDb } from '@/lib/db'

// Sitemap revalidate — 24 hours.
export const revalidate = 86400

const BASE_URL = 'https://defacer.zone.id'

// Multiple sitemaps — Google caps each sitemap at 50,000 URLs.
// 360K defacements / 50K = 8 sub-sitemaps for defacements.
// Plus 1 sub-sitemap for static + profile routes.
// Total: 9 sub-sitemaps.
//
// generateSitemaps returns array of { id } objects. Next.js generates:
//   /sitemap.xml              → sitemap index (lists all sub-sitemaps)
//   /sitemap-static.xml       → static + profile routes
//   /sitemap-defacements-1.xml → first 50K defacements
//   /sitemap-defacements-2.xml → next 50K
//   ... up to /sitemap-defacements-8.xml
export function generateSitemaps() {
  return [
    { id: 'static' },
    { id: 'defacements-1' },
    { id: 'defacements-2' },
    { id: 'defacements-3' },
    { id: 'defacements-4' },
    { id: 'defacements-5' },
    { id: 'defacements-6' },
    { id: 'defacements-7' },
    { id: 'defacements-8' },
  ]
}

export default async function sitemap({
  id,
}: {
  id: string
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ─── Static + profile routes (homepage, sections, defacers, teams, news) ──
  if (id === 'static') {
    const routes: MetadataRoute.Sitemap = [
      { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
      { url: `${BASE_URL}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
      { url: `${BASE_URL}/special`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
      { url: `${BASE_URL}/onhold`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
      { url: `${BASE_URL}/ranking`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
      { url: `${BASE_URL}/submit`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
      { url: `${BASE_URL}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ]

    try {
      const [hackers, teams, newsItems] = await Promise.all([
        readDb((db) =>
          db.hacker.findMany({
            select: { handle: true, joinedAt: true },
            orderBy: { totalHits: 'desc' },
            take: 500,
          })
        ),
        readDb((db) =>
          db.hacker.findMany({
            where: { team: { not: null } },
            select: { team: true },
            distinct: ['team'],
          })
        ).then((rows) => rows.map((r) => r.team!).filter(Boolean)),
        readDb((db) =>
          db.news.findMany({
            select: { id: true, updatedAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        ),
      ])

      routes.push(
        ...hackers.map((h) => ({
          url: `${BASE_URL}/defacer/${encodeURIComponent(h.handle)}`,
          lastModified: h.joinedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      )
      routes.push(
        ...teams.map((team) => ({
          url: `${BASE_URL}/team/${encodeURIComponent(team)}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
      )
      routes.push(
        ...newsItems.map((n) => ({
          url: `${BASE_URL}/news/${n.id}`,
          lastModified: n.updatedAt,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
      )
    } catch {
      // DB unreachable — keep static routes only
    }
    return routes
  }

  // ─── Defacement detail pages — 50K per sub-sitemap ─────────────────
  // id format: "defacements-N" where N starts at 1
  const match = id.match(/^defacements-(\d+)$/)
  if (!match) return []

  const pageNum = parseInt(match[1], 10)
  const skip = (pageNum - 1) * 50000

  try {
    // Select only id + createdAt — minimizes Supabase egress
    // (~1.5MB per sitemap query, cached 24h at edge).
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
      lastModified: d.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    return []
  }
}
