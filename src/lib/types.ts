export type Attacker = {
  handle: string
  team: string | null
  color: string
  country: string | null
}

export type Defacement = {
  id: string
  targetUrl: string
  targetName: string
  country: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'archived' | 'restored' | 'live'
  note: string | null
  mirrorUrl: string | null
  createdAt: string
  attacker: Attacker
}

export type Stats = {
  counters: {
    totalDefacements: number
    totalAttackers: number
    totalCountries: number
    todayAttacks: number
  }
  timeseries: { date: string; count: number }[]
  categories: { name: string; count: number }[]
  countries: { code: string; count: number }[]
}

export type LeaderEntry = {
  id: string
  handle: string
  team: string | null
  country: string | null
  color: string
  bio: string | null
  totalHits: number
  rank: number
  joinedAt: string
  badges: string[]
}
