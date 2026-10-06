'use client'

import * as React from 'react'
import { useSWRConfig } from 'swr'
import { Upload, Send, ShieldCheck, Lock, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const COUNTRIES = ['ID', 'US', 'RU', 'BR', 'CN', 'IN', 'DE', 'MX', 'FR', 'TR', 'PL', 'JP', 'EG', 'GB']
const CATEGORIES = ['gov', 'edu', 'com', 'org', 'mil', 'fin']
const SEVERITIES = ['low', 'medium', 'high', 'critical']

export function SubmitForm() {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
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
      toast({ title: 'Record archived', description: `Incident logged (id ${String(data.id).slice(0, 8)}…)` })
      ;(e.target as HTMLFormElement).reset()
      // live revalidation: new record appears in archive + ticker,
      // counters update, submitter's rank recalculates
      await Promise.all([
        mutate((key) => typeof key === 'string' && key.startsWith('/api/defacements')),
        mutate('/api/stats'),
        mutate('/api/leaderboard'),
      ])
    } catch (err) {
      toast({ title: 'Submission rejected', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="submit" className="scroll-mt-14 border-t border-border/70 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Submit Defacement
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* form */}
          <form
            onSubmit={onSubmit}
            className="lg:col-span-8 rounded-md border border-border/70 bg-card/40 p-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Target URL *">
                <Input name="url" required placeholder="https://target.archive-demo.test" className="h-9 font-mono text-xs" />
              </Field>
              <Field label="Target name">
                <Input name="name" placeholder="Ministry of …" className="h-9 font-mono text-xs" />
              </Field>
              <Field label="Defacer handle *">
                <Input name="handle" required placeholder="n0vakane" className="h-9 font-mono text-xs" />
              </Field>
              <Field label="Team / crew">
                <Input name="team" placeholder="PHANTOM CREW" className="h-9 font-mono text-xs" />
              </Field>
              <Field label="Country *">
                <Select name="country" defaultValue="ID">
                  <SelectTrigger className="h-9 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Category *">
                <Select name="category" defaultValue="gov">
                  <SelectTrigger className="h-9 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Severity">
                <Select name="severity" defaultValue="medium">
                  <SelectTrigger className="h-9 font-mono text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Note left on target">
                  <Input name="note" placeholder="Default credentials are not a strategy." className="h-9 font-mono text-xs" />
                </Field>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                submitting false records bans your handle
              </p>
              <Button type="submit" disabled={submitting} className="gap-2 font-mono text-xs">
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'archiving…' : 'submit & mirror'}
              </Button>
            </div>
          </form>

          {/* trust panel */}
          <div className="lg:col-span-4 space-y-2 rounded-md border border-dashed border-border/70 bg-background/30 p-4">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Submission policy
            </h3>
            <Trust icon={ShieldCheck} text="Mirror snapshot generated on submission" />
            <Trust icon={Lock} text="Routed through an anonymous relay" />
            <Trust icon={KeyRound} text="Attribution bound to your handle, not identity" />
            <Trust icon={Upload} text="Disclosure ethics reviewed by maintainers" />
            <p className="pt-1 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
              Responsible disclosures only. No doxxing, no exfiltrated data,
              no credentials dumps. This is a demo — no real target is ever touched.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Trust({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary">
        <Icon className="h-3 w-3" />
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">{text}</span>
    </div>
  )
}
