'use client'

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { countryFlag, severityMeta, timeAgo } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm} ${hh}:${mi}`
}

export function HomeRecent({ onViewAll }: { onViewAll: () => void }) {
  const { data, isLoading } = useSWR<{ items: Defacement[] }>(
    '/api/defacements?limit=10',
    fetcher,
    { refreshInterval: 15000 }
  )
  const items = data?.items ?? []

  return (
    <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider">
          Recent Defacements
        </h2>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          view all
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="overflow-x-auto thin-scroll">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <tbody className="divide-y divide-border/40">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-3 py-2.5">
                      <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                    </td>
                  </tr>
                ))
              : items.map((d) => {
                  const sev = severityMeta(d.severity)
                  return (
                    <tr
                      key={d.id}
                      onClick={onViewAll}
                      className="group cursor-pointer transition-colors hover:bg-primary/[0.06]"
                    >
                      <td className="w-8 px-3 py-2 text-center align-middle">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <Link
                          href={`/defacer/${encodeURIComponent(d.attacker.handle)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 hover:opacity-90"
                        >
                          <span
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
                            style={{ background: d.attacker.color }}
                          >
                            {d.attacker.handle.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate font-mono text-[11px] font-semibold text-foreground">
                            {d.attacker.handle}
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <div className="truncate font-mono text-[11px] text-foreground" title={d.targetName}>
                          {d.targetName}
                        </div>
                        <a
                          href={d.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="block max-w-full truncate font-mono text-[9px] text-muted-foreground hover:text-primary"
                        >
                          {d.targetUrl.replace(/^https?:\/\//, '')}
                        </a>
                      </td>
                      <td className="w-24 px-2 py-2 align-middle">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-sm">{countryFlag(d.country)}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {d.country}
                          </span>
                        </span>
                      </td>
                      <td className="w-36 px-2 py-2 align-middle">
                        <DefacementMarks
                          marks={{
                            isHomepage: d.isHomepage,
                            isMass: d.isMass,
                            isRedeface: d.isRedeface,
                            isSpecial: d.isSpecial,
                          }}
                        />
                      </td>
                      <td className="w-28 px-2 py-2 text-right align-middle">
                        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {fmtDate(d.createdAt)}
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground/60">
                          {timeAgo(d.createdAt)}
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border/40 bg-muted/20 px-3 py-1 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 sm:hidden">
        ← swipe to see all columns →
      </div>
    </div>
  )
}
