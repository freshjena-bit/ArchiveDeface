// ISO-2 code -> flag emoji + name (subset used by the demo)

const NAMES: Record<string, string> = {
  ID: 'Indonesia', US: 'United States', RU: 'Russia', BR: 'Brazil', CN: 'China',
  IN: 'India', DE: 'Germany', MX: 'Mexico', FR: 'France', TR: 'Turkey',
  PL: 'Poland', JP: 'Japan', EG: 'Egypt', GB: 'United Kingdom',
}

export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🏳️'
  const upper = code.toUpperCase()
  const A = 0x1f1e6
  const base = 'A'.charCodeAt(0)
  const cc1 = A + (upper.charCodeAt(0) - base)
  const cc2 = A + (upper.charCodeAt(1) - base)
  return String.fromCodePoint(cc1, cc2)
}

export function countryName(code: string | null | undefined): string {
  if (!code) return 'Unknown'
  return NAMES[code.toUpperCase()] ?? code.toUpperCase()
}

const SEVERITY_META = {
  low: { label: 'LOW', color: 'text-term-green', dot: 'bg-term-green', ring: 'border-term-green/40' },
  medium: { label: 'MED', color: 'text-term-amber', dot: 'bg-term-amber', ring: 'border-term-amber/40' },
  high: { label: 'HIGH', color: 'text-orange-400', dot: 'bg-orange-400', ring: 'border-orange-400/40' },
  critical: { label: 'CRIT', color: 'text-term-red', dot: 'bg-term-red', ring: 'border-term-red/40' },
} as const

export function severityMeta(s: string) {
  return SEVERITY_META[s as keyof typeof SEVERITY_META] ?? SEVERITY_META.medium
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  gov: { label: 'Government', icon: 'landmark' },
  edu: { label: 'Education', icon: 'graduation-cap' },
  com: { label: 'Commercial', icon: 'building-2' },
  org: { label: 'Organisation', icon: 'users' },
  mil: { label: 'Military', icon: 'shield' },
  fin: { label: 'Financial', icon: 'banknote' },
}

export function categoryMeta(c: string) {
  return CATEGORY_META[c] ?? { label: c, icon: 'folder' }
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const day = Math.floor(h / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  return `${mo}mo ago`
}
