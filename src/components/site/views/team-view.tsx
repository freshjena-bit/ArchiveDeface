'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Database, Star, Pause, ShieldCheck, RotateCcw, Flame, Home,
  Users as UsersIcon, ExternalLink,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { countryFlag, countryName, severityMeta, timeAgo } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import { MirrorViewer } from '@/components/site/mirror-viewer'
import { teamColor } from '@/components/site/teams-leaderboard'
import { useHashRoute } from '@/lib/use-hash-route'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type TeamData = {
  ok: boolean
  team: { name: string; members: number; totalHits: number }
  memberList: { handle: string; country: string | null; color: string; totalHits: number }[]
  counts: {
    total: number
    special: number
    onhold: number
    archived: number
    restored: number
    mass: number
    redeface: number
    homepage: number
  }
  items: Defacement[]
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(2)
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yy} ${hh}:${mi}`
}

export function TeamView({ name }: { name: string }) {
  const { navigate } = useHashRoute()
  const { data, isLoading, error } = useSWR<TeamData>(
    `/api/team?name=${encodeURIComponent(name)}`,
    fetcher,
    { refreshInterval: 30000 }
  )
  const [selected, setSelected] = React.useState<Defacement | null>(null)
  const [filter, setFilter] = React.useState<'verified' | 'onhold'>('verified')

  if (isLoading) return <TeamSkeleton />
  if (error || !data || !data.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="font-mono text-sm text-muted-foreground">
          team not found: <span className="text-foreground">{name}</span>
        </p>
        <Button
          onClick={() => navigate('/ranking')}
          variant="outline"
          className="mt-4 gap-2 font-mono text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          back to ranking
        </Button>
      </div>
    )
  }

  const t = data.team
  const c = data.counts
  const color = teamColor(t.name)

  const filteredItems = data.items.filter((d) =>
    filter === 'onhold' ? d.status === 'onhold' : d.status !== 'onhold'
  )

  const statCards = [
    { label: 'Total Archive', value: c.total, icon: Database, tone: 'green' as const },
    { label: 'Special', value: c.special, icon: Star, tone: 'amber' as const },
    { label: 'On Hold', value: c.onhold, icon: Pause, tone: 'red' as const },
    { label: 'Mass', value: c.mass, icon: Flame, tone: 'green' as const },
    { label: 'Redeface', value: c.redeface, icon: RotateCcw, tone: 'amber' as const },
    { label: 'Homepage', value: c.homepage, icon: Home, tone: 'green' as const },
    { label: 'Archived', value: c.archived, icon: ShieldCheck, tone: 'green' as const },
    { label: 'Restored', value: c.restored, icon: RotateCcw, tone: 'amber' as const },
  ]

  const toneClass = {
    green: 'text-primary',
    amber: 'text-amber-400',
    red: 'text-destructive',
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* back */}
      <button
        onClick={() => navigate('/ranking')}
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back to ranking
      </button>

      {/* profile header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 flex flex-col gap-4 rounded-md border border-border/70 bg-card/40 p-5 sm:flex-row sm:items-center"
      >
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full font-mono text-lg font-extrabold text-black"
          style={{ background: color, boxShadow: `0 0 24px ${color}44` }}
        >
          {t.name.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold tracking-tight">{t.name}</h1>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <UsersIcon className="h-3 w-3" />
              {t.members} member{t.members === 1 ? '' : 's'}
            </span>
          </div>
          {/* member list */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.memberList.map((m) => (
              <a
                key={m.handle}
                href={`#/defacer/${encodeURIComponent(m.handle)}`}
                className="inline-flex items-center gap-1 rounded-sm border border-border/60 bg-card/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:border-primary/50 hover:text-primary"
              >
                <span
                  className="grid h-3.5 w-3.5 place-items-center rounded-sm text-[8px] font-bold text-black"
                  style={{ background: m.color }}
                >
                  {m.handle.slice(0, 1).toUpperCase()}
                </span>
                {m.handle}
                <span className="text-muted-foreground">· {m.totalHits}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            total incidents
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-primary text-accent-glow">
            {String(t.totalHits).padStart(3, '0')}
          </div>
        </div>
      </motion.div>

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="relative overflow-hidden rounded-md border border-border/70 bg-card/40 p-3"
          >
            <div className="flex items-center justify-between">
              <s.icon className={`h-4 w-4 ${toneClass[s.tone]}`} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                {s.label === 'On Hold' ? 'onhold' : s.label.toLowerCase()}
              </span>
            </div>
            <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${toneClass[s.tone]}`}>
              {String(s.value).padStart(3, '0')}
            </div>
          </motion.div>
        ))}
      </div>

      {/* team's defacements table */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            {t.name}&apos;s Archive
          </h2>
          <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {filteredItems.length}
          </span>
        </div>
        {/* status filter: verified / onhold */}
        <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1">
          {([
            { key: 'verified', label: 'Verified', count: c.archived + c.restored },
            { key: 'onhold', label: 'On Hold', count: c.onhold },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filter === f.key
                  ? f.key === 'onhold'
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                    : 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border/50 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {f.label} · {f.count}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2 text-center">#</th>
                <th className="px-2 py-2 font-medium">Defacer</th>
                <th className="px-2 py-2 font-medium">Target</th>
                <th className="w-28 px-2 py-2 font-medium">Country</th>
                <th className="w-24 px-2 py-2 font-medium">Status</th>
                <th className="w-36 px-2 py-2 font-medium">Marks</th>
                <th className="w-36 px-2 py-2 font-medium">Date</th>
                <th className="w-12 px-2 py-2 text-center font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredItems.map((d, i) => {
                const sev = severityMeta(d.severity)
                const statusTone =
                  d.status === 'onhold'
                    ? 'text-destructive border-destructive/40 bg-destructive/10'
                    : d.status === 'restored'
                    ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                    : 'text-primary border-primary/40 bg-primary/10'
                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => setSelected(d)}
                    className="group cursor-pointer transition-colors hover:bg-primary/[0.06]"
                  >
                    <td className="px-3 py-2.5 text-center align-middle">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                          {String(i + 1).padStart(3, '0')}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <a
                        href={`#/defacer/${encodeURIComponent(d.attacker.handle)}`}
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
                      </a>
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
                      <span className={`inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusTone}`}>
                        {d.status}
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
                        className="grid h-6 w-6 place-items-center rounded-sm border border-border/50 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary group-hover:border-primary/40"
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
      </div>

      <MirrorViewer
        record={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mb-6 h-24 w-full" />
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
