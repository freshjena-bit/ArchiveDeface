'use client'

import * as React from 'react'
import { Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Stats, LeaderEntry, Defacement } from '@/lib/types'
import { StatsBar } from '@/components/site/stats-bar'
import { LiveTicker } from '@/components/site/live-ticker'
import { HomeRecent } from './home-recent'
import { HomeTopDefacers } from './home-top-defacers'
import { HomeLatestNews } from './home-latest-news'

type NewsItem = {
  id: string
  title: string
  body: string
  author: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export function HomeView({
  initialStats,
  initialLeaderboard,
  initialRecent,
  initialNews,
}: {
  initialStats?: Stats
  initialLeaderboard?: LeaderEntry[]
  initialRecent?: Defacement[]
  initialNews?: NewsItem[]
}) {
  const router = useRouter()

  return (
    <>
      <StatsBar initialStats={initialStats} />
      <LiveTicker initialLatest={initialRecent?.[0]} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <HomeLatestNews initialItems={initialNews} />
        </div>
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Latest Activity
              </h2>
            </div>
            <HomeRecent items={initialRecent} onViewAll={() => router.push('/archive')} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <div className="mb-3" />
            <HomeTopDefacers initialItems={initialLeaderboard} />
          </div>
        </div>
      </div>
    </>
  )
}
