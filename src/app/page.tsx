import type { Metadata } from 'next'
import { HomeView } from '@/components/site/views/home-view'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'

// ISR: cache rendered page for 5 minutes, then revalidate in background.
// First request: fetch() to API endpoints → render → cache.
// Subsequent requests within 5 min: serve from ISR cache → instant.
// After 5 min: serve stale + revalidate in background (stale-while-revalidate).
//
// Previous force-dynamic rendered from scratch every request → slow.
// ISR caches the full rendered HTML → most requests are cache hits.
export const revalidate = 300 // 5 minutes

export const fetchCache = 'default-cache' // cache fetch results

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
  // fetch results are cached by Next.js (revalidate: 300 = 5 min).
  // API endpoints ALSO have CDN edge cache (s-maxage=300-600).
  // Double caching: Next.js ISR cache + Vercel CDN cache = very fast.
  const [statsRes, leaderboardRes, recentRes, newsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/stats`, { next: { revalidate: 300 } }).catch(() => null),
    fetch(`${BASE_URL}/api/leaderboard?mode=defacers`, { next: { revalidate: 300 } }).catch(() => null),
    fetch(`${BASE_URL}/api/defacements?limit=10`, { next: { revalidate: 300 } }).catch(() => null),
    fetch(`${BASE_URL}/api/news`, { next: { revalidate: 300 } }).catch(() => null),
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
