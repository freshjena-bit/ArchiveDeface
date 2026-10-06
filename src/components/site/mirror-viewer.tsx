'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink, Fingerprint, Camera,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { countryFlag, severityMeta, categoryMeta } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import type { Defacement } from '@/lib/types'

// deterministic helpers so each snapshot shows stable mock metadata
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function mockIP(id: string): string {
  const h = hashStr(id)
  const a = (h & 0xff) % 223 + 1
  const b = ((h >> 8) & 0xff) % 255 + 1
  const c = ((h >> 16) & 0xff) % 255 + 1
  const d = ((h >> 24) & 0xff) % 255 + 1
  return `${a}.${b}.${c}.${d}`
}
const SERVERS = ['nginx', 'apache', 'vercel', 'cloudflare', 'iis', 'openresty', 'litespeed']
function mockServer(id: string): string {
  return SERVERS[hashStr(id) % SERVERS.length]
}
function mockSig(id: string, handle: string): string {
  return (hashStr(id + handle).toString(16).padStart(8, '0').slice(0, 16)).toUpperCase()
}

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
  const captured = new Date(d.createdAt)
  const ip = mockIP(d.id)
  const server = mockServer(d.id)
  const sig = mockSig(d.id, d.attacker.handle)
  const time = captured.toISOString().slice(11, 19)
  const date = captured.toISOString().slice(0, 10)

  const VAL = 'text-rose-400'
  const LABEL = 'text-muted-foreground'

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Timestamp', value: <span className="font-mono text-foreground tabular-nums">{time} · {date}</span> },
    { label: 'Notifier', value: <span className={`font-mono font-semibold ${VAL}`}>{d.attacker.handle}</span> },
    { label: 'Web Server', value: <span className="font-mono text-foreground">{server}</span> },
    { label: 'Team', value: <span className={`font-mono font-semibold ${VAL}`}>{d.attacker.team ?? 'INDEPENDENT'}</span> },
    { label: 'IP', value: <span className={`font-mono ${VAL}`}>{ip}</span> },
    { label: 'Country', value: <span className="font-mono text-foreground">{countryFlag(d.country)} {d.country}</span> },
    {
      label: 'Domain',
      value: (
        <a
          href={d.targetUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1 font-mono ${VAL} hover:underline`}
        >
          <span className="max-w-[260px] truncate">{d.targetUrl.replace(/^https?:\/\//, '')}</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      ),
    },
    { label: 'Category', value: <span className="font-mono text-foreground">{cat.label}</span> },
    { label: 'Severity', value: <span className={`font-mono ${sev.color}`}>{sev.label}</span> },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        {/* toolbar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center gap-2 font-mono text-xs">
              <Camera className="h-3.5 w-3.5 text-primary" />
              mirror snapshot
            </DialogTitle>
            <DialogDescription className="sr-only">Archived defacement snapshot</DialogDescription>
          </DialogHeader>
          <span className="font-mono text-[10px] text-muted-foreground">
            sig: {sig}
          </span>
        </div>

        {/* metadata panel */}
        <div className="border-b border-border/70 bg-background px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider ${LABEL}`}>
                  {r.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px]">{r.value}</span>
              </div>
            ))}
          </div>
          {/* marks */}
          <div className="mt-2 flex items-center gap-2 border-t border-border/40 pt-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">marks</span>
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

        {/* the defaced page — framed black box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="relative"
        >
          <div className="m-3 rounded-md border border-border/70 bg-black p-6">
            {/* subtle scanline */}
            <div
              className="pointer-events-none absolute inset-3 rounded-md opacity-40"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)',
              }}
            />
            <div className="relative min-h-[240px]">
              <div className="text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                  {d.targetUrl.replace(/^https?:\/\//, '')}
                </div>
                <div className="mt-6 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Hacked By
                </div>
                <div
                  className="mt-1 font-mono text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{
                    color: d.attacker.color,
                    textShadow: `0 0 12px ${d.attacker.color}88, 0 0 28px ${d.attacker.color}44`,
                  }}
                >
                  {d.attacker.handle}
                </div>
                {d.attacker.team && (
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                    {'//'} {d.attacker.team}
                  </div>
                )}
              </div>

              {(d.reason || d.poc) && (
                <div className="mx-auto mt-6 grid max-w-md gap-2">
                  {d.reason && (
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-white/30">reason</div>
                      <div className="mt-0.5 font-mono text-[12px] leading-relaxed text-white/70">{d.reason}</div>
                    </div>
                  )}
                  {d.poc && (
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-white/30">proof of concept</div>
                      <div className="mt-0.5 font-mono text-[12px] leading-relaxed text-white/70">{d.poc}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 flex items-center justify-center gap-2 font-mono text-[10px] text-white/25">
                <Fingerprint className="h-3 w-3" />
                {sig}
              </div>
            </div>
          </div>
        </motion.div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-4 py-2.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            mirror snapshot · cryptographically signed · status: {d.status}
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
