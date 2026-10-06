'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Lock, LogOut, ShieldCheck, ArrowRight, Pause, Newspaper, Trash2, Pin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { countryFlag, timeAgo } from '@/lib/site'
import { DefacementMarks } from '@/components/site/marks'
import type { Defacement } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type NewsItem = {
  id: string
  title: string
  body: string
  author: string
  pinned: boolean
  createdAt: string
}

export function AdminView() {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const { data: me, isLoading } = useSWR<{ admin: boolean; username: string | null }>(
    '/api/auth/me',
    fetcher
  )
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loggingIn, setLoggingIn] = React.useState(false)
  const [promoting, setPromoting] = React.useState<string | null>(null)
  // news posting
  const [newsTitle, setNewsTitle] = React.useState('')
  const [newsBody, setNewsBody] = React.useState('')
  const [newsPinned, setNewsPinned] = React.useState(false)
  const [postingNews, setPostingNews] = React.useState(false)
  const [deletingNews, setDeletingNews] = React.useState<string | null>(null)

  // onhold records pending manual review (admin can promote them)
  const { data: onholdData, isLoading: onholdLoading } = useSWR<{ items: Defacement[]; total: number }>(
    '/api/defacements?onhold=true&limit=50',
    fetcher,
    { refreshInterval: 30000 }
  )
  const onhold = onholdData?.items ?? []

  // news list (admin can manage)
  const { data: newsData, isLoading: newsLoading } = useSWR<{ items: NewsItem[] }>(
    '/api/news',
    fetcher,
    { refreshInterval: 60000 }
  )
  const news = newsData?.items ?? []

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingIn(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'login failed')
      toast({ title: 'Logged in', description: `Welcome, ${data.username}` })
      setPassword('')
      await mutate('/api/auth/me')
    } catch (err) {
      toast({ title: 'Login failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setLoggingIn(false)
    }
  }

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await mutate('/api/auth/me')
    toast({ title: 'Logged out' })
  }

  const onPromote = async (id: string) => {
    setPromoting(id)
    try {
      const res = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'promote failed')
      toast({ title: 'Promoted', description: 'Record moved to verified archive' })
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/defacements'))
      await mutate('/api/defacer')
    } catch (err) {
      toast({ title: 'Promote failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setPromoting(null)
    }
  }

  const onPostNews = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsTitle.trim() || !newsBody.trim()) {
      toast({ title: 'Missing fields', description: 'Title and body required', variant: 'destructive' })
      return
    }
    setPostingNews(true)
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newsTitle, body: newsBody, pinned: newsPinned }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'post failed')
      toast({ title: 'News posted', description: 'Published to /news' })
      setNewsTitle('')
      setNewsBody('')
      setNewsPinned(false)
      await mutate('/api/news')
    } catch (err) {
      toast({ title: 'Post failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setPostingNews(false)
    }
  }

  const onDeleteNews = async (id: string) => {
    setDeletingNews(id)
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'delete failed')
      toast({ title: 'News deleted' })
      await mutate('/api/news')
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDeletingNews(null)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // not logged in → login form
  if (!me?.admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <form
          onSubmit={onLogin}
          className="rounded-md border border-border/70 bg-card/40 p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary/15 text-primary">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-mono text-sm font-bold uppercase tracking-wider">Admin</h1>
              <p className="font-mono text-[10px] text-muted-foreground">restricted access</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="off"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
                className="h-9 font-mono text-xs"
              />
            </div>
            <Button type="submit" disabled={loggingIn} className="w-full gap-2 font-mono text-xs uppercase">
              <Lock className="h-3.5 w-3.5" />
              {loggingIn ? 'authenticating…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // logged in → dashboard
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-mono text-sm font-bold uppercase tracking-wider">Admin Dashboard</h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              signed in as <span className="text-primary">{me.username}</span>
            </p>
          </div>
        </div>
        <Button onClick={onLogout} variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>

      {/* on-hold records pending manual review */}
      <div className="mb-3 flex items-center gap-2">
        <Pause className="h-4 w-4 text-amber-400" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Pending Review (On Hold)</h2>
        <span className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
          {onholdData?.total ?? 0}
        </span>
      </div>

      {onholdLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : onhold.length === 0 ? (
        <div className="rounded-md border border-border/70 bg-card/40 px-4 py-12 text-center font-mono text-xs text-muted-foreground">
          no on-hold records — all caught up
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
          <div className="divide-y divide-border/40">
            {onhold.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-sm font-mono text-[10px] font-bold text-black"
                  style={{ background: d.attacker.color }}
                >
                  {d.attacker.handle.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-foreground">
                    {d.attacker.handle}
                    <span className="text-muted-foreground"> · </span>
                    <a href={d.targetUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {d.targetUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {countryFlag(d.country)} {d.country} · {timeAgo(d.createdAt)}
                  </div>
                </div>
                <DefacementMarks
                  marks={{
                    isHomepage: d.isHomepage,
                    isMass: d.isMass,
                    isRedeface: d.isRedeface,
                    isSpecial: d.isSpecial,
                  }}
                />
                <Button
                  onClick={() => onPromote(d.id)}
                  disabled={promoting === d.id}
                  size="sm"
                  className="gap-1.5 font-mono text-[10px] uppercase"
                >
                  <ArrowRight className="h-3 w-3" />
                  {promoting === d.id ? 'promoting…' : 'Promote'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* post news — admin only */}
      <div className="mb-3 mt-8 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Post News</h2>
      </div>
      <form onSubmit={onPostNews} className="mb-6 rounded-md border border-border/70 bg-card/40 p-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              value={newsTitle}
              onChange={(e) => setNewsTitle(e.target.value)}
              placeholder="News headline…"
              className="h-9 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Body</Label>
            <Textarea
              value={newsBody}
              onChange={(e) => setNewsBody(e.target.value)}
              rows={4}
              placeholder="News content…"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={newsPinned}
                onChange={(e) => setNewsPinned(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-primary)]"
              />
              <Pin className="h-3 w-3" />
              Pin to top
            </label>
            <Button type="submit" disabled={postingNews} className="gap-1.5 font-mono text-xs uppercase">
              <Newspaper className="h-3.5 w-3.5" />
              {postingNews ? 'posting…' : 'Publish'}
            </Button>
          </div>
        </div>
      </form>

      {/* manage news — admin only */}
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-primary" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Manage News</h2>
        <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
          {news.length}
        </span>
      </div>
      {newsLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : news.length === 0 ? (
        <div className="rounded-md border border-border/70 bg-card/40 px-4 py-8 text-center font-mono text-xs text-muted-foreground">
          no news yet
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/70 bg-card/40">
          <div className="divide-y divide-border/40">
            {news.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                    <span className="truncate font-mono text-xs font-semibold text-foreground">{n.title}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                    {n.body}
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-muted-foreground/60">
                    {n.author} · {timeAgo(n.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteNews(n.id)}
                  disabled={deletingNews === n.id}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-border/50 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  title="Delete news"
                  aria-label="Delete news"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
