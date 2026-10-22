import type { Metadata } from 'next'
import { TeamView } from '@/components/site/views/team-view'

// 1-day ISR — team aggregate counts change slowly.
export const revalidate = 86400 // 1 day

type Params = Promise<{ name: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { name } = await params
  const decoded = decodeURIComponent(name)
  const title = `${decoded} — team profile — DEFACERZONEID`
  const description = `Defacer team ${decoded}: members, total archived defacements, country breakdown, and member leaderboard on DEFACERZONEID.`
  return {
    title,
    description,
    alternates: { canonical: `https://defacer.zone.id/team/${decoded}` },
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: { params: Params }) {
  const { name } = await params
  return <TeamView name={decodeURIComponent(name)} />
}
