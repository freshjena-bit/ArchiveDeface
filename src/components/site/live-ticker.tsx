'use client'

import * as React from 'react'
import useSWR from 'swr'
import { Radio } from 'lucide-react'
import { countryFlag, severityMeta, timeAgo } from '@/lib/site'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LiveTicker() {
  const { data } = useSWR<{ items: Defacement[] }>(
    '/api/defacements?limit=30',
    fetcher,
    { refreshInterval: 15000 }
  )
  const items = data?.items ?? []
  const loop = items.length ? [...items, ...items] : []
  const [paused, setPaused] = React.useState(false)

  return (
    <div className="border-b border-border/70 bg-card/30">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/70 bg-primary/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
          <Radio className="h-3 w-3 animate-pulse-dot" />
          live
        </div>
        <div
          className="relative flex-1 overflow-hidden mask-fade-r"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex w-max items-center" style={{ animationPlayState: paused ? 'paused' : 'running' }}>
            <div className="flex animate-marquee-fast items-center">
              {loop.map((d, i) => {
                const sev = severityMeta(d.severity)
                return (
                  <div
                    key={`${d.id}-${i}`}
                    className="flex items-center gap-1.5 border-r border-border/40 px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                  >
                    <span className={`h-1 w-1 rounded-full ${sev.dot}`} />
                    <span className="text-foreground">{d.attacker.handle}</span>
                    <span className="text-muted-foreground/50">›</span>
                    <span>{countryFlag(d.country)}</span>
                    <span className="max-w-[160px] truncate text-foreground/70">
                      {d.targetName}
                    </span>
                    <span className="text-muted-foreground/60">{timeAgo(d.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
