import { HomeView } from '@/components/site/views/home-view'
import { getStats } from '@/lib/stats'
import type { Stats } from '@/lib/types'

// Server-side fetch stats so the initial HTML contains real numbers
// (not "000") — fixes Google search snippet showing zeros.
export default async function Home() {
  let initialStats: Stats | undefined
  try {
    initialStats = await getStats()
  } catch {
    // DB unreachable — client SWR will fetch on load
  }
  return <HomeView initialStats={initialStats} />
}
