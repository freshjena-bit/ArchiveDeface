'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Trophy, Flame, Globe2, Activity, Crown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, countryName } from '@/lib/site'
import type { LeaderEntry, Stats } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Sidebar() {
  const { data: lb } = useSWR<{ items: LeaderEntry[] }>('/api/leaderboard', fetcher, {
    refreshInterval: 30000,
  })
  const { data: stats } = useSWR<Stats>('/api/stats', fetcher, { refreshInterval: 30000 })

  const top = (lb?.items ?? []).slice(0, 10)
  const today = stats?.timeseries?.[stats.timeseries.length - 1]?.count ?? 0
  const yesterday = stats?.timeseries?.[stats.timeseries.length - 2]?.count ?? 0
  const delta = today - yesterday
  const countries = (stats?.countries ?? []).slice(0, 8)

  return (
    <aside id="top" className="scroll-mt-14 space-y-4">
      {/* Top Defacers */}
      <Panel
        title="Top Defacers"
        icon={Trophy}
        right={<span className="font-mono text-[10px] text-muted-foreground">all time</span>}
      >
        <ol className="divide-y divide-border/40">
          {top.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </li>
              ))
            : top.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-primary/[0.04]"
                >
                  <span
                    className={`w-5 shrink-0 text-center font-mono text-[11px] font-bold ${
                      e.rank === 1
                        ? 'text-term-amber'
                        : e.rank <= 3
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {e.rank === 1 ? (
                      <Crown className="mx-auto h-3.5 w-3.5 text-term-amber" />
                    ) : (
                      String(e.rank).padStart(2, '0')
                    )}
                  </span>
                  <a
                    href={`#/defacer/${encodeURIComponent(e.handle)}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
                    style={{ background: e.color }}
                  >
                    {e.handle.slice(0, 2).toUpperCase()}
                  </a>
                  <div className="min-w-0 flex-1">
                    <a
                      href={`#/defacer/${encodeURIComponent(e.handle)}`}
                      className="block truncate font-mono text-[11px] text-foreground hover:text-primary"
                    >
                      {e.handle}
                    </a>
                    <div className="truncate font-mono text-[9px] text-muted-foreground">
                      {e.team ?? 'INDEPENDENT'} · {countryFlag(e.country)}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary tabular-nums">
                    <Flame className="h-3 w-3" />
                    {e.totalHits}
                  </span>
                </li>
              ))}
        </ol>
        <a
          href="#leaderboard-full"
          className="block border-t border-border/40 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          view full ranking →
        </a>
      </Panel>

      {/* Today */}
      <Panel title="Today" icon={Activity}>
        <div className="p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                incidents (24h)
              </div>
              <div className="font-mono text-3xl font-bold tabular-nums text-primary text-accent-glow">
                {String(today).padStart(3, '0')}
              </div>
            </div>
            <div
              className={`font-mono text-[11px] ${
                delta >= 0 ? 'text-primary' : 'text-destructive'
              }`}
            >
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs yesterday
            </div>
          </div>
        </div>
      </Panel>

      {/* Countries */}
      <Panel title="Top Countries" icon={Globe2}>
        <ul className="divide-y divide-border/40">
          {countries.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="px-3 py-2">
                  <Skeleton className="h-3 w-full" />
                </li>
              ))
            : countries.map((c, i) => {
                const max = countries[0]?.count || 1
                const pct = Math.round((c.count / max) * 100)
                return (
                  <li key={c.code} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm">{countryFlag(c.code)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {countryName(c.code)}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-border/40">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-7 text-right font-mono text-[11px] font-bold text-primary tabular-nums">
                        {c.count}
                      </span>
                    </div>
                  </li>
                )
              })}
        </ul>
      </Panel>
    </aside>
  )
}

function Panel({
  title,
  icon: Icon,
  right,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
