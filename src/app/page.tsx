import { HomeView } from '@/components/site/views/home-view'
import { getStats } from '@/lib/stats'
import { getLeaderboard, getRecentDefacements, getLatestNews } from '@/lib/leaderboard'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'

// Cache SSR result for 60 seconds — reduces DB queries from
// every-request to every-60s. Major egress reduction.
export const revalidate = 60

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
