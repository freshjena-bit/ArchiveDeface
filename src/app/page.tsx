'use client'

import * as React from 'react'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { HomeView } from '@/components/site/views/home-view'
import { ArchiveView } from '@/components/site/views/archive-view'
import { RankingView } from '@/components/site/views/ranking-view'
import { SubmitView } from '@/components/site/views/submit-view'
import { AboutView } from '@/components/site/views/about-view'
import { useHashRoute } from '@/lib/use-hash-route'

export default function Home() {
  const { route } = useHashRoute()

  // scroll to top on every route change → feels like a real page redirect
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {route === 'home' && <HomeView />}
        {route === 'archive' && <ArchiveView />}
        {route === 'ranking' && <RankingView />}
        {route === 'submit' && <SubmitView />}
        {route === 'about' && <AboutView />}
      </main>
      <SiteFooter />
    </div>
  )
}
