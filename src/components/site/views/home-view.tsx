'use client'

import * as React from 'react'
import { Activity } from 'lucide-react'
import { StatsBar } from '@/components/site/stats-bar'
import { LiveTicker } from '@/components/site/live-ticker'
import { HomeRecent } from './home-recent'
import { HomeTopDefacers } from './home-top-defacers'
import { HomeLatestNews } from './home-latest-news'
import { useRouter } from 'next/navigation'

export function HomeView() {
  const router = useRouter()

  return (
    <>
      <StatsBar />
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Latest news (top, full-width, 3-col on lg) */}
        <div className="mb-6">
          <HomeLatestNews />
        </div>

        {/* Recent preview + Top defacers (2-col) */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Latest Activity
              </h2>
            </div>
            <HomeRecent onViewAll={() => router.push('/archive')} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <div className="mb-3" />
            <HomeTopDefacers />
          </div>
        </div>
      </div>
    </>
  )
}
