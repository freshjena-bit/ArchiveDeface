'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Users, Flame, Crown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export type TeamEntry = { team: string; members: number; totalHits: number; rank: number }

// deterministic accent color per team name
const COLORS = ['#22c55e', '#eab308', '#ef4444', '#06b6d4', '#a855f7', '#f97316', '#14b8a6', '#ec4899', '#84cc16', '#fb923c']
export function teamColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export function TeamsLeaderboard({ items, isLoading }: { items: TeamEntry[]; isLoading: boolean }) {
  const podium = items.slice(0, 3)

  return (
    <section className="scroll-mt-14">
      {/* podium */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-md border border-border/70 bg-card/40">
                <Skeleton className="m-3 h-4 w-20" />
              </div>
            ))
          : podium.map((t, i) => (
              <motion.div
                key={t.team}
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
                  style={{ background: teamColor(t.team) }}
                >
                  {t.team.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        i === 0 ? 'text-amber-400' : 'text-primary'
                      }`}
                    >
                      {i === 0 ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : `#${i + 1}`}
                    </span>
                    <a
                      href={`#/team/${encodeURIComponent(t.team)}`}
                      className="truncate font-mono text-xs font-bold text-foreground hover:text-primary"
                    >
                      {t.team}
                    </a>
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {t.members} member{t.members === 1 ? '' : 's'}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-primary tabular-nums">
                  <Flame className="h-3 w-3" />
                  {t.totalHits}
                </span>
              </motion.div>
            ))}
      </div>

      {/* full table */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
        <div className="grid grid-cols-12 gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
          <div className="col-span-1">Rank</div>
          <div className="col-span-6">Team / Crew</div>
          <div className="col-span-3 text-right sm:col-span-3">Members</div>
          <div className="col-span-2 text-right">Incidents</div>
        </div>
        <div className="divide-y divide-border/40">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-3 py-2.5">
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            : items.map((t, i) => (
                <motion.div
                  key={t.team}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 transition-colors hover:bg-primary/[0.04]"
                >
                  <div className="col-span-1 font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
                    {t.rank <= 3 ? (
                      <span className="text-primary">{`#${t.rank}`}</span>
                    ) : (
                      `#${t.rank}`
                    )}
                  </div>
                  <div className="col-span-6 flex items-center gap-2">
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
                      style={{ background: teamColor(t.team) }}
                    >
                      {t.team.slice(0, 2)}
                    </span>
                    <a
                      href={`#/team/${encodeURIComponent(t.team)}`}
                      className="truncate font-mono text-[11px] font-semibold text-foreground hover:text-primary"
                    >
                      {t.team}
                    </a>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                    <Users className="h-3 w-3" />
                    {t.members}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[11px] font-bold text-primary tabular-nums">
                    {t.totalHits}
                  </div>
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  )
}
