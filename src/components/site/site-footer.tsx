'use client'

import Link from 'next/link'
import { Terminal, Heart, Github } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer id="about" className="mt-auto border-t border-border/70 bg-card/30">
      {/* main */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary/15 text-primary">
              <Terminal className="h-4 w-4" />
            </span>
            <div>
              <div className="font-mono text-xs font-bold">
                DEFACER<span className="text-primary">ZONE</span>ID
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                the open record · v3.14
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px]">
            <Link href="/" className="text-muted-foreground hover:text-primary">Home</Link>
            <Link href="/archive" className="text-muted-foreground hover:text-primary">Archive</Link>
            <Link href="/special" className="text-muted-foreground hover:text-primary">Archive Special</Link>
            <Link href="/onhold" className="text-muted-foreground hover:text-primary">On Hold</Link>
            <Link href="/ranking" className="text-muted-foreground hover:text-primary">Ranking</Link>
            <Link href="/submit" className="text-muted-foreground hover:text-primary">Submit</Link>
            <Link href="/news" className="text-muted-foreground hover:text-primary">News</Link>
            <Link href="/about" className="text-muted-foreground hover:text-primary">About</Link>
          </nav>

          <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="grid h-7 w-7 place-items-center rounded-sm border border-border/60 hover:border-primary/50 hover:text-primary"
              aria-label="Source"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
              node online
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center justify-between gap-2 border-t border-border/40 pt-4 font-mono text-[10px] text-muted-foreground/70 sm:flex-row">
          <span>© {new Date().getFullYear()} DEFACERZONEID · CC BY-NC 4.0</span>
          <span className="inline-flex items-center gap-1.5">
            built for the record
            <Heart className="h-3 w-3 text-destructive/70" />
          </span>
        </div>
      </div>
    </footer>
  )
}
