'use client'

import * as React from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Upload, Send, ShieldCheck, Lock, KeyRound, Link2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useHashRoute } from '@/lib/use-hash-route'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const POC_OPTIONS = [
  'Known vulnerability (i.e. unpatched system)',
  'Undisclosed (new) vulnerability',
  'Configuration / admin. mistake',
  'Brute force attack',
  'Social engineering',
  'Web Server intrusion',
  'Web Server external module intrusion',
  'Mail Server intrusion',
  'FTP Server intrusion',
  'SSH Server intrusion',
  'Telnet Server intrusion',
  'RPC Server intrusion',
  'Shares misconfiguration',
  'Other Server intrusion',
  'SQL Injection',
  'URL Poisoning',
  'File Inclusion',
  'Other Web Application bug',
  'Remote administrative panel access through bruteforcing',
  'Remote administrative panel access through password guessing',
  'Remote administrative panel access through social engineering',
  'Attack against the administrator/user (password stealing/sniffing)',
  'Access credentials through Man in the Middle attack',
  'Remote service password guessing',
  'Remote service password bruteforce',
  'Rerouting after attacking the Firewall',
  'Rerouting after attacking the Router',
  'DNS attack through social engineering',
  'DNS attack through cache poisoning',
  'Cross-Site Scripting',
  'Not available',
]

const REASON_OPTIONS = [
  'Heh...just for fun!',
  'Revenge against that website',
  'Political reasons',
  'As a challenge',
  'I just want to be the best defacer',
  'Patriotism',
  'Not available',
]

export function SubmitForm() {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const { navigate } = useHashRoute()
  const [submitting, setSubmitting] = React.useState(false)
  const [urlCount, setUrlCount] = React.useState(0)
  // fetch registered defacer handles for the attacker autocomplete + validation hint
  const { data: handlesData } = useSWR<{ items: { handle: string }[] }>(
    '/api/leaderboard?mode=defacers&year=all',
    fetcher,
    { refreshInterval: 60000 }
  )
  const registeredHandles = (handlesData?.items ?? []).map((i) => i.handle)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      urls: String(fd.get('urls') ?? ''),
      attacker: String(fd.get('attacker') ?? ''),
      team: String(fd.get('team') ?? '') || 'INDEPENDENT',
      poc: String(fd.get('poc') ?? ''),
      reason: String(fd.get('reason') ?? ''),
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
        title: 'Submitted — on hold',
        description: `${data.created} incident${data.created === 1 ? '' : 's'} queued for verification. Promoted to verified in ~10 min. Redirecting…`,
      })
      ;(e.target as HTMLFormElement).reset()
      setUrlCount(0)
      await Promise.all([
        mutate((key) => typeof key === 'string' && key.startsWith('/api/defacements')),
        mutate('/api/stats'),
        mutate('/api/leaderboard'),
      ])
      // redirect to home after a short delay so the toast is readable
      setTimeout(() => navigate('/'), 900)
    } catch (err) {
      toast({ title: 'Submission rejected', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const onUrlsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    setUrlCount(v.length)
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
            {/* URLs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Target URLs *
                </Label>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  {urlCount} url{urlCount === 1 ? '' : 's'}
                </span>
              </div>
              <Textarea
                name="urls"
                required
                onChange={onUrlsChange}
                rows={5}
                placeholder={'https://test.com\nhttps://test2.com'}
                className="font-mono text-xs"
              />
              <p className="font-mono text-[10px] text-muted-foreground/70">
                One URL per line. Each line becomes its own archived incident.
              </p>
            </div>

            {/* attacker + team */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Attacker handle *">
                <Input
                  name="attacker"
                  required
                  list="registered-handles"
                  placeholder="n0vakane (must be registered)"
                  className="h-9 font-mono text-xs"
                />
                <datalist id="registered-handles">
                  {registeredHandles.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
                <p className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70">
                  <UserCheck className="h-3 w-3" />
                  must be a registered defacer
                  {registeredHandles.length > 0 && (
                    <span className="text-muted-foreground/50">
                      ({registeredHandles.length} registered · {registeredHandles.slice(0, 3).join(', ')}…)
                    </span>
                  )}
                  — unregistered handles are rejected.
                </p>
              </Field>
              <Field label="Team / crew">
                <Input name="team" placeholder="PHANTOM CREW" className="h-9 font-mono text-xs" />
              </Field>
            </div>

            {/* poc + reason */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Proof of Concept">
                <Select name="poc">
                  <SelectTrigger className="h-9 font-mono text-xs">
                    <SelectValue placeholder="SELECT ONE" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {POC_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="font-mono text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Reason">
                <Select name="reason">
                  <SelectTrigger className="h-9 font-mono text-xs">
                    <SelectValue placeholder="SELECT ONE" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {REASON_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o} className="font-mono text-xs">
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
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
            <Trust icon={ShieldCheck} text="Mirror snapshot generated per URL" />
            <Trust icon={Lock} text="Routed through an anonymous relay" />
            <Trust icon={KeyRound} text="Attribution bound to your handle, not identity" />
            <Trust icon={Upload} text="Country & category auto-derived from URL" />
            <p className="pt-1 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
              Responsible disclosures only. No doxxing, no exfiltrated data,
              no credential dumps. This is a demo — no real target is ever touched.
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
