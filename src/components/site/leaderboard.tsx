'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Trophy, Crown, Medal, Award, Flame, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, countryName } from '@/lib/site'
import type { LeaderEntry } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Leaderboard() {
  const { data, isLoading } = useSWR<{ items: LeaderEntry[] }>(
    '/api/leaderboard',
    fetcher,
    { refreshInterval: 30000 }
  )
  const items = data?.items ?? []
  const podium = items.slice(0, 3)
  const rest = items.slice(3)

  return (
    <section id="leaderboard" className="relative border-t border-border/60 py-16">
      <div className="absolute inset-0 -z-10 bg-grid-sm opacity-30" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            {'// hall of fame'}
          </div>
          <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
            Top researchers
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ranked by attributed, mirror-verified incidents. Ranks shift in real
            time as the registry grows. No bounties, just the record.
          </p>
        </div>

        {/* podium */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/70 bg-card/50 p-5">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-24" />
                </div>
              ))
            : podium.map((p, i) => <Podium key={p.id} entry={p} place={i + 1} />)}
        </div>

        {/* rest of the table */}
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/50 backdrop-blur">
          <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-card/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-1">#</div>
            <div className="col-span-4">researcher</div>
            <div className="col-span-3">crew</div>
            <div className="col-span-2">origin</div>
            <div className="col-span-2 text-right">incidents</div>
          </div>
          <div className="divide-y divide-border/40">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))
              : rest.map((e, i) => <LeaderRow key={e.id} entry={e} delay={i * 0.04} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function Podium({ entry, place }: { entry: LeaderEntry; place: number }) {
  const meta = {
    1: { icon: Crown, label: '1ST', color: 'text-term-amber', glow: 'box-glow-amber', ring: 'border-term-amber/50', grad: 'from-term-amber/20' },
    2: { icon: Medal, label: '2ND', color: 'text-term-green', glow: 'box-glow', ring: 'border-primary/50', grad: 'from-primary/15' },
    3: { icon: Award, label: '3RD', color: 'text-orange-400', glow: '', ring: 'border-orange-400/40', grad: 'from-orange-400/15' },
  }[place as 1 | 2 | 3]

  const order = place === 1 ? 'sm:order-2' : place === 2 ? 'sm:order-1' : 'sm:order-3'
  const scale = place === 1 ? 'sm:scale-105' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: (place - 1) * 0.08 }}
      className={`relative overflow-hidden rounded-lg border ${meta.ring} bg-gradient-to-b ${meta.grad} to-card/40 p-5 ${order} ${scale} ${meta.glow}`}
    >
      <div className="absolute right-3 top-3">
        <meta.icon className={`h-6 w-6 ${meta.color}`} />
      </div>
      <div className="flex items-center gap-3">
        <div
          className="grid h-14 w-14 place-items-center rounded-full font-mono text-base font-extrabold text-black"
          style={{ background: entry.color, boxShadow: `0 0 18px ${entry.color}55` }}
        >
          {entry.handle.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className={`font-mono text-[11px] font-bold ${meta.color}`}>{meta.label}</div>
          <div className="font-mono text-base font-bold text-foreground">{entry.handle}</div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {entry.team ?? 'INDEPENDENT'}
          </div>
        </div>
      </div>
      {entry.bio && (
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          “{entry.bio}”
        </p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          {countryFlag(entry.country)} {countryName(entry.country)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-lg font-bold text-glow">
          <Flame className="h-4 w-4 text-primary" />
          {entry.totalHits}
        </span>
      </div>
    </motion.div>
  )
}

function LeaderRow({ entry, delay }: { entry: LeaderEntry; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="group grid grid-cols-2 gap-2 px-4 py-3 transition-colors hover:bg-primary/[0.04] sm:grid-cols-12 sm:items-center sm:gap-3"
    >
      <div className="col-span-1 font-mono text-xs font-bold text-muted-foreground">
        <span className="text-primary/80">#{String(entry.rank).padStart(2, '0')}</span>
      </div>
      <div className="col-span-1 flex items-center gap-2 sm:col-span-4">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded font-mono text-[10px] font-bold text-black"
          style={{ background: entry.color }}
        >
          {entry.handle.slice(0, 2).toUpperCase()}
        </span>
        <span className="truncate font-mono text-xs font-semibold text-foreground">
          {entry.handle}
        </span>
        {entry.rank <= 5 && (
          <Sparkles className="h-3 w-3 shrink-0 text-term-amber" />
        )}
      </div>
      <div className="col-span-1 truncate font-mono text-[11px] text-muted-foreground sm:col-span-3">
        {entry.team ?? 'INDEPENDENT'}
      </div>
      <div className="col-span-1 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:col-span-2">
        <span>{countryFlag(entry.country)}</span>
        <span className="hidden sm:inline">{countryName(entry.country)}</span>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1 font-mono text-sm font-bold text-primary sm:col-span-2">
        <Flame className="h-3.5 w-3.5" />
        {entry.totalHits}
      </div>
    </motion.div>
  )
}
