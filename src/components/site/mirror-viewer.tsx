'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink, ShieldAlert, Fingerprint, Clock, Globe2, KeySquare, Camera,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { countryFlag, countryName, severityMeta, categoryMeta } from '@/lib/site'
import type { Defacement } from '@/lib/types'

export function MirrorViewer({
  record,
  open,
  onOpenChange,
}: {
  record: Defacement | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!record) return null
  const d = record
  const sev = severityMeta(d.severity)
  const cat = categoryMeta(d.category)
  // deterministic mock signature from id
  const sig = (d.id + d.attacker.handle)
    .split('')
    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .replace('-', '')
    .padStart(8, '0')
    .slice(0, 40)
    .toUpperCase()
  const captured = new Date(d.createdAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {/* dialog toolbar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 font-mono text-xs">
              <Camera className="h-3.5 w-3.5 text-primary" />
              mirror snapshot
            </DialogTitle>
            <DialogDescription className="sr-only">
              Archived defacement snapshot
            </DialogDescription>
          </DialogHeader>
          <span className="font-mono text-[10px] text-muted-foreground">
            sig: {sig.slice(0, 16)}
          </span>
        </div>

        {/* meta strip */}
        <div className="grid grid-cols-2 gap-2 border-b border-border/70 bg-card/40 px-4 py-3 sm:grid-cols-4">
          <Meta icon={Globe2} label="target">
            <a
              href={d.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <span className="max-w-[140px] truncate">{d.targetUrl.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </Meta>
          <Meta icon={KeySquare} label="defacer">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="grid h-4 w-4 place-items-center rounded-sm font-mono text-[8px] font-bold text-black"
                style={{ background: d.attacker.color }}
              >
                {d.attacker.handle.slice(0, 2).toUpperCase()}
              </span>
              {d.attacker.handle}
            </span>
          </Meta>
          <Meta icon={Globe2} label="country">
            <span className="inline-flex items-center gap-1">
              {countryFlag(d.country)} {countryName(d.country)}
            </span>
          </Meta>
          <Meta icon={Clock} label="captured">
            <span className="tabular-nums">
              {captured.toISOString().replace('T', ' ').slice(0, 16)} UTC
            </span>
          </Meta>
        </div>

        {/* the mock defaced page */}
        <div className="relative">
          {/* status/severity badges row */}
          <div className="flex items-center gap-2 border-b border-border/70 bg-background/40 px-4 py-2">
            <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold ${sev.ring} ${sev.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
              {sev.label}
            </span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {cat.label}
            </Badge>
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <ShieldAlert className="h-3 w-3" />
              status: {d.status}
            </span>
          </div>

          {/* the actual mocked snapshot */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="relative min-h-[280px] overflow-hidden bg-black p-6"
          >
            {/* subtle scanline */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)',
              }}
            />
            <div className="relative font-mono text-term-green">
              <div className="text-[10px] uppercase tracking-widest text-term-green/50">
                {d.targetUrl}
              </div>
              <div className="mt-6 text-center">
                <div className="text-[10px] uppercase tracking-[0.3em] text-term-green/60">
                  owned by
                </div>
                <div
                  className="mt-1 text-3xl font-extrabold tracking-tight text-glow"
                  style={{ color: d.attacker.color, textShadow: `0 0 12px ${d.attacker.color}66` }}
                >
                  {d.attacker.handle}
                </div>
                {d.attacker.team && (
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-term-green/50">
                    {'//'} {d.attacker.team}
                  </div>
                )}
              </div>

              {d.note && (
                <div className="mx-auto mt-6 max-w-md rounded-sm border border-term-green/20 bg-term-green/5 px-3 py-2 text-center text-[12px] leading-relaxed text-term-green/80">
                  “{d.note}”
                </div>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-term-green/40">
                <Fingerprint className="h-3 w-3" />
                {sig}
              </div>

              <div className="mt-2 text-center text-[10px] text-term-green/30">
                — deface archive mirror · captured {captured.toISOString().slice(0, 19).replace('T', ' ')} —
              </div>
            </div>
          </motion.div>
        </div>

        {/* footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-4 py-2.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            This is a fictional mirror snapshot. No real site was accessed.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="font-mono text-xs"
          >
            close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="mt-0.5 truncate font-mono text-[11px] text-foreground">
        {children}
      </div>
    </div>
  )
}
