'use client'

import * as React from 'react'
import Link from 'next/link'
import { Terminal, Activity, Trophy, Globe2, Upload, Github, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '#live', label: 'Live Feed', icon: Activity },
  { href: '#stats', label: 'Statistics', icon: Activity },
  { href: '#archive', label: 'Archive', icon: Shield },
  { href: '#leaderboard', label: 'Hall of Fame', icon: Trophy },
  { href: '#submit', label: 'Submit', icon: Upload },
]

export function SiteHeader({ onOpenSubmit }: { onOpenSubmit: () => void }) {
  const [scrolled, setScrolled] = React.useState(false)
  const [active, setActive] = React.useState<string>('#live')

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // section spy
  React.useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`#${e.target.id}`)
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
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
        'sticky top-0 z-50 w-full border-b border-border/60 backdrop-blur-xl transition-colors',
        scrolled ? 'bg-background/85 shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : 'bg-background/50'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary box-glow">
            <Terminal className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-term-red animate-pulse-ring" />
          </span>
          <div className="leading-none">
            <div className="font-mono text-sm font-bold tracking-tight text-glow">
              DEFACE<span className="text-primary">/</span>ARCHIVE
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              registry v3.14
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {NAV.map((n) => (
              <NavigationMenuItem key={n.href}>
                <NavigationMenuLink asChild>
                  <a
                    href={n.href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                      active === n.href
                        ? 'bg-primary/15 text-primary text-glow'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <n.icon className="h-3.5 w-3.5" />
                    {n.label}
                  </a>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:grid h-9 w-9 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            aria-label="Source"
          >
            <Github className="h-4 w-4" />
          </a>
          <Button
            onClick={onOpenSubmit}
            size="sm"
            className="gap-1.5 font-mono uppercase tracking-wider"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Report</span>
          </Button>
        </div>
      </div>

      {/* status bar */}
      <div className="h-7 border-t border-border/40 bg-card/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-term-green animate-pulse" />
              node online
            </span>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline">tor mirror: defacearchive.onion</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3 w-3" />
              <span>14 countries tracked</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
