import type { MetadataRoute } from 'next'
import { readDb } from '@/lib/db'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://defacer.zone.id'
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/archive`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/special`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/onhold`, lastModified: now, changeFrequency: 'hourly', priority: 0.7 },
    { url: `${baseUrl}/ranking`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/submit`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  let dynamicRoutes: MetadataRoute.Sitemap = []
  try {
    // Fetch defacements + hackers + teams in parallel
    const [recent, hackers, teams] = await Promise.all([
      readDb((db) =>
        db.defacement.findMany({
          where: { status: { not: 'onhold' } },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      ),
      // All defacer profiles — each gets a /defacer/{handle} URL
      readDb((db) =>
        db.hacker.findMany({
          select: { handle: true, joinedAt: true },
          orderBy: { totalHits: 'desc' },
          take: 500,
        })
      ),
      // All team profiles — each gets a /team/{name} URL
      readDb((db) =>
        db.hacker.findMany({
          where: { team: { not: null } },
          select: { team: true },
          distinct: ['team'],
        })
      ).then((rows) => rows.map((r) => r.team!).filter(Boolean)),
    ])

    // /defacement/{id} — 200 most recent
    dynamicRoutes.push(
      ...recent.map((d) => ({
        url: `${baseUrl}/defacement/${d.id}`,
        lastModified: d.createdAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    )

    // /defacer/{handle} — up to 500 hackers
    dynamicRoutes.push(
      ...hackers.map((h) => ({
        url: `${baseUrl}/defacer/${encodeURIComponent(h.handle)}`,
        lastModified: h.joinedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    )

    // /team/{name} — all teams
    dynamicRoutes.push(
      ...teams.map((team) => ({
        url: `${baseUrl}/team/${encodeURIComponent(team)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    )
  } catch {
    // If DB is unreachable, skip dynamic URLs.
  }

  return [...staticRoutes, ...dynamicRoutes]
}
