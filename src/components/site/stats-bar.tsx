'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Database, CalendarDays, CalendarRange, Users, Globe2, Server } from 'lucide-react'
import type { Stats } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function StatsBar() {
  const { data } = useSWR<Stats>('/api/stats', fetcher, { refreshInterval: 30000 })
  const c = data?.counters

  // derive "this month" from timeseries sum
  const month = React.useMemo(() => {
    if (!data?.timeseries) return 0
    return data.timeseries.reduce((a, b) => a + b.count, 0)
  }, [data])

  const items = [
    { label: 'Total Defacements', value: c?.totalDefacements ?? 0, icon: Database },
    { label: 'Today', value: c?.todayAttacks ?? 0, icon: CalendarDays, accent: true },
    { label: 'This Month', value: month, icon: CalendarRange },
    { label: 'Defacers', value: c?.totalAttackers ?? 0, icon: Users },
    { label: 'Countries', value: c?.totalCountries ?? 0, icon: Globe2 },
    { label: 'Servers Mirrored', value: c?.totalDefacements ?? 0, icon: Server },
  ]

  return (
    <section id="home" className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* title row */}
        <div className="flex flex-col gap-1 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight sm:text-2xl">
              The Defacement Archive
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Open record of website defacement incidents, mirror snapshots and
              attacker attribution.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
            live · updated every 30s
          </div>
        </div>

        {/* counters */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 sm:grid-cols-6">
          {items.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={`flex flex-col gap-0.5 bg-card px-3 py-3 ${it.accent ? 'bg-primary/[0.06]' : ''}`}
            >
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <it.icon className={`h-3 w-3 ${it.accent ? 'text-primary' : ''}`} />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  {it.label}
                </span>
              </div>
              <div
                className={`font-mono text-xl font-bold tabular-nums ${
                  it.accent ? 'text-primary text-accent-glow' : 'text-foreground'
                }`}
              >
                {String(it.value).padStart(3, '0')}
              </div>
            </motion.div>
          ))}
        </div>

        {/* tiny disclaimer line */}
        <p className="py-2 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
          All records are fictional demo data. No real target is contacted, compromised or mirrored.
        </p>
      </div>
    </section>
  )
}
