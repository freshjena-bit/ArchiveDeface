'use client'

import * as React from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Newspaper, Pin, ArrowRight, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

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

export function HomeLatestNews() {
  const router = useRouter()
  const { data, isLoading } = useSWR<{ items: NewsItem[] }>('/api/news', fetcher, {
    refreshInterval: 60000,
  })
  // pinned items sort first, then most-recent. API already returns this order.
  const items = (data?.items ?? []).slice(0, 3)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5 text-primary" />
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider">
            Latest News
          </h2>
        </div>
        <button
          onClick={() => router.push('/news')}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          all news
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-[230px] flex-shrink-0 sm:w-auto" />
          ))
        ) : items.length === 0 ? (
          <div className="col-span-full rounded-md border border-border/70 bg-card/40 px-4 py-8 text-center font-mono text-[11px] text-muted-foreground">
            no news posted yet
          </div>
        ) : (
          items.map((n, i) => (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => router.push('/news')}
              className={`group flex w-[230px] flex-shrink-0 flex-col rounded-md border bg-card/40 p-3 text-left transition-colors hover:border-primary/40 sm:w-auto ${
                n.pinned ? 'border-primary/40 bg-primary/[0.04]' : 'border-border/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {n.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                    <Pin className="h-2.5 w-2.5" />
                    pinned
                  </span>
                ) : (
                  <Newspaper className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtDate(n.createdAt)}
                </span>
              </div>

              <h3 className="mt-2 line-clamp-2 font-mono text-xs font-bold text-foreground break-words">
                {n.title}
              </h3>
              <p className="mt-1 line-clamp-2 flex-1 font-mono text-[11px] leading-relaxed text-muted-foreground break-words">
                {n.body}
              </p>

              <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary opacity-70 transition-opacity group-hover:opacity-100">
                read more
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}
