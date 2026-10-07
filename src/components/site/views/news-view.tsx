'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Newspaper, Pin, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from './page-header'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type NewsItem = {
  id: string
  title: string
  body: string
  author: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function NewsView() {
  const { data, isLoading } = useSWR<{ items: NewsItem[] }>('/api/news', fetcher, {
    refreshInterval: 60000,
  })
  const items = data?.items ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <PageHeader
        eyebrow="news"
        title="News & Announcements"
        desc="Updates, milestones and policy changes from the archive maintainers."
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-border/70 bg-card/40 px-4 py-16 text-center font-mono text-xs text-muted-foreground">
          no news posted yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n, i) => (
            <motion.article
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
              className={`rounded-md border bg-card/40 p-4 ${
                n.pinned ? 'border-primary/40 bg-primary/[0.04]' : 'border-border/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {n.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                      <Pin className="h-2.5 w-2.5" />
                      pinned
                    </span>
                  )}
                  <Newspaper className="h-4 w-4 text-primary" />
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtDate(n.createdAt)}
                </span>
              </div>
              <h2 className="mt-2 font-mono text-sm font-bold text-foreground sm:text-base">
                {n.title}
              </h2>
              <p className="mt-1.5 font-mono text-[12px] leading-relaxed text-muted-foreground">
                {n.body}
              </p>
              <div className="mt-3 border-t border-border/40 pt-2 font-mono text-[10px] text-muted-foreground/70">
                posted by <span className="text-primary">{n.author}</span>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  )
}
