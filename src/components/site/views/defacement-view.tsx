'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ExternalLink, Flag, Calendar, Shield, User, Users,
  FileText, AlertTriangle, Camera, Globe, Hash, Fingerprint,
} from 'lucide-react'
import { countryFlag, severityMeta, categoryMeta } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import { MirrorViewer } from '@/components/site/mirror-viewer'
import { Skeleton } from '@/components/ui/skeleton'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ApiResponse = (Defacement & { ok?: boolean; error?: string; pendingUntil?: string | null }) | { ok: false; error: string }

export function DefacementView({ id }: { id: string }) {
  const router = useRouter()
  const [mirrorOpen, setMirrorOpen] = React.useState(false)
  const { data, isLoading } = useSWR<ApiResponse>(
    `/api/defacements/${encodeURIComponent(id)}`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-3 sm:px-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!data || (data as { ok?: boolean }).ok === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Fingerprint className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 font-mono text-sm text-muted-foreground">
          record not found or has been removed
        </p>
        <Link
          href="/archive"
          className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> back to archive
        </Link>
      </div>
    )
  }

  const d = data as Defacement & { pendingUntil?: string | null }
  const sev = severityMeta(d.severity)
  const cat = categoryMeta(d.category)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> back
      </button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 overflow-hidden rounded-md border border-border/70 bg-card/40"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              incident record
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/60">· {d.id}</span>
          </div>
          <div className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold ${sev.color} ${sev.ring}`}>
            sev: {sev.label}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Target */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Target
            </div>
            <a
              href={d.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground hover:text-primary break-all"
            >
              {d.targetName}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground/70">
              {d.targetUrl}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Meta icon={Globe} label="Country" value={`${countryFlag(d.country)} ${d.country}`} />
            <Meta icon={Shield} label="Category" value={cat.label} />
            <Meta icon={Flag} label="Status" value={d.status} />
            <Meta icon={Calendar} label="Recorded" value={fmtDate(d.createdAt)} />
          </div>

          {/* Marks */}
          <div className="flex items-center gap-2 border-t border-border/40 pt-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              marks:
            </span>
            <DefacementMarks
              marks={{
                isHomepage: d.isHomepage,
                isMass: d.isMass,
                isRedeface: d.isRedeface,
                isSpecial: d.isSpecial,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Attacker + team */}
      <div className="mt-3 rounded-md border border-border/70 bg-card/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            attribution
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/defacer/${encodeURIComponent(d.attacker.handle)}`}
            className="flex items-center gap-2.5 hover:opacity-90"
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-sm font-mono text-xs font-bold text-black"
              style={{ background: d.attacker.color }}
            >
              {d.attacker.handle.slice(0, 2).toUpperCase()}
            </span>
            <span className="font-mono text-sm font-bold text-foreground hover:text-primary">
              {d.attacker.handle}
            </span>
          </Link>
          {d.attacker.team && (
            <Link
              href={`/team/${encodeURIComponent(d.attacker.team)}`}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary hover:bg-primary/20"
            >
              <Users className="h-3 w-3" />
              {d.attacker.team}
            </Link>
          )}
          <Link
            href={`/archive?attacker=${encodeURIComponent(d.attacker.handle)}`}
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            view all by attacker
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Mirror snapshot */}
      <div className="mt-3 rounded-md border border-border/70 bg-card/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Camera className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            mirror snapshot
          </span>
        </div>
        {d.mirrorUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMirrorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-3 w-3" />
              view capture
            </button>
            <a
              href={d.mirrorUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-[10px] text-muted-foreground/70 hover:text-primary"
            >
              {d.mirrorUrl}
            </a>
          </div>
        ) : (
          <span className="font-mono text-[11px] text-muted-foreground/60">
            no mirror snapshot available
          </span>
        )}
      </div>

      {/* PoC + Reason */}
      {(d.poc || d.reason) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {d.poc && (
            <div className="rounded-md border border-border/70 bg-card/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  proof of concept
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
                {d.poc}
              </p>
            </div>
          )}
          {d.reason && (
            <div className="rounded-md border border-border/70 bg-card/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  stated motivation
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words font-mono text-xs text-foreground/80">
                {d.reason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mirror viewer modal */}
      <MirrorViewer
        record={d}
        open={mirrorOpen}
        onOpenChange={setMirrorOpen}
      />
    </div>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="truncate font-mono text-xs text-foreground" title={value}>
        {value}
      </div>
    </div>
  )
}
