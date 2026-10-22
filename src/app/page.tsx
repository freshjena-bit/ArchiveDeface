import type { Metadata } from 'next'
import { HomeView } from '@/components/site/views/home-view'
import { getStats } from '@/lib/stats'
import { getLeaderboard, getRecentDefacements, getLatestNews } from '@/lib/leaderboard'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'

// Cache SSR result for 60 seconds — reduces DB queries from
// every-request to every-60s. Major egress reduction.
export const revalidate = 60

export const metadata: Metadata = {
  title: 'DEFACERZONEID — Defacement Archive & Top Defacers Leaderboard',
  description:
    'Open archive of website defacement incidents with mirror snapshots, attacker attribution, and a live top-defacers leaderboard. Browse 300K+ records by country, category, severity.',
  alternates: { canonical: 'https://defacer.zone.id' },
  openGraph: {
    title: 'DEFACERZONEID — Defacement Archive',
    description:
      'Open archive of website defacement incidents and top defacers leaderboard. 300K+ records with mirror snapshots.',
    type: 'website',
    siteName: 'DEFACERZONEID',
  },
}

export default async function Home() {
  const [stats, leaderboard, recent, news] = await Promise.all([
    getStats().catch(() => undefined),
    getLeaderboard({ mode: 'defacers' }).catch(() => undefined),
    getRecentDefacements(10).catch(() => [] as Defacement[]),
    getLatestNews(3).catch(() => []),
  ])

  return (
    <HomeView
      initialStats={stats as Stats | undefined}
      initialLeaderboard={leaderboard?.items as LeaderEntry[] | undefined}
      initialRecent={recent as Defacement[]}
      initialNews={news}
    />
  )
}
