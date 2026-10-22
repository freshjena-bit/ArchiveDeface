import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Don't crawl API endpoints — they're for the SPA, not for indexing.
        // (Crawling them would waste crawl budget without producing
        // indexable content.)
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://defacer.zone.id/sitemap.xml',
  }
}
