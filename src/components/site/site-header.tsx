'use client'

import * as React from 'react'
import Link from 'next/link'
import { Terminal, Menu, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHashRoute, type Route } from '@/lib/use-hash-route'
import { cn } from '@/lib/utils'

const NAV: { route: Route; hash: string; label: string }[] = [
  { route: 'home', hash: '#/', label: 'Home' },
  { route: 'archive', hash: '#/archive', label: 'Archive' },
  { route: 'special', hash: '#/special', label: 'Archive Special' },
  { route: 'ranking', hash: '#/ranking', label: 'Ranking' },
  { route: 'submit', hash: '#/submit', label: 'Submit' },
  { route: 'about', hash: '#/about', label: 'About' },
]

export function SiteHeader() {
  const { route, navigate } = useHashRoute()
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (r: Route) => {
    setOpen(false)
    navigate(`/${r === 'home' ? '' : r}`)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/70 backdrop-blur-md transition-colors',
        scrolled ? 'bg-background/90' : 'bg-background/70'
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/#/"
          onClick={(e) => { e.preventDefault(); go('home') }}
          className="flex items-center gap-2.5"
        >
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
            <button
              key={n.route}
              onClick={() => go(n.route)}
              className={cn(
                'rounded-sm px-3 py-1.5 font-mono text-xs transition-colors',
                route === n.route
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => go('submit')}
            size="sm"
            className="gap-1.5 font-mono text-xs"
          >
            <Send className="h-3.5 w-3.5" />
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
            <button
              key={n.route}
              onClick={() => go(n.route)}
              className={cn(
                'rounded-sm px-3 py-2 text-left font-mono text-xs',
                route === n.route
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
