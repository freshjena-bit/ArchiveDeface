'use client'

import * as React from 'react'
import useSWR from 'swr'
import { User, Users, Calendar } from 'lucide-react'
import { FullLeaderboard } from '@/components/site/leaderboard'
import { TeamsLeaderboard, type TeamEntry } from '@/components/site/teams-leaderboard'
import { PageHeader } from './page-header'
import { cn } from '@/lib/utils'
import type { LeaderEntry } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type LbResponse =
  | { mode: 'defacers'; year: string; years: number[]; items: LeaderEntry[] }
  | { mode: 'teams'; year: string; years: number[]; items: TeamEntry[] }

export function RankingView() {
  const [mode, setMode] = React.useState<'defacers' | 'teams'>('defacers')
  const [year, setYear] = React.useState<string>('all')

  const { data, isLoading } = useSWR<LbResponse>(
    `/api/leaderboard?mode=${mode}&year=${year}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const years = data?.years ?? []
  const items = (data?.items ?? []) as never[]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="hall of fame"
        title="Top Defacers — Ranking"
        desc="Researchers & crews ranked by attributed, mirror-verified incidents. Filter by year or view all-time."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {/* year selector */}
            <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/40 px-2 py-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-transparent font-mono text-[11px] uppercase tracking-wider text-foreground outline-none"
              >
                <option value="all">All Time</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {/* mode toggle */}
            <div className="inline-flex rounded-md border border-border/70 bg-card/40 p-0.5">
              <button
                onClick={() => setMode('defacers')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                  mode === 'defacers'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="h-3.5 w-3.5" />
                Defacers
              </button>
              <button
                onClick={() => setMode('teams')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                  mode === 'teams'
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Teams
              </button>
            </div>
          </div>
        }
      />
      {mode === 'defacers' ? (
        <FullLeaderboard items={items as LeaderEntry[]} isLoading={isLoading} />
      ) : (
        <TeamsLeaderboard items={items as TeamEntry[]} isLoading={isLoading} />
      )}
    </div>
  )
}
