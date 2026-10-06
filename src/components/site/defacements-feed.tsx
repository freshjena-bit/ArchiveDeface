'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ExternalLink, Link2, Filter, ChevronsUpDown, ShieldCheck, RotateCcw,
  Landmark, GraduationCap, Building2, UsersRound, Shield, Banknote, Folder,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { countryFlag, countryName, severityMeta, timeAgo, categoryMeta } from '@/lib/site'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gov: Landmark,
  edu: GraduationCap,
  com: Building2,
  org: UsersRound,
  mil: Shield,
  fin: Banknote,
}

const CATEGORIES = ['gov', 'edu', 'com', 'org', 'mil', 'fin']

export function DefacementsFeed() {
  const [q, setQ] = React.useState('')
  const [category, setCategory] = React.useState<string>('')
  const [page, setPage] = React.useState(0)
  const pageSize = 12

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
    <section id="archive" className="relative border-t border-border/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              {'// archive'}
            </div>
            <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
              Incident registry
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every record carries an attacker signature, target metadata, and a
              mirror snapshot link. Full-text search across target, URL and note.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-primary">{total}</span> records ·{' '}
            <span className="text-muted-foreground/60">
              page {page + 1}/{totalPages}
            </span>
          </div>
        </div>

        {/* filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search target, url, note… (e.g. ministry, gov, n0vakane)"
              className="border-border/60 bg-card/50 pl-9 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll">
            <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <CatChip active={!category} onClick={() => setCategory('')}>
              all
            </CatChip>
            {CATEGORIES.map((c) => (
              <CatChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </CatChip>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card/50 backdrop-blur">
          {/* header row */}
          <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-card/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:grid">
            <div className="col-span-3">target</div>
            <div className="col-span-2">attacker</div>
            <div className="col-span-2">country</div>
            <div className="col-span-1">cat</div>
            <div className="col-span-1">sev</div>
            <div className="col-span-2">time</div>
            <div className="col-span-1 text-right">mirror</div>
          </div>
          {/* rows */}
          <div className="divide-y divide-border/40">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-12 lg:items-center">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))
              : !data?.items?.length
              ? <EmptyRow />
              : data.items.map((d, i) => <Row key={d.id} d={d} index={i} />)}
          </div>
        </div>

        {/* pagination */}
        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">
            showing {data?.items?.length ?? 0} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="gap-1 font-mono text-xs"
            >
              <ChevronsUpDown className="h-3.5 w-3.5 rotate-180" />
              prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="gap-1 font-mono text-xs"
            >
              next
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function CatChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary text-glow'
          : 'border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Row({ d, index }: { d: Defacement; index: number }) {
  const sev = severityMeta(d.severity)
  const cat = categoryMeta(d.category)
  const CatIcon = CATEGORY_ICONS[d.category] ?? Folder
  const StatusIcon = d.status === 'restored' ? RotateCcw : ShieldCheck

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="group grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-primary/[0.04] lg:grid-cols-12 lg:items-center"
    >
      {/* target */}
      <div className="col-span-3 flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded border ${sev.ring} bg-card`}>
          <CatIcon className="h-3.5 w-3.5 text-foreground/70" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-xs font-semibold text-foreground">
              {d.targetName}
            </span>
          </div>
          <a
            href={d.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="block max-w-full truncate font-mono text-[10px] text-muted-foreground hover:text-primary"
          >
            {d.targetUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>

      {/* attacker */}
      <div className="col-span-2 flex items-center gap-2">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded font-mono text-[10px] font-bold text-black"
          style={{ background: d.attacker.color }}
        >
          {d.attacker.handle.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate font-mono text-xs text-foreground">{d.attacker.handle}</div>
          {d.attacker.team && (
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              {d.attacker.team}
            </div>
          )}
        </div>
      </div>

      {/* country */}
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-lg">{countryFlag(d.country)}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {countryName(d.country)}
        </span>
      </div>

      {/* category */}
      <div className="col-span-1">
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {cat.label}
        </Badge>
      </div>

      {/* severity */}
      <div className="col-span-1">
        <span className={`inline-flex items-center gap-1 rounded border ${sev.ring} px-1.5 py-0.5 font-mono text-[10px] font-bold ${sev.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
      </div>

      {/* time */}
      <div className="col-span-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <StatusIcon className="h-3 w-3" />
        {timeAgo(d.createdAt)}
      </div>

      {/* mirror */}
      <div className="col-span-1 flex justify-start lg:justify-end">
        <a
          href={d.mirrorUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded border border-border/50 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Link2 className="h-3 w-3" />
          snap
          <ExternalLink className="h-2.5 w-2.5 opacity-50" />
        </a>
      </div>
    </motion.div>
  )
}

function EmptyRow() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-border/50">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-mono text-sm text-foreground">no records match the query</div>
      <div className="font-mono text-[11px] text-muted-foreground">
        try a different keyword or clear the category filter
      </div>
    </div>
  )
}
