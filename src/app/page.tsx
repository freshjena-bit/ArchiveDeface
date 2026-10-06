'use client'

import * as React from 'react'
import { SiteHeader } from '@/components/site/site-header'
import { Hero } from '@/components/site/hero'
import { LiveTicker } from '@/components/site/live-ticker'
import { StatsGrid } from '@/components/site/stats-grid'
import { DefacementsFeed } from '@/components/site/defacements-feed'
import { Leaderboard } from '@/components/site/leaderboard'
import { SubmitReport } from '@/components/site/submit-report'
import { SiteFooter } from '@/components/site/site-footer'
import { Manifesto } from '@/components/site/manifesto'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function Home() {
  const [submitOpen, setSubmitOpen] = React.useState(false)
  const { data } = useSWR<{ counters: { todayAttacks: number } }>(
    '/api/stats',
    fetcher,
    { refreshInterval: 30000 }
  )
  const todayAttacks = data?.counters?.todayAttacks ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader onOpenSubmit={() => setSubmitOpen(true)} />
      <main className="flex-1">
        <Hero todayAttacks={todayAttacks} />
        <LiveTicker />
        <StatsGrid />
        <DefacementsFeed />
        <Leaderboard />
        <Manifesto onOpenSubmit={() => setSubmitOpen(true)} />
        <SubmitReport open={submitOpen} onOpenChange={setSubmitOpen} />
      </main>
      <SiteFooter />
    </div>
  )
}
