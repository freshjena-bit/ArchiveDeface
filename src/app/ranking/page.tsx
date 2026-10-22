import type { Metadata } from 'next'
import { RankingView } from '@/components/site/views/ranking-view'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Top Defacers Ranking — DEFACERZONEID',
  description:
    'Leaderboard of top defacers ranked by total archived defacements. Browse by individual defacer or team.',
  alternates: { canonical: 'https://defacer.zone.id/ranking' },
  openGraph: {
    title: 'Top Defacers Leaderboard — DEFACERZONEID',
    description: 'Ranking of defacers by archived hits, with team breakdowns.',
    type: 'website',
  },
}

export default function Page() {
  return <RankingView />
}
