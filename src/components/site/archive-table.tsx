'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  Search, ExternalLink, ChevronsUpDown, RotateCcw, ShieldCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, countryName, severityMeta, categoryMeta, timeAgo } from '@/lib/site'
import { MirrorViewer } from '@/components/site/mirror-viewer'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = ['gov', 'edu', 'com', 'org', 'mil', 'fin']

function fmtDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yy} ${hh}:${mi}`
}

export function ArchiveTable() {
  const [q, setQ] = React.useState('')
  const [category, setCategory] = React.useState<string>('')
  const [page, setPage] = React.useState(0)
  const [selected, setSelected] = React.useState<Defacement | null>(null)
  const pageSize = 25

  const debounced = React.useDeferredValue(q)
  React.useEffect(() => setPage(0), [debounced, category])

  const params = new URLSearchParams({
    limit: String(pageSize),
    offset: String(page * pageSize),
  })
  if (debounced) params.set('q', debounced)
  if (category) params.set('category', category)

  const { data, isLoading } = useSWR<{ items: Defacement[]; total: number }>(
    `/api/defacements?${params}`,
    fetcher,
    { refreshInterval: 20000 }
  )

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <section id="archive" className="scroll-mt-14">
      {/* header row */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Recent Defacements
          </h2>
          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll">
          <button
            onClick={() => setCategory('')}
            className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              !category
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            all
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? '' : c)}
              className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                category === c
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* search */}
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search attacker, target or url…"
          className="h-9 border-border/60 bg-card/60 pl-8 font-mono text-xs"
        />
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
        {/* head */}
        <div className="hidden grid-cols-12 gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Defacer</div>
          <div className="col-span-4">Target</div>
          <div className="col-span-2">Country</div>
          <div className="col-span-2">Date</div>
        </div>
        <div className="hidden grid-cols-12 gap-2 border-b border-border/70 bg-muted/40 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:grid">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Defacer</div>
          <div className="col-span-4">Target</div>
          <div className="col-span-1">Cat</div>
          <div className="col-span-2">Country</div>
          <div className="col-span-1 text-right">View</div>
        </div>

        {/* rows */}
        <div className="divide-y divide-border/40">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="px-3 py-2.5">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            : !data?.items?.length
            ? <EmptyRow />
            : data.items.map((d, i) => <Row key={d.id} d={d} index={i + page * pageSize} onOpen={setSelected} />)}
        </div>

        {/* footer / pagination */}
        <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-3 py-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            showing {data?.items?.length ?? 0} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-7 gap-1 px-2 font-mono text-[10px]"
            >
              <ChevronsUpDown className="h-3 w-3 rotate-180" />
              prev
            </Button>
            <span className="font-mono text-[10px] text-muted-foreground">
              {page + 1}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="h-7 gap-1 px-2 font-mono text-[10px]"
            >
              next
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
          </div>
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

function Row({ d, index, onOpen }: { d: Defacement; index: number; onOpen: (d: Defacement) => void }) {
  const sev = severityMeta(d.severity)
  const cat = categoryMeta(d.category)
  const StatusIcon = d.status === 'restored' ? RotateCcw : ShieldCheck

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpen(d)}
      className="group grid cursor-pointer grid-cols-12 gap-2 px-3 py-2.5 transition-colors hover:bg-primary/[0.06]"
    >
      {/* # */}
      <div className="col-span-1 font-mono text-[11px] text-muted-foreground tabular-nums">
        {String(index + 1).padStart(3, '0')}
      </div>

      {/* defacer */}
      <div className="col-span-3 flex items-center gap-2">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-sm font-mono text-[9px] font-bold text-black"
          style={{ background: d.attacker.color }}
        >
          {d.attacker.handle.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] font-semibold text-foreground">
            {d.attacker.handle}
          </div>
          {d.attacker.team && (
            <div className="truncate font-mono text-[9px] text-muted-foreground">
              {d.attacker.team}
            </div>
          )}
        </div>
      </div>

      {/* target */}
      <div className="col-span-4 min-w-0">
        <div className="truncate font-mono text-[11px] text-foreground">
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
      </div>

      {/* category (lg only) */}
      <div className="col-span-1 hidden items-center lg:flex">
        <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
          {cat.label.slice(0, 3)}
        </span>
      </div>

      {/* country */}
      <div className="col-span-2 flex items-center gap-1.5">
        <span className="text-sm">{countryFlag(d.country)}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {d.country}
        </span>
        <span
          className={`ml-auto hidden h-1.5 w-1.5 rounded-full ${sev.dot} lg:block`}
          title={`severity: ${sev.label}`}
        />
      </div>

      {/* date / view */}
      <div className="col-span-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {fmtDate(d.createdAt)}
          </div>
          <div className="font-mono text-[9px] text-muted-foreground/60">
            {timeAgo(d.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(d) }}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-sm border border-border/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary group-hover:border-primary/40"
          title="view mirror snapshot"
          aria-label="view mirror snapshot"
        >
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <Search className="h-5 w-5 text-muted-foreground" />
      <div className="font-mono text-xs text-foreground">no records match the query</div>
    </div>
  )
}
