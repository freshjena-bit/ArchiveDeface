'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  Database, Users, Globe2, Zap, TrendingUp, Activity, Landmark, GraduationCap,
  Building2, UsersRound, Shield, Banknote,
} from 'lucide-react'
import type { Stats } from '@/lib/types'
import { countryFlag, countryName } from '@/lib/site'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gov: Landmark,
  edu: GraduationCap,
  com: Building2,
  org: UsersRound,
  mil: Shield,
  fin: Banknote,
}

const BAR_COLORS = ['#22c55e', '#eab308', '#ef4444', '#06b6d4', '#a855f7', '#f97316']

export function StatsGrid() {
  const { data } = useSWR<Stats>('/api/stats', fetcher, { refreshInterval: 30000 })
  const c = data?.counters

  const cards = [
    {
      key: 'total',
      label: 'Total Incidents',
      value: c?.totalDefacements ?? 0,
      icon: Database,
      sub: 'archived & mirrored',
      tone: 'green' as const,
    },
    {
      key: 'today',
      label: 'Today',
      value: c?.todayAttacks ?? 0,
      icon: Zap,
      sub: 'last 24h window',
      tone: 'amber' as const,
    },
    {
      key: 'attackers',
      label: 'Researchers',
      value: c?.totalAttackers ?? 0,
      icon: Users,
      sub: 'attributed handles',
      tone: 'green' as const,
    },
    {
      key: 'countries',
      label: 'Countries Hit',
      value: c?.totalCountries ?? 0,
      icon: Globe2,
      sub: 'distinct jurisdictions',
      tone: 'red' as const,
    },
  ]

  const toneClass = {
    green: 'text-term-green box-glow',
    amber: 'text-term-amber box-glow-amber',
    red: 'text-term-red',
  }

  return (
    <section id="stats" className="relative border-t border-border/60 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="// dashboard"
          title="Live intelligence"
          desc="Aggregate counters and time-series drawn from the registry. Refreshes every 30 seconds."
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group relative overflow-hidden rounded-lg border border-border/70 bg-card/60 p-4 backdrop-blur transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between">
                <card.icon className={`h-5 w-5 ${toneClass[card.tone]}`} />
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="mt-3 font-mono text-3xl font-bold tracking-tight text-foreground text-glow">
                {String(card.value).padStart(3, '0')}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {card.label}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground/60">{card.sub}</div>
              {/* corner accent */}
              <span className="absolute right-0 top-0 h-8 w-8 translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-primary/30 bg-primary/5" />
            </motion.div>
          ))}
        </div>

        {/* charts row */}
        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          {/* timeseries */}
          <ChartPanel
            className="lg:col-span-8"
            title="14-day activity"
            subtitle="incidents per day"
            icon={Activity}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.timeseries ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,17,16,0.95)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontSize: 11,
                    }}
                    labelStyle={{ color: '#22c55e' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#actGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#22c55e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          {/* category breakdown */}
          <ChartPanel
            className="lg:col-span-4"
            title="By category"
            subtitle="target sectors"
            icon={Landmark}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.categories ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,17,16,0.95)',
                      border: '1px solid rgba(234,179,8,0.3)',
                      borderRadius: 6,
                      fontFamily: 'monospace',
                      fontSize: 11,
                    }}
                    cursor={{ fill: 'rgba(234,179,8,0.06)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {(data?.categories ?? []).map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {(data?.categories ?? []).map((c, i) => {
                const Icon = ICONS[c.name] ?? Activity
                return (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"
                  >
                    <Icon className="h-3 w-3" style={{ color: BAR_COLORS[i % BAR_COLORS.length] }} />
                    {c.name} · {c.count}
                  </span>
                )
              })}
            </div>
          </ChartPanel>
        </div>

        {/* country rank */}
        <div className="mt-4">
          <ChartPanel title="Geographic distribution" subtitle="incidents by target country" icon={Globe2}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(data?.countries ?? []).slice(0, 10).map((c, i) => {
                const max = data?.countries?.[0]?.count ?? 1
                const pct = Math.round((c.count / max) * 100)
                return (
                  <div
                    key={c.code}
                    className="flex items-center gap-3 rounded-md border border-border/40 bg-card/40 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-lg">{countryFlag(c.code)}</span>
                    <span className="font-mono text-xs text-foreground/80">{countryName(c.code)}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border/40 sm:w-40">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-term-green/70 to-term-amber/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-xs font-bold text-primary">
                        {c.count}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartPanel>
        </div>
      </div>
    </section>
  )
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  className = '',
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg border border-border/70 bg-card/50 p-4 backdrop-blur ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              {title}
            </div>
            {subtitle && (
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/50">{'// seg'}</span>
      </div>
      {children}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string
  title: string
  desc: string
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
