'use client'

import * as React from 'react'
import { Terminal, Heart, ShieldAlert, BookOpen, Code2, Globe2 } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      {/* manifesto strip */}
      <div className="border-b border-border/40">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary box-glow">
                <Terminal className="h-5 w-5" />
              </span>
              <div>
                <div className="font-mono text-sm font-bold text-glow">
                  DEFACE<span className="text-primary">/</span>ARCHIVE
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  the open record
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
              An independent, mirror-backed registry of website defacement
              incidents, maintained for security research, attribution study and
              historical preservation. No bounties. No sales. No doxxing.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-term-green animate-pulse" />
                node online
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-3 w-3" />
                responsible disclosure
              </span>
            </div>
          </div>

          <FooterCol
            title="Registry"
            links={[
              { label: 'Live feed', href: '#live' },
              { label: 'Statistics', href: '#stats' },
              { label: 'Archive', href: '#archive' },
              { label: 'Hall of fame', href: '#leaderboard' },
            ]}
          />
          <FooterCol
            title="Project"
            links={[
              { label: 'Submit incident', href: '#submit' },
              { label: 'Manifesto', href: '#' },
              { label: 'Mirror policy', href: '#' },
              { label: 'Maintainers', href: '#' },
            ]}
          />
        </div>
      </div>

      {/* disclaimer */}
      <div className="border-b border-border/40 bg-background/40">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-term-amber" />
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-bold text-term-amber">Disclaimer.</span>{' '}
              This is a demonstration project. All handles, teams, target URLs and
              incident records are fictional and do not reference real persons,
              organisations or live systems. No real target is ever contacted,
              compromised or mirrored. Do not attempt unauthorised access on any
              system you do not own or have written permission to test.
            </p>
          </div>
        </div>
      </div>

      {/* legal */}
      <div className="bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>© {new Date().getFullYear()} Deface Archive Project · CC BY-NC 4.0</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" />
              built with Next.js 16
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5" />
              14 nodes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-term-red" />
              for the record
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
