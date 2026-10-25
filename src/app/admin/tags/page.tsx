'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { PageHeader } from '@/components/site/views/page-header'
import { toast } from 'sonner'

interface HackerWithTags {
  id: string
  handle: string
  team: string | null
  country: string | null
  totalHits: number
  tags: string[]
}

export default function AdminTagsPage() {
  const router = useRouter()
  const [hackers, setHackers] = useState<HackerWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.admin) {
          setAuthed(true)
        } else {
          router.push('/admin')
        }
      } else {
        router.push('/admin')
      }
    } catch {
      router.push('/admin')
    }
  }, [router])

  const fetchHackers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hacker-tags')
      const data = await res.json()
      if (data.ok) {
        setHackers(data.items ?? [])
      } else {
        toast.error(data.error || 'Failed to load')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (authed) fetchHackers()
  }, [authed, fetchHackers])

  const startEdit = (hacker: HackerWithTags) => {
    setEditingId(hacker.id)
    setNewTag('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNewTag('')
  }

  const addTag = (hackerId: string, tag: string) => {
    const clean = tag.trim()
    if (!clean) return
    setHackers((prev) =>
      prev.map((h) =>
        h.id === hackerId
          ? { ...h, tags: [...new Set([...h.tags, clean])].slice(0, 10) }
          : h
      )
    )
    setNewTag('')
  }

  const removeTag = (hackerId: string, tag: string) => {
    setHackers((prev) =>
      prev.map((h) =>
        h.id === hackerId
          ? { ...h, tags: h.tags.filter((t) => t !== tag) }
          : h
      )
    )
  }

  const saveTags = async (hackerId: string) => {
    const hacker = hackers.find((h) => h.id === hackerId)
    if (!hacker) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/hacker-tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hackerId, tags: hacker.tags }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`Tags saved for ${hacker.handle}`)
        setEditingId(null)
        setNewTag('')
      } else {
        toast.error(data.error || 'Save failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!authed) {
    return <div className="container mx-auto px-4 py-8">Checking auth...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <PageHeader
        title="Defacer Tags"
        subtitle="Add custom tags / julukan to defacers"
      />

      <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
        Tags appear next to defacer names on ranking + profile pages.
        Examples: "Legend", "Pioneer", "Sang Peretas", "God of Defacement".
        Max 10 tags per defacer, 30 chars each.
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : hackers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No defacers found.
        </div>
      ) : (
        <div className="space-y-3">
          {hackers.map((hacker) => (
            <Card key={hacker.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono font-bold text-primary">{hacker.handle}</span>
                      <span className="text-xs text-muted-foreground">
                        {hacker.totalHits.toLocaleString()} hits
                      </span>
                      {hacker.team && (
                        <Badge variant="outline" className="text-xs">{hacker.team}</Badge>
                      )}
                      {hacker.country && (
                        <span className="text-xs text-muted-foreground">{hacker.country}</span>
                      )}
                    </div>

                    {/* Tags display + edit */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {editingId === hacker.id ? (
                        <>
                          {hacker.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {tag}
                              <button
                                onClick={() => removeTag(hacker.id, tag)}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          <Input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addTag(hacker.id, newTag)
                              }
                            }}
                            placeholder="Type tag + Enter"
                            className="h-7 w-40 text-xs"
                            maxLength={30}
                          />
                        </>
                      ) : (
                        hacker.tags.length > 0 ? (
                          hacker.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No tags</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 shrink-0">
                    {editingId === hacker.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelEdit()}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveTags(hacker.id)}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(hacker)}
                      >
                        Edit Tags
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
