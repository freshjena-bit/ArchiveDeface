import type { Metadata } from 'next'
import { DefacementView } from '@/components/site/views/defacement-view'
import { readDb } from '@/lib/db'

// 30-day ISR — defacement records rarely change after being archived.
// Trade-off: content may be up to 30 days stale, but egress stays low.
// (When a record IS updated, on-demand revalidation can be triggered.)
export const revalidate = 2592000 // 30 days

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  let title = 'Defacement Record — DEFACERZONEID'
  let description =
    'Archived website defacement record with mirror snapshot, attacker attribution, and full timeline.'
  try {
    const d = await readDb((db) =>
      db.defacement.findUnique({
        where: { id },
        select: { targetName: true, country: true, category: true, createdAt: true },
      })
    )
    if (d) {
      title = `${d.targetName} — defacement archive`
      description = `Archived defacement of ${d.targetName} (${d.country}, ${d.category}) recorded on ${d.createdAt.toISOString().slice(0, 10)}. Mirror snapshot and attacker attribution included.`
    }
  } catch {
    // ignore — fall back to defaults
  }
  return {
    title,
    description,
    alternates: { canonical: `https://defacer.zone.id/defacement/${id}` },
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { id } = await params
  return <DefacementView id={id} />
}
