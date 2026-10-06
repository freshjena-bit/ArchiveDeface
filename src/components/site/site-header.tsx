'use client'

import * as React from 'react'
import Link from 'next/link'
import { Terminal, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '#home', label: 'Home' },
  { href: '#archive', label: 'Archive' },
  { href: '#top', label: 'Top Defacers' },
  { href: '#submit', label: 'Submit' },
  { href: '#about', label: 'About' },
]

export function SiteHeader({ onOpenSubmit }: { onOpenSubmit: () => void }) {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState('#home')

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  React.useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`#${e.target.id}`)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/70 backdrop-blur-md transition-colors',
        scrolled ? 'bg-background/90' : 'bg-background/70'
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="#home" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary/15 text-primary">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="font-mono text-sm font-bold tracking-tight">
            DEFACE<span className="text-primary">ID</span>
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">archive</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={cn(
                'rounded-sm px-3 py-1.5 font-mono text-xs transition-colors',
                active === n.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenSubmit}
            size="sm"
            className="gap-1.5 font-mono text-xs"
          >
            Submit
          </Button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border/60 text-muted-foreground md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border/60 bg-background/95 px-4 py-2 md:hidden">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="rounded-sm px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
