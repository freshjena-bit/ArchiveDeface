'use client'

import * as React from 'react'
import { SiteHeader } from '@/components/site/site-header'
import { StatsBar } from '@/components/site/stats-bar'
import { LiveTicker } from '@/components/site/live-ticker'
import { ArchiveTable } from '@/components/site/archive-table'
import { Sidebar } from '@/components/site/sidebar'
import { FullLeaderboard } from '@/components/site/leaderboard'
import { SubmitForm } from '@/components/site/submit-form'
import { SiteFooter } from '@/components/site/site-footer'

export default function Home() {
  const scrollToSubmit = React.useCallback(() => {
    document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader onOpenSubmit={scrollToSubmit} />
      <main className="flex-1">
        <StatsBar />
        <LiveTicker />

        {/* main 2-column: archive table + sidebar */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <ArchiveTable />
            </div>
            <div className="lg:col-span-4">
              <Sidebar />
            </div>
          </div>
        </div>

        <FullLeaderboard />
        <SubmitForm />
      </main>
      <SiteFooter />
    </div>
  )
}
