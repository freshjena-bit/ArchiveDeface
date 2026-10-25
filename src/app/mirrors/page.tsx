import type { Metadata } from 'next'
import { readDb } from '@/lib/db'
import { PageHeader } from '@/components/site/views/page-header'
import { cached } from '@/lib/cache'

// ISR — 1 hour cache. Admin changes trigger revalidatePath on POST/PUT/DELETE.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Cross-Mirror Hall of Fame — Top Defacers Across All Archives — DEFACERZONEID',
  description:
    'Global leaderboard of top defacers ranked by total archive count across all defacement mirrors: DEFACERZONEID, Zone-H, Zone-Ar, and more.',
  alternates: { canonical: 'https://defacer.zone.id/mirrors' },
  openGraph: {
    title: 'Cross-Mirror Hall of Fame — DEFACERZONEID',
    description: 'Top defacers across all defacement archive mirrors, ranked by total archive count.',
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
        orderBy: { totalArchive: 'desc' },
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

  // Global leaderboard = all entries sorted by totalArchive DESC
  const globalRanking = items

  // DEFACERZONEID-only ranking = filter mirror = 'DEFACERZONEID'
  const defacerzoneidRanking = items
    .filter((i) => i.mirror.toUpperCase() === 'DEFACERZONEID')
    .sort((a, b) => b.totalArchive - a.totalArchive)

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <PageHeader
        title="Cross-Mirror Hall of Fame"
        subtitle="Top defacers across all defacement archive mirrors"
      />

      <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Aggregate leaderboard of top defacers across multiple defacement
          archive mirrors. Data is manually curated — entries reflect
          total archive count per defacer per mirror as of last update.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">No mirror rankings yet.</p>
          <p className="text-sm text-muted-foreground">
            Admin can add entries via{' '}
            <code className="px-1 py-0.5 bg-muted rounded">/admin/mirrors</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* === Section 1: Global Leaderboard === */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold font-mono text-primary">
                🏆 Global Top Defacers
              </h2>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {globalRanking.length} entries
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              All mirrors combined, ranked by total archive count (highest = #1).
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold w-16">Rank</th>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Archive</th>
                    <th className="text-left py-3 px-4 font-semibold">Mirror</th>
                    <th className="text-left py-3 px-4 font-semibold">Team</th>
                    <th className="text-left py-3 px-4 font-semibold">Country</th>
                  </tr>
                </thead>
                <tbody>
                  {globalRanking.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold ${
                            i === 0
                              ? 'text-yellow-500 text-lg'
                              : i === 1
                                ? 'text-gray-400 text-lg'
                                : i === 2
                                  ? 'text-orange-600 text-lg'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-primary">
                        {entry.handle}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {entry.totalArchive.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          entry.mirror.toUpperCase() === 'DEFACERZONEID'
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {entry.mirror}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {entry.team ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {entry.country ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* === Section 2: DEFACERZONEID Ranking === */}
          {defacerzoneidRanking.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold font-mono text-primary">
                  🏠 DEFACERZONEID Ranking
                </h2>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {defacerzoneidRanking.length} defacers
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Defacers archived on DEFACERZONEID mirror, ranked by total archive count.
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold w-16">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-right py-3 px-4 font-semibold">Total Archive</th>
                      <th className="text-left py-3 px-4 font-semibold">Team</th>
                      <th className="text-left py-3 px-4 font-semibold">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defacerzoneidRanking.map((entry, i) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-primary">
                          {entry.handle}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {entry.totalArchive.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {entry.team ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {entry.country ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Notes section */}
          {items.some((i) => i.notes) && (
            <section>
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {items
                  .filter((i) => i.notes)
                  .map((i) => (
                    <li key={i.id}>
                      <span className="font-mono font-semibold text-primary">{i.handle}</span>
                      {' '}
                      ({i.mirror}): {i.notes}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
