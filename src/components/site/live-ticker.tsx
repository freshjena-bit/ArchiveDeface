'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Radio, ArrowRight } from 'lucide-react'
import { countryFlag, severityMeta, timeAgo } from '@/lib/site'
import type { Defacement } from '@/lib/types'
import { useHashRoute } from '@/lib/use-hash-route'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LiveTicker() {
  const { navigate } = useHashRoute()
  const { data } = useSWR<{ items: Defacement[] }>(
    '/api/defacements?limit=1',
    fetcher,
    { refreshInterval: 15000 }
  )
  const latest = data?.items?.[0]

  return (
    <div className="border-b border-border/70 bg-card/30">
      <button
        onClick={() => navigate('/archive')}
        className="mx-auto flex w-full max-w-7xl items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-primary/[0.04] sm:px-6"
      >
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/70 pr-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
          <Radio className="h-3 w-3 animate-pulse-dot" />
          latest
        </div>
        {latest ? (
          <>
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
              style={{ background: latest.attacker.color }}
            >
              {latest.attacker.handle.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate font-mono text-[11px] text-foreground">
              {latest.attacker.handle}
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <span className="shrink-0 text-sm">{countryFlag(latest.country)}</span>
            <span className="hidden max-w-[220px] truncate font-mono text-[11px] text-foreground/70 sm:inline">
              {latest.targetName}
            </span>
            <span className="hidden font-mono text-[10px] text-muted-foreground/60 sm:inline">
              · {severityMeta(latest.severity).label}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
              {timeAgo(latest.createdAt)}
            </span>
          </>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground">
            awaiting first incident…
          </span>
        )}
      </button>
    </div>
  )
}
