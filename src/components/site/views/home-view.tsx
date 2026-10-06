'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Database, Trophy, Send, ArrowRight, Activity } from 'lucide-react'
import { StatsBar } from '@/components/site/stats-bar'
import { LiveTicker } from '@/components/site/live-ticker'
import { HomeRecent } from './home-recent'
import { HomeTopDefacers } from './home-top-defacers'
import { useHashRoute } from '@/lib/use-hash-route'

export function HomeView() {
  const { navigate } = useHashRoute()

  const ctas = [
    {
      title: 'Browse Archive',
      desc: 'Full registry with search, category filters, pagination and mirror snapshots.',
      icon: Database,
      route: 'archive' as const,
      cta: 'Open archive',
    },
    {
      title: 'Top Defacers',
      desc: 'Hall of fame — ranked leaderboard of attributed researchers.',
      icon: Trophy,
      route: 'ranking' as const,
      cta: 'View ranking',
    },
    {
      title: 'Submit Incident',
      desc: 'File a defacement with URLs, attacker, team, PoC and reason.',
      icon: Send,
      route: 'submit' as const,
      cta: 'File report',
    },
  ]

  return (
    <>
      <StatsBar />
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* CTA cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ctas.map((c, i) => (
            <motion.button
              key={c.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              onClick={() => navigate(`/${c.route}`)}
              className="group relative overflow-hidden rounded-md border border-border/70 bg-card/40 p-4 text-left transition-colors hover:border-primary/40"
            >
              <span className="grid h-9 w-9 place-items-center rounded-sm bg-primary/10 text-primary">
                <c.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 font-mono text-sm font-bold text-foreground">
                {c.title}
              </h3>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {c.desc}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                {c.cta}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
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
            <HomeRecent onViewAll={() => navigate('/archive')} />
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
