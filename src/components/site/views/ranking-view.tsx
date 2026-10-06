'use client'

import { FullLeaderboard } from '@/components/site/leaderboard'
import { PageHeader } from './page-header'

export function RankingView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="hall of fame"
        title="Top Defacers — Ranking"
        desc="Researchers ranked by attributed, mirror-verified incidents. Ranks recalculate live as the registry grows."
      />
      <FullLeaderboard />
    </div>
  )
}
