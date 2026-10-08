'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Terminal, Menu, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV: { path: string; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/archive', label: 'Archive' },
  { path: '/special', label: 'Archive Special' },
  { path: '/onhold', label: 'On Hold' },
  { path: '/ranking', label: 'Ranking' },
  { path: '/submit', label: 'Submit' },
  { path: '/news', label: 'News' },
  { path: '/about', label: 'About' },
]

export function SiteHeader() {
  const pathname = usePathname() ?? '/'
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // close mobile menu on route change
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/70 backdrop-blur-md transition-colors',
        scrolled ? 'bg-background/90' : 'bg-background/70'
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary/15 text-primary">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="font-mono text-sm font-bold tracking-tight">
            DEFACER<span className="text-primary">ZONE</span>ID
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.path}
              href={n.path}
              className={cn(
                'rounded-sm px-3 py-1.5 font-mono text-xs transition-colors',
                isActive(n.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-1.5 font-mono text-xs">
            <Link href="/submit">
              <Send className="h-3.5 w-3.5" />
              Submit
            </Link>
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
            <Link
              key={n.path}
              href={n.path}
              className={cn(
                'rounded-sm px-3 py-2 font-mono text-xs',
                isActive(n.path)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
