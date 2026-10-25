import type { Metadata } from 'next'
import { readDb } from '@/lib/db'
import { PageHeader } from '@/components/site/views/page-header'
import { cached } from '@/lib/cache'

// ISR — 1 hour cache. Admin changes trigger revalidatePath on POST/PUT/DELETE.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Cross-Mirror Hall of Fame — Top Defacers Across All Archives — DEFACERZONEID',
  description:
    'Aggregate leaderboard of top defacers across all defacement archive mirrors: DEFACERZONEID, Zone-H, Zone-Ar, and more. Compare rankings across mirrors.',
  alternates: { canonical: 'https://defacer.zone.id/mirrors' },
  openGraph: {
    title: 'Cross-Mirror Hall of Fame — DEFACERZONEID',
    description: 'Top defacers across all defacement archive mirrors.',
    type: 'website',
  },
}

const BASE_URL = 'https://defacer.zone.id'

export default async function MirrorsPage() {
  let items: {
    id: string
    handle: string
    totalArchive: number
    mirror: string
    country: string | null
    team: string | null
    notes: string | null
  }[] = []

  try {
    items = await readDb((db) =>
      db.mirrorRanking.findMany({
        orderBy: [{ mirror: 'asc' }, { totalArchive: 'desc' }],
        select: {
          id: true,
          handle: true,
          totalArchive: true,
          mirror: true,
          country: true,
          team: true,
          notes: true,
        },
      })
    )
  } catch (e) {
    console.error('[/mirrors] fetch failed:', e)
  }

  // Group by mirror for display
  const byMirror = new Map<string, typeof items>()
  for (const item of items) {
    const arr = byMirror.get(item.mirror) ?? []
    arr.push(item)
    byMirror.set(item.mirror, arr)
  }

  const mirrors = [...byMirror.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHeader
        title="Cross-Mirror Hall of Fame"
        subtitle="Top defacers across all defacement archive mirrors"
      />

      <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          This page aggregates publicly available rankings from multiple defacement
          archive mirrors. Data is manually curated — entries reflect the total
          archive count per defacer per mirror as of the last update.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">No mirror rankings yet.</p>
          <p className="text-sm text-muted-foreground">
            Admin can add entries via <code className="px-1 py-0.5 bg-muted rounded">/admin/mirrors</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {mirrors.map(([mirrorName, entries]) => (
            <section key={mirrorName}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xl font-bold font-mono">{mirrorName}</h2>
                <Badge>{entries.length} defacers</Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">#</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Team</th>
                      <th className="text-left py-3 px-4 font-semibold">Country</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Archive</th>
                      <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr key={entry.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 text-muted-foreground font-mono">{i + 1}</td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                          {entry.handle}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {entry.team ?? '—'}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {entry.country ?? '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          {entry.totalArchive.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          {entry.notes ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// Inline Badge component (avoid extra import if not already available)
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      {children}
    </span>
  )
}
