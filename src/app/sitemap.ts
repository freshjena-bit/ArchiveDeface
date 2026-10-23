import type { MetadataRoute } from 'next'
import { readDb } from '@/lib/db'

// Sitemap revalidate — 1 hour. Frequent enough that new submissions
// appear quickly (also triggered on-demand by revalidatePath in
// /api/submit routes).
export const revalidate = 3600

const BASE_URL = 'https://defacer.zone.id'

// Single sitemap approach — Google caps each sitemap at 50K URLs.
// We include the top 49K defacements (most recent) + static routes
// + defacer/team/news profile URLs.
//
// The remaining ~310K older defacements are discoverable via internal
// links from the /archive page's pagination (which Googlebot crawls).
//
// (Previous attempt at generateSitemaps() to split into 8 sub-sitemaps
// failed with TypeError during prerender, even with force-dynamic.
// Reverted to single-sitemap approach for reliability.)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ─── Static routes (homepage + section pages) ────────────────────────
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

  // ─── Profile URLs: defacers, teams, news ─────────────────────────────
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

  // ─── Defacement detail pages — top 49K (most recent) ────────────────
  // Google caps single-sitemap at 50K URLs. We leave headroom for the
  // static + profile URLs above (~600). The remaining ~310K older
  // defacements are discoverable via /archive page pagination links.
  try {
    const recent = await readDb((db) =>
      db.defacement.findMany({
        where: { status: { in: ['archived', 'restored', 'live'] } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 49000,
      })
    )
    routes.push(
      ...recent.map((d) => ({
        url: `${BASE_URL}/defacement/${d.id}`,
        lastModified: d.createdAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    )
  } catch {
    // DB unreachable — skip defacement URLs
  }

  return routes
}
