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
  try {
    const data = await getDefacerData(decoded)
    if (data) {
      title = `${decoded} — ${data.totalHits} defacements — DEFACERZONEID`
      description = `${decoded} (${data.team ?? 'INDEPENDENT'}, ${data.country ?? 'unknown'}) has ${data.totalHits} archived defacements. View full record and timeline.`
    }
  } catch {
    // ignore
  }
  return {
    title,
    description,
    alternates: { canonical: `https://defacer.zone.id/defacer/${decoded}` },
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { handle } = await params
  const decoded = decodeURIComponent(handle)
  const initialData = await getDefacerData(decoded).catch(() => null)
  return <DefacerView handle={decoded} initialData={initialData} />
}
