import type { MetadataRoute } from 'next'

// Sitemap untuk Google Search Console.
// Sekarang multi-page (App Router paths) — tiap route ke-index terpisah.
// Dynamic routes (defacer/[handle], team/[name]) gak dimasukin soalnya
// infinite combinations — Google bakal discover via internal links.
export default function sitemap(): MetadataRoute.Sitemap {
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

  return staticRoutes
}
