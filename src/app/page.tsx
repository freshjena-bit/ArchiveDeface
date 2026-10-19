import { HomeView } from '@/components/site/views/home-view'
import { getStats } from '@/lib/stats'
import { getLeaderboard, getRecentDefacements, getLatestNews } from '@/lib/leaderboard'
import type { Stats, LeaderEntry } from '@/lib/types'
import type { Defacement } from '@/lib/types'

// Server-side fetch ALL homepage data so the initial HTML contains
// real content (not loading skeletons) — Google crawler sees it.
export default async function Home() {
  // Fetch all data in parallel
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
