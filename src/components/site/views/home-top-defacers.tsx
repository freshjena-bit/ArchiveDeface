'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Trophy, Flame, Crown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag } from '@/lib/site'
import type { LeaderEntry } from '@/lib/types'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function HomeTopDefacers() {
  const router = useRouter()
  const { data, isLoading } = useSWR<{ items: LeaderEntry[] }>(
    '/api/leaderboard?mode=defacers',
    fetcher,
    { refreshInterval: 30000 }
  )
  const items = (data?.items ?? []).slice(0, 10)

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider">
            Top Defacers
          </h2>
        </div>
        <button
          onClick={() => router.push('/ranking')}
          className="font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          full ranking →
        </button>
      </div>
      <ol className="divide-y divide-border/40">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </li>
            ))
          : items.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-primary/[0.04]"
              >
                <span
                  className={`w-5 shrink-0 text-center font-mono text-[11px] font-bold ${
                    e.rank === 1
                      ? 'text-amber-400'
                      : e.rank <= 3
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {e.rank === 1 ? (
                    <Crown className="mx-auto h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    String(e.rank).padStart(2, '0')
                  )}
                </span>
                <a
                  href={`#/defacer/${encodeURIComponent(e.handle)}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black hover:opacity-90"
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
    </div>
  )
}
