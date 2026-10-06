'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Archive, Eye, Lock, Scale, Users, Cpu, Terminal, Heart,
} from 'lucide-react'
import { PageHeader } from './page-header'

const PRINCIPLES = [
  { icon: Archive, title: 'Preserve, don\'t profit', body: 'Every incident is mirror-snapshotted and timestamped. The record exists for history, not for sale.' },
  { icon: Eye, title: 'Attributable, not doxxed', body: 'We attribute work to a handle. We never publish real identities, contact info, or personal data.' },
  { icon: Lock, title: 'Anonymous by relay', body: 'Submissions route through an anonymous relay. Submission metadata is stripped before archiving.' },
  { icon: Scale, title: 'Ethics reviewed', body: 'Maintainers review disclosure ethics. Dumped databases, credentials and personal data are refused.' },
  { icon: Users, title: 'Open to researchers', body: 'Any security researcher can claim their work. Ranks are earned by verified incidents, not bought.' },
  { icon: Cpu, title: 'Verifiable signatures', body: 'Each archived incident carries a deterministic signature so the record can be audited later.' },
]

export function AboutView() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="about"
        title="About the Archive"
        desc="An open, mirror-backed registry of website defacement incidents — maintained for security research, attribution study and historical preservation."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* manifesto */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary">
            <Terminal className="h-3.5 w-3.5" />
            Why we keep the record
          </div>
          <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground">
            A defacement is a signal — a misconfigured server, a forgotten
            patch, a default password that should have been changed. We believe
            the signal should be preserved, attributed honestly, and studied.
            That is how the surface gets safer.
          </p>
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            We are not a marketplace, not a trophy case, not a drama board. We
            are an archive. The principles below are non-negotiable.
          </p>

          <div className="mt-6 rounded-md border border-border/70 bg-card/40 p-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              maintainers charter
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-primary/80">
{`> preserve the signal, not the ego
> attribute the handle, never the person
> refuse what cannot be ethically kept
> mirror, timestamp, sign, then move on`}
            </pre>
          </div>
        </div>

        {/* principles */}
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="relative overflow-hidden rounded-md border border-border/70 bg-card/40 p-4"
              >
                <span className="absolute right-3 top-3 font-mono text-[10px] text-muted-foreground/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-sm bg-primary/10 text-primary">
                  <p.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 font-mono text-sm font-bold text-foreground">
                  {p.title}
                </h3>
                <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 border-t border-border/40 pt-4 font-mono text-[10px] text-muted-foreground/70">
        built for the record
        <Heart className="h-3 w-3 text-destructive/70" />
      </div>
    </div>
  )
}
