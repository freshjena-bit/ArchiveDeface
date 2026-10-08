'use client'

import * as React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Star, ExternalLink } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, severityMeta, timeAgo } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import { MirrorViewer } from '@/components/site/mirror-viewer'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yy} ${hh}:${mi}`
}

export function SpecialArchiveTable() {
  const [selected, setSelected] = React.useState<Defacement | null>(null)
  const limit = 25

  const { data, isLoading } = useSWR<{ items: Defacement[]; total: number }>(
    `/api/defacements?special=all&limit=${limit}`,
    fetcher,
    { refreshInterval: 20000 }
  )
  const items = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <section id="special-archive" className="scroll-mt-14">
      {/* header */}
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-400" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
          Special Archive
        </h2>
        <span className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
          {total}
        </span>
        <span className="ml-auto truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
          every record flagged special
        </span>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-8 px-2 py-2 text-center">★</th>
                <th className="px-2 py-2 font-medium">Defacer</th>
                <th className="px-2 py-2 font-medium">Target</th>
                <th className="w-24 px-2 py-2 font-medium">Country</th>
                <th className="w-32 px-2 py-2 font-medium">Marks</th>
                <th className="w-32 px-2 py-2 font-medium">Date</th>
                <th className="w-12 px-2 py-2 text-center font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : !items.length
                ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center font-mono text-xs text-muted-foreground">
                      no special records in this archive
                    </td>
                  </tr>
                )
                : items.map((d, i) => {
                    const sev = severityMeta(d.severity)
                    return (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => setSelected(d)}
                        className="group cursor-pointer transition-colors hover:bg-amber-500/[0.05]"
                      >
                        <td className="px-2 py-2.5 text-center align-middle">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                        </td>
                        <td className="px-2 py-2.5 align-middle">
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
                            <span className="truncate font-mono text-[11px] font-semibold text-foreground group-hover:text-primary">
                              {d.attacker.handle}
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
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
                        <td className="px-2 py-2.5 align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-sm">{countryFlag(d.country)}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {d.country}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <DefacementMarks
                            marks={{
                              isHomepage: d.isHomepage,
                              isMass: d.isMass,
                              isRedeface: d.isRedeface,
                              isSpecial: d.isSpecial,
                            }}
                          />
                        </td>
                        <td className="px-2 py-2.5 align-middle">
                          <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                            {fmtDate(d.createdAt)}
                          </div>
                          <div className="font-mono text-[9px] text-muted-foreground/60">
                            {timeAgo(d.createdAt)}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center align-middle">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelected(d) }}
                            className="grid h-6 w-6 place-items-center rounded-sm border border-border/50 text-muted-foreground transition-colors hover:border-amber-500/50 hover:text-amber-400 group-hover:border-amber-500/40"
                            title="view mirror snapshot"
                            aria-label="view mirror snapshot"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/40 bg-muted/20 px-3 py-1.5 text-right font-mono text-[10px] text-muted-foreground">
          showing {items.length} of {total} special records
        </div>
      </div>

      <MirrorViewer
        record={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </section>
  )
}
