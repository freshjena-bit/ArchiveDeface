'use client'

import * as React from 'react'
import { Upload, ShieldCheck, Lock, KeyRound, FileText, Send, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const COUNTRIES = [
  'ID', 'US', 'RU', 'BR', 'CN', 'IN', 'DE', 'MX', 'FR', 'TR', 'PL', 'JP', 'EG', 'GB',
]
const CATEGORIES = ['gov', 'edu', 'com', 'org', 'mil', 'fin']
const SEVERITIES = ['low', 'medium', 'high', 'critical']

export function SubmitReport({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = React.useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      targetUrl: String(fd.get('url') ?? ''),
      targetName: String(fd.get('name') ?? ''),
      country: String(fd.get('country') ?? ''),
      category: String(fd.get('category') ?? ''),
      handle: String(fd.get('handle') ?? ''),
      team: String(fd.get('team') ?? '') || 'INDEPENDENT',
      note: String(fd.get('note') ?? ''),
      severity: String(fd.get('severity') ?? 'medium'),
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'submit failed')
      toast({
        title: 'Record archived',
        description: `Incident logged with id ${String(data.id).slice(0, 8)}…`,
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        title: 'Submission rejected',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="submit" className="relative border-t border-border/60 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/50 p-6 backdrop-blur sm:p-10">
          <div className="absolute inset-0 -z-10 bg-grid-sm opacity-30" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                {'// contribute'}
              </div>
              <h2 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                Submit an incident
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Found a compromised surface? File it to the archive. Every
                submission is attributed, mirror-snapshotted and timestamped.
                We accept responsible disclosures only — never dox, never
                exfiltrate, never sell.
              </p>

              <div className="mt-6 space-y-3">
                <Trust icon={ShieldCheck} text="Mirror snapshot generated on submission" />
                <Trust icon={Lock} text="Submitted over an anonymous relay" />
                <Trust icon={KeyRound} text="Attribution bound to your handle, not your identity" />
                <Trust icon={FileText} text="Disclosure ethics reviewed by maintainers" />
              </div>
            </div>

            {/* trigger */}
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border/60 bg-background/40 p-6 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary box-glow">
                <Upload className="h-6 w-6" />
              </div>
              <div className="font-mono text-sm font-bold text-foreground">
                open the submission terminal
              </div>
              <p className="max-w-xs font-mono text-[11px] text-muted-foreground">
                six required fields. average submission time: under a minute.
              </p>
              <Button
                onClick={() => onOpenChange(true)}
                className="mt-1 gap-2 font-mono uppercase tracking-wider"
              >
                <Send className="h-4 w-4" />
                file incident
              </Button>
              <p className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/60">
                <AlertTriangle className="h-3 w-3" />
                submitting false records bans your handle
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl border-border/70 bg-card/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <span className="grid h-7 w-7 place-items-center rounded bg-primary/15 text-primary">
                <Upload className="h-4 w-4" />
              </span>
              file a defacement incident
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Required fields marked with <span className="text-primary">*</span>. Your handle is bound to the record permanently.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Target URL *">
                <Input
                  name="url"
                  required
                  placeholder="https://target.archive-demo.test"
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Target name">
                <Input
                  name="name"
                  placeholder="Ministry of …"
                  className="font-mono text-xs"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Handle *">
                <Input
                  name="handle"
                  required
                  placeholder="n0vakane"
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Team / crew">
                <Input
                  name="team"
                  placeholder="PHANTOM CREW"
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Country *">
                <Select name="country" defaultValue="ID">
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category *">
                <Select name="category" defaultValue="gov">
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Severity">
                <Select name="severity" defaultValue="medium">
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Note / message left on target">
              <Textarea
                name="note"
                rows={3}
                placeholder="Default credentials are not a strategy."
                className="font-mono text-xs"
              />
            </Field>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="font-mono text-xs"
              >
                cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 font-mono text-xs uppercase"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'archiving…' : 'submit & mirror'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Trust({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="font-mono text-xs text-muted-foreground">{text}</span>
    </div>
  )
}
