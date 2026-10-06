'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ShieldAlert, Radio, Database } from 'lucide-react'
import { MatrixRain } from './matrix-rain'

const BOOT_LINES = [
  '> initializing deface-archive kernel ...',
  '> loading incident registry ............ ok',
  '> mounting mirror snapshots ............. ok',
  '> connecting to 14 country nodes ........ ok',
  '> indexing 420 archived incidents ....... ok',
  '> verifying researcher signatures ...... ok',
  '> anonymous relay: secure ......... ONLINE',
  '> welcome, operator. the record is open.',
]

export function Hero({ todayAttacks }: { todayAttacks: number }) {
  const [visible, setVisible] = React.useState(0)
  const [typed, setTyped] = React.useState('')

  React.useEffect(() => {
    let i = 0
    let char = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (i >= BOOT_LINES.length) {
        return
      }
      const line = BOOT_LINES[i]
      if (char <= line.length) {
        setTyped(line.slice(0, char))
        char++
        timer = setTimeout(tick, 12)
      } else {
        setVisible((v) => v + 1)
        i++
        char = 0
        setTyped('')
        timer = setTimeout(tick, 180)
      }
    }
    timer = setTimeout(tick, 350)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="live" className="relative isolate overflow-hidden">
      {/* background */}
      <div className="absolute inset-0 -z-10 bg-vignette" />
      <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <MatrixRain className="opacity-[0.13]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-background" />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* Left: headline + CTA */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-term-red animate-pulse" />
              live registry · {todayAttacks} incidents today
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 font-mono text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
            >
              the{' '}
              <span className="text-primary text-glow">defacement</span>
              <br />
              <span className="text-foreground">archive</span>{' '}
              <span className="text-muted-foreground">/ registry</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              An open, mirror-backed record of website defacement incidents.
              We document compromised surfaces, attribute them to security
              researchers, and keep a snapshot for the historical record.
              Nothing is sold. Nothing is hidden.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <a
                href="#archive"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground box-glow transition-transform hover:-translate-y-0.5"
              >
                <Database className="h-4 w-4" />
                Browse the archive
              </a>
              <a
                href="#leaderboard"
                className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/60 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <ShieldAlert className="h-4 w-4" />
                Hall of fame
              </a>
            </motion.div>

            {/* quick chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 grid max-w-lg grid-cols-3 gap-3"
            >
              {[
                { k: '420', v: 'incidents', icon: Database },
                { k: '15', v: 'researchers', icon: Radio },
                { k: '14', v: 'countries', icon: ShieldAlert },
              ].map((c) => (
                <div
                  key={c.v}
                  className="rounded-md border border-border/60 bg-card/50 p-3 backdrop-blur"
                >
                  <c.icon className="h-4 w-4 text-primary" />
                  <div className="mt-2 font-mono text-lg font-bold text-glow">{c.k}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.v}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: terminal boot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5"
          >
            <div className="scanlines relative overflow-hidden rounded-lg border border-border/70 bg-black/70 backdrop-blur">
              {/* terminal bar */}
              <div className="flex items-center gap-2 border-b border-border/60 bg-card/60 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-term-red/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-term-amber/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-term-green/80" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  operator@deface-archive: ~
                </span>
              </div>
              {/* terminal body */}
              <div className="h-[280px] p-4 font-mono text-[12px] leading-relaxed text-term-green sm:text-[13px]">
                {BOOT_LINES.slice(0, visible).map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    <span className="text-term-green-dim">{l.replace(/ok$/, '')}</span>
                    {l.endsWith('ok') && <span className="text-term-green text-glow">ok</span>}
                  </div>
                ))}
                {visible < BOOT_LINES.length && (
                  <div className="whitespace-pre-wrap">
                    <span className="text-term-green-dim">{typed}</span>
                    <span className="ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-term-green animate-blink" />
                  </div>
                )}
                {visible >= BOOT_LINES.length && (
                  <div className="mt-2 inline-flex items-center gap-2 text-term-green text-glow">
                    <span className="h-1.5 w-1.5 rounded-full bg-term-green animate-pulse" />
                    awaiting input
                    <span className="ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-term-green animate-blink" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* scroll cue */}
        <div className="mt-12 flex justify-center">
          <a
            href="#stats"
            className="group inline-flex flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            scroll to decrypt
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  )
}
