'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/site/views/page-header'
import { toast } from 'sonner'

interface MirrorEntry {
  id: string
  handle: string
  totalArchive: number
  mirror: string
  country: string | null
  team: string | null
  notes: string | null
  updatedAt: string
}

export default function AdminMirrorsPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<MirrorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [handle, setHandle] = useState('')
  const [totalArchive, setTotalArchive] = useState(0)
  const [mirror, setMirror] = useState('DEFACERZONEID')
  const [country, setCountry] = useState('')
  const [team, setTeam] = useState('')
  const [notes, setNotes] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.user) {
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

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/mirror-rankings')
      const data = await res.json()
      if (data.ok) {
        setEntries(data.items ?? [])
      }
    } catch (e) {
      toast.error('Failed to load entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (authed) fetchEntries()
  }, [authed, fetchEntries])

  const resetForm = () => {
    setEditingId(null)
    setHandle('')
    setTotalArchive(0)
    setMirror('DEFACERZONEID')
    setCountry('')
    setTeam('')
    setNotes('')
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (entry: MirrorEntry) => {
    setEditingId(entry.id)
    setHandle(entry.handle)
    setTotalArchive(entry.totalArchive)
    setMirror(entry.mirror)
    setCountry(entry.country ?? '')
    setTeam(entry.team ?? '')
    setNotes(entry.notes ?? '')
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        handle: handle.trim(),
        totalArchive: Number(totalArchive),
        mirror: mirror.trim(),
        country: country.trim() || undefined,
        team: team.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      if (editingId) {
        // Update
        const res = await fetch(`/api/mirror-rankings/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.ok) {
          toast.success('Entry updated')
          setDialogOpen(false)
          fetchEntries()
        } else {
          toast.error(data.error || 'Update failed')
        }
      } else {
        // Create
        const res = await fetch('/api/mirror-rankings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.ok) {
          toast.success('Entry created')
          setDialogOpen(false)
          fetchEntries()
        } else {
          toast.error(data.error || 'Create failed')
        }
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    try {
      const res = await fetch(`/api/mirror-rankings/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        toast.success('Entry deleted')
        fetchEntries()
      } else {
        toast.error(data.error || 'Delete failed')
      }
    } catch {
      toast.error('Network error')
    }
  }

  if (!authed) {
    return <div className="container mx-auto px-4 py-8">Checking auth...</div>
  }

  // Group by mirror
  const byMirror = new Map<string, MirrorEntry[]>()
  for (const entry of entries) {
    const arr = byMirror.get(entry.mirror) ?? []
    arr.push(entry)
    byMirror.set(entry.mirror, arr)
  }
  const mirrors = [...byMirror.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <PageHeader
        title="Mirror Rankings Admin"
        subtitle="Manage cross-mirror hall of fame entries"
      />

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {entries.length} entries across {mirrors.length} mirrors
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Add Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Entry' : 'Add New Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="handle">Handle *</Label>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="GadaLuBau"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mirror">Mirror *</Label>
                  <Input
                    id="mirror"
                    value={mirror}
                    onChange={(e) => setMirror(e.target.value)}
                    placeholder="DEFACERZONEID"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="totalArchive">Total Archive *</Label>
                <Input
                  id="totalArchive"
                  type="number"
                  value={totalArchive}
                  onChange={(e) => setTotalArchive(Number(e.target.value))}
                  placeholder="360264"
                  required
                  min={0}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="team">Team</Label>
                  <Input
                    id="team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="SonicNetwork"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="ID"
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes (e.g., active 2015-2020)"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-2">No entries yet.</p>
          <p className="text-sm text-muted-foreground">Click "Add Entry" to create your first mirror ranking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {mirrors.map(([mirrorName, entries]) => (
            <Card key={mirrorName}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-mono">{mirrorName}</CardTitle>
                  <Badge variant="secondary">{entries.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Handle</th>
                        <th className="py-2 px-3">Team</th>
                        <th className="py-2 px-3">Country</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3">Notes</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, i) => (
                        <tr key={entry.id} className="border-b border-border/50">
                          <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-semibold text-primary">{entry.handle}</td>
                          <td className="py-2 px-3 text-muted-foreground">{entry.team ?? '—'}</td>
                          <td className="py-2 px-3 text-muted-foreground">{entry.country ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{entry.totalArchive.toLocaleString()}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{entry.notes ?? ''}</td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(entry.id)} className="text-destructive">
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
