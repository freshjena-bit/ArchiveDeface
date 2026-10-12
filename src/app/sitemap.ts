import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'

// ISR: revalidate sitemap tiap 1 jam (3600 detik).
// Setelah incident baru di-submit, dalam ≤1 jam sitemap bakal include
// URL /defacement/{id} yang baru. Default Next.js cache sitemap statis
// selamanya sampai deploy baru — ISR bikin auto-refresh.
//
// Cara kerja ISR:
// 1. Request pertama → generate sitemap, cache di Vercel edge
// 2. Request berikutnya (dalam 1 jam) → serve dari cache (cepat)
// 3. Setelah 1 jam → request berikutnya trigger background regeneration
// 4. Setelah regen selesai → request berikutnya dapet versi baru
//
// Google re-crawl sitemap tiap beberapa jam sampe daily, jadi 1 jam
// lebih dari cukup buat discovery window. Revalidate dinaikkan dari
// 300 (5 mnt) ke 3600 (1 jam) buat nurunin beban DB Neon free plan
// (auto-suspend 5 mnt → query sitemap 1x/jam cukup ringan).
export const revalidate = 3600

// Sitemap untuk Google Search Console.
// Static routes + up to 200 most recent defacement detail URLs.
// Older defacement pages are discovered by Google via /archive pagination
// (internal links), so we only seed the latest 200 here.
// Dynamic routes like /defacer/[handle] and /team/[name] are intentionally
// omitted — infinite combinations, discovered via internal links.
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

  // Dynamic defacement detail pages — fetch latest 200 IDs.
  // Google discovers older ones via /archive internal links (pagination).
  let defacementRoutes: MetadataRoute.Sitemap = []
  try {
    const recent = await db.defacement.findMany({
      where: { status: { not: 'onhold' } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    defacementRoutes = recent.map((d) => ({
      url: `${baseUrl}/defacement/${d.id}`,
      lastModified: d.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // If DB is unreachable (e.g., build-time), skip dynamic URLs.
  }

  return [...staticRoutes, ...defacementRoutes]
}
