import type { MetadataRoute } from 'next'

// Sitemap untuk Google Search Console.
//
// Catatan: site pakai hash routing (/#/archive, /#/news, dll).
// Google gak index hash fragment sebagai URL terpisah —
// semua route dianggap 1 URL yaitu `/`. Jadi sitemap cukup
// berisi homepage aja. Kalau mau tiap page ke-index terpisah,
// harus migrate ke App Router paths (/archive, /news, dll).
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://defacer.zone.id'
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]
}
