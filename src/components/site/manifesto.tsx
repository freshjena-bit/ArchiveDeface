'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Eye, Lock, Archive, Scale, Users, Cpu, Terminal, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const PRINCIPLES = [
  {
    icon: Archive,
    title: 'Preserve, don\'t profit',
    body: 'Every incident is mirror-snapshotted and timestamped. The record exists for history, not for sale.',
  },
  {
    icon: Eye,
    title: 'Attributable, not doxxed',
    body: 'We attribute work to a handle. We never publish real identities, contact info, or personal data.',
  },
  {
    icon: Lock,
    title: 'Anonymous by relay',
    body: 'Submissions route through an anonymous relay. Submission metadata is stripped before archiving.',
  },
  {
    icon: Scale,
    title: 'Ethics reviewed',
    body: 'Maintainers review disclosure ethics. Dumped databases, credentials and personal data are refused.',
  },
  {
    icon: Users,
    title: 'Open to researchers',
    body: 'Any security researcher can claim their work. Ranks are earned by verified incidents, not bought.',
  },
  {
    icon: Cpu,
    title: 'Verifiable signatures',
    body: 'Each archived incident carries a cryptographic signature so the record can be audited later.',
  },
]

export function Manifesto({ onOpenSubmit }: { onOpenSubmit: () => void }) {
  return (
    <section id="manifesto" className="relative border-t border-border/60 py-16">
      <div className="absolute inset-0 -z-10 bg-vignette opacity-60" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* left intro */}
          <div className="lg:col-span-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
              {'// manifesto'}
            </div>
            <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
              Why we keep
              <br />
              <span className="text-primary text-glow">the record</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A defacement is a signal — a misconfigured server, a forgotten
              patch, a default password that should have been changed. We believe
              the signal should be preserved, attributed honestly, and studied.
              That is how the surface gets safer.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We are not a marketplace, not a trophy case, not a drama board. We
              are an archive. The principles below are non-negotiable.
            </p>

            <div className="mt-6 rounded-lg border border-border/70 bg-card/50 p-4 backdrop-blur">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                maintainers charter
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-term-green/80">
{`> preserve the signal, not the ego
> attribute the handle, never the person
> refuse what cannot be ethically kept
> mirror, timestamp, sign, then move on`}
              </pre>
            </div>

            <Button
              onClick={onOpenSubmit}
              variant="outline"
              className="mt-6 gap-2 font-mono uppercase tracking-wider"
            >
              File your first incident
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* right principles grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PRINCIPLES.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-primary/40"
                >
                  <span className="absolute right-3 top-3 font-mono text-[10px] text-muted-foreground/40">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
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
      </div>
    </section>
  )
}
