import type { Metadata } from 'next'
import { DefacerView } from '@/components/site/views/defacer-view'
import { getDefacerData } from '@/lib/defacer'

// 1-day ISR — hacker profile (totalHits, badges) may change with new submissions.
export const revalidate = 86400 // 1 day

type Params = Promise<{ handle: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params
  const decoded = decodeURIComponent(handle)
  let title = `${decoded} — defacer profile — DEFACERZONEID`
  let description = `Defacer profile for ${decoded}: archived defacements, team affiliation, country, and ranking on DEFACERZONEID.`
  let keywords: string[] = [decoded, 'defacer', 'defacement', 'hacker', 'archive']
  try {
    const data = await getDefacerData(decoded)
    if (data) {
      title = `${decoded} — ${data.totalHits} defacements — DEFACERZONEID`
      description = `${decoded} (${data.team ?? 'INDEPENDENT'}, ${data.country ?? 'unknown'}) has ${data.totalHits} archived defacements. View full record and timeline.`
      // Include tags in description for SEO — Google indexes tag keywords
      if (data.hacker.tags && data.hacker.tags.length > 0) {
        description += ` Tags: ${data.hacker.tags.join(', ')}.`
        keywords = [...keywords, ...data.hacker.tags]
      }
    }
  } catch {
    // ignore
  }
  return {
    title,
    description,
    keywords,
    alternates: { canonical: `https://defacer.zone.id/defacer/${decoded}` },
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { handle } = await params
  const decoded = decodeURIComponent(handle)
  const initialData = await getDefacerData(decoded).catch(() => null)

  // JSON-LD structured data for SEO — helps Google understand the
  // page is a Person/Profile with tags as keywords.
  const jsonLd = initialData ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: decoded,
    additionalName: initialData.hacker.handle,
    knowsAbout: initialData.hacker.tags ?? [],
    affiliation: initialData.hacker.team
      ? { '@type': 'Organization', name: initialData.hacker.team }
      : undefined,
    description: `${decoded} has ${initialData.totalHits} archived defacements on DEFACERZONEID${initialData.hacker.tags && initialData.hacker.tags.length > 0 ? `. Tags: ${initialData.hacker.tags.join(', ')}` : ''}`,
    url: `https://defacer.zone.id/defacer/${decoded}`,
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <DefacerView handle={decoded} initialData={initialData} />
    </>
  )
}
