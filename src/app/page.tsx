import type { Metadata } from 'next'
import { HomeView } from '@/components/site/views/home-view'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'

// Force dynamic — don't prerender at build time (build was failing
// because DB queries timeout during static generation).
export const dynamic = 'force-dynamic'

// Use fetch() to call API endpoints instead of calling getStats() etc.
// directly. This leverages CDN edge cache:
// - Cache hit → 0 DB queries → instant response
// - Cache miss → API route queries DB → caches at edge
// Previous approach (calling functions directly) did 20+ sequential
// DB queries per render → 10-30s timeout with connection_limit=1.
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

const BASE_URL = 'https://defacer.zone.id'

export default async function Home() {
  // 4 parallel fetch() calls to API endpoints.
  // CDN cache (s-maxage=300 for stats, etc.) handles caching.
  // Cache hit = instant (0 DB queries). Cache miss = API queries DB.
  // All 4 run in parallel — total time = max(individual), not sum.
  const [statsRes, leaderboardRes, recentRes, newsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/stats`, { next: { revalidate: 60 } }).catch(() => null),
    fetch(`${BASE_URL}/api/leaderboard?mode=defacers`, { next: { revalidate: 60 } }).catch(() => null),
    fetch(`${BASE_URL}/api/defacements?limit=10`, { next: { revalidate: 60 } }).catch(() => null),
    fetch(`${BASE_URL}/api/news`, { next: { revalidate: 60 } }).catch(() => null),
  ])

  const stats = statsRes?.ok ? await statsRes.json().catch(() => undefined) : undefined
  const leaderboard = leaderboardRes?.ok ? await leaderboardRes.json().catch(() => undefined) : undefined
  const recent = recentRes?.ok ? await recentRes.json().catch(() => undefined) : undefined
  const news = newsRes?.ok ? await newsRes.json().catch(() => undefined) : undefined

  return (
    <HomeView
      initialStats={stats as Stats | undefined}
      initialLeaderboard={leaderboard?.items as LeaderEntry[] | undefined}
      initialRecent={recent?.items as Defacement[] | undefined}
      initialNews={news?.items ?? []}
    />
  )
}
