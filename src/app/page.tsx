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
  // SEQUENTIAL data fetches (NOT Promise.all) — avoids connection pool
  // contention with connection_limit=1 (PgBouncer transaction mode).
  // Each function does multiple DB queries; running them in parallel
  // causes timeout → .catch() returns undefined → UI shows zeros.
  // Sequential = each function's queries complete before next starts.
  const stats = await getStats().catch(() => undefined as Stats | undefined)
  const leaderboard = await getLeaderboard({ mode: 'defacers' }).catch(() => undefined)
  const recent = await getRecentDefacements(10).catch(() => [] as Defacement[])
  const news = await getLatestNews(3).catch(() => [])

  return (
    <HomeView
      initialStats={stats as Stats | undefined}
      initialLeaderboard={leaderboard?.items as LeaderEntry[] | undefined}
      initialRecent={recent as Defacement[]}
      initialNews={news}
    />
  )
}
