'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Trophy, Flame, Crown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, countryName } from '@/lib/site'
import type { LeaderEntry } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function FullLeaderboard() {
  const { data, isLoading } = useSWR<{ items: LeaderEntry[] }>(
    '/api/leaderboard',
    fetcher,
    { refreshInterval: 30000 }
  )
  const items = data?.items ?? []
  const podium = items.slice(0, 3)

  return (
    <section id="leaderboard-full" className="scroll-mt-14 border-t border-border/70 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Hall of Fame · Full Ranking
          </h2>
          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {items.length}
          </span>
        </div>

        {/* podium */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-md border border-border/70 bg-card/40">
                  <Skeleton className="m-3 h-4 w-20" />
                </div>
              ))
            : podium.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className={`flex items-center gap-3 rounded-md border bg-card/40 p-3 ${
                    i === 0
                      ? 'border-amber-500/40'
                      : i === 1
                      ? 'border-primary/40'
                      : 'border-border/70'
                  }`}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-xs font-extrabold text-black"
                    style={{ background: p.color }}
                  >
                    {p.handle.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          i === 0 ? 'text-amber-400' : 'text-primary'
                        }`}
                      >
                        {i === 0 ? (
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                      <a
                        href={`#/defacer/${encodeURIComponent(p.handle)}`}
                        className="truncate font-mono text-xs font-bold text-foreground hover:text-primary"
                      >
                        {p.handle}
                      </a>
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {p.team ?? 'INDEPENDENT'} · {countryFlag(p.country)} {countryName(p.country)}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-primary tabular-nums">
                    <Flame className="h-3 w-3" />
                    {p.totalHits}
                  </span>
                </motion.div>
              ))}
        </div>

        {/* full table */}
        <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
          <div className="hidden grid-cols-12 gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Defacer</div>
            <div className="col-span-3">Team</div>
            <div className="col-span-3">Origin</div>
            <div className="col-span-1 text-right">Hits</div>
          </div>
          <div className="divide-y divide-border/40">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              : items.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                    className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 transition-colors hover:bg-primary/[0.04]"
                  >
                    <div className="col-span-1 font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
                      {e.rank <= 3 ? (
                        <span className="text-primary">{`#${e.rank}`}</span>
                      ) : (
                        `#${e.rank}`
                      )}
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
                        style={{ background: e.color }}
                      >
                        {e.handle.slice(0, 2).toUpperCase()}
                      </span>
                      <a
                        href={`#/defacer/${encodeURIComponent(e.handle)}`}
                        className="truncate font-mono text-[11px] font-semibold text-foreground hover:text-primary"
                      >
                        {e.handle}
                      </a>
                    </div>
                    <div className="col-span-3 truncate font-mono text-[10px] text-muted-foreground">
                      {e.team ?? 'INDEPENDENT'}
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                      <span>{countryFlag(e.country)}</span>
                      <span>{countryName(e.country)}</span>
                    </div>
                    <div className="col-span-1 text-right font-mono text-[11px] font-bold text-primary tabular-nums">
                      {e.totalHits}
                    </div>
                  </motion.div>
                ))}
          </div>
        </div>
      </div>
    </section>
  )
}
