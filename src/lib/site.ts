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

// ccTLD -> ISO-2 country code (subset used by the demo)
const CCTLD: Record<string, string> = {
  id: 'ID', ru: 'RU', br: 'BR', cn: 'CN', in: 'IN', de: 'DE', mx: 'MX',
  fr: 'FR', tr: 'TR', pl: 'PL', jp: 'JP', eg: 'EG', gb: 'GB', uk: 'GB',
  us: 'US', au: 'AU', ca: 'CA', sa: 'SA', ir: 'IR', kr: 'KR', vn: 'VN',
  th: 'TH', my: 'MY', ph: 'PH', sg: 'SG', pk: 'PK', bd: 'BD', ng: 'NG',
  za: 'ZA', ar: 'AR', it: 'IT', es: 'ES', nl: 'NL', se: 'SE', no: 'NO',
}

/**
 * Match a "special archive" domain pattern in the target URL's hostname.
 * Special archives are domain-segment based:
 *   *.gov.*  — government
 *   *.go.*   — government (alt, e.g. go.id)
 *   *.ac.*   — academic, country-specific (ac.ru, ac.id, … all countries)
 *   *.edu.*  — education (same idea as *.ac.*)
 * Returns the matched pattern key, or null if none.
 */
export function matchSpecialDomain(url: string): 'gov' | 'go' | 'ac' | 'edu' | null {
  let host = ''
  try {
    host = new URL(url.trim()).hostname.toLowerCase()
  } catch {
    host = url.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0] || url.trim()
  }
  const segs = host.split('.')
  if (segs.includes('gov')) return 'gov'
  if (segs.includes('go')) return 'go'
  if (segs.includes('ac')) return 'ac'
  if (segs.includes('edu')) return 'edu'
  return null
}

/**
 * Auto-derive display metadata from a target URL so the submit form stays
 * minimal (urls + attacker + team + poc + reason) while the archive/mirror
 * still shows country, category and a label.
 */
export function deriveMeta(url: string): {
  country: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  targetName: string
  specialDomain: 'gov' | 'go' | 'ac' | 'edu' | null
} {
  let host = ''
  let path = ''
  try {
    const u = new URL(url.trim())
    host = u.hostname.toLowerCase()
    path = (u.pathname + u.search).toLowerCase()
  } catch {
    // not a valid URL — try to grab the host-ish chunk
    host = url.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0] || url.trim()
  }
  const parts = host.split('.')
  const last = parts[parts.length - 1]
  const country = CCTLD[last] ?? 'US'

  const segs = parts
  const combined = host + ' ' + path
  // category is segment-based for the special domain patterns
  let category = 'com'
  if (segs.includes('gov') || segs.includes('go')) category = 'gov'
  else if (segs.includes('edu') || segs.includes('ac')) category = 'edu'
  else if (combined.includes('mil')) category = 'mil'
  else if (combined.includes('fin') || combined.includes('bank') || combined.includes('pay')) category = 'fin'
  else if (combined.includes('org')) category = 'org'

  const targetName = host || url
  const specialDomain = matchSpecialDomain(url)
  return { country, category, severity: 'medium', targetName, specialDomain }
}
