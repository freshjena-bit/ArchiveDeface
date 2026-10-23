import type { Metadata } from 'next'
import { HomeView } from '@/components/site/views/home-view'
import { getStats } from '@/lib/stats'
import { getLeaderboard, getRecentDefacements, getLatestNews } from '@/lib/leaderboard'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'

// Force dynamic — don't prerender at build time (build was failing
// because DB queries timeout during static generation with
// connection_limit=1 + pool_timeout=10). Page is rendered at runtime
// instead. CDN edge cache (via Cache-Control in layout) handles
// caching; Stat-table cache (src/lib/cache.ts) handles DB query caching.
export const dynamic = 'force-dynamic'
// Revalidate removed — force-dynamic takes precedence.
// CDN cache via Cache-Control headers handles response caching.

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
  // All data fetches have .catch() — if DB is unreachable, render with
  // undefined/empty data. The client-side components handle fetching
  // from /api/* as fallback.
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
