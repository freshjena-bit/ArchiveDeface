'use client'

import * as React from 'react'
import { User, Users } from 'lucide-react'
import { FullLeaderboard } from '@/components/site/leaderboard'
import { TeamsLeaderboard } from '@/components/site/teams-leaderboard'
import { PageHeader } from './page-header'
import { cn } from '@/lib/utils'

export function RankingView() {
  const [mode, setMode] = React.useState<'defacers' | 'teams'>('defacers')

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="hall of fame"
        title="Top Defacers — Ranking"
        desc="Researchers & crews ranked by attributed, mirror-verified incidents. Ranks recalculate live as the registry grows."
        right={
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
        }
      />
      {mode === 'defacers' ? <FullLeaderboard /> : <TeamsLeaderboard />}
    </div>
  )
}
