import { db } from "../src/lib/db"
import { deriveMeta } from "../src/lib/site"

// Original, fictional mock data for the defacement archive.
// Hacker handles and team names are invented. Target URLs point to real,
// public, non-controversial domains (standards bodies, registries, reserved
// example domains) so the mirror viewer can capture a real webpage screenshot.

// pool of real, reachable, safe target URLs (standards / registries / reserved)
const REAL_TARGETS = [
  "https://example.com",
  "https://example.org",
  "https://example.net",
  "https://example.edu",
  "https://example.gov",
  "https://en.wikipedia.org",
  "https://www.iana.org",
  "https://archive.org",
  "https://www.kernel.org",
  "https://www.gnu.org",
  "https://www.w3.org",
  "https://www.iso.org",
  "https://www.ripe.net",
  "https://www.apnic.net",
  "https://www.nic.br",
  "https://www.jprs.jp",
  "https://www.registry.in",
  "https://www.nic.fr",
  "https://www.dns.de",
  "https://www.cctld.ru",
  "https://www.idnic.or.id",
  "https://www.gov.uk",
  "https://www.gov.au",
  "https://www.mit.edu",
  "https://www.stanford.edu",
  "https://www.berkeley.edu",
  "https://www.cam.ac.uk",
]

const HACKERS = [
  { handle: "n0vakane", team: "PHANTOM CREW", country: "ID", color: "#22c55e", bio: "White-hat by day, archive contributor by night." },
  { handle: "gh0stbyte", team: "NULLSEC", country: "RU", color: "#ef4444", bio: "Unauthorised literature enthusiast." },
  { handle: "kr1pton", team: "PHANTOM CREW", country: "BR", color: "#eab308", bio: "Loves a good misconfigured nginx." },
  { handle: "v0idwalker", team: "SPECTRE", country: "US", color: "#06b6d4", bio: "Read the source, then read it again." },
  { handle: "byteWraith", team: "NULLSEC", country: "CN", color: "#a855f7", bio: "Logs don't lie, but they do omit." },
  { handle: "r00tless", team: "OUTLAWS", country: "IN", color: "#f97316", bio: "If it ships with default creds, it ships with me." },
  { handle: "s1lentshade", team: "SPECTRE", country: "DE", color: "#14b8a6", bio: "Quiet hands, loud impact." },
  { handle: "cyb3rKaos", team: "OUTLAWS", country: "MX", color: "#ec4899", bio: "Documenting the chaos, one snapshot at a time." },
  { handle: "h3xPrincess", team: "PHANTOM CREW", country: "FR", color: "#84cc16", bio: "Deserves the crown." },
  { handle: "d4rkw0lf", team: "NULLSEC", country: "TR", color: "#f43f5e", bio: "Howls at exposed .env files." },
  { handle: "zer0c00l", team: "OUTLAWS", country: "PL", color: "#22d3ee", bio: "Cooler than zero." },
  { handle: "m1ssing", team: "SPECTRE", country: "JP", color: "#a3e635", bio: "Not found, like the patches." },
  { handle: "br0k3nKey", team: "PHANTOM CREW", country: "EG", color: "#fb923c", bio: "Your auth token was base64. That's not encryption." },
  { handle: "n3m3sis", team: "NULLSEC", country: "GB", color: "#c084fc", bio: "Revenge is a dish best served cached." },
  { handle: "p4radox", team: "OUTLAWS", country: "ID", color: "#2dd4bf", bio: "Defending by demonstrating." },
]

const SEVERITIES = ["low", "medium", "high", "critical"]

const POCS = [
  'Exposed .env file served by the web root; secrets harvested in <1s.',
  'Outdated CMS (v4.x) with known RCE; payload dropped via upload handler.',
  'Default admin credentials (admin/admin) left enabled on management panel.',
  'Misconfigured nginx alias traversal exposed /etc/ to the public.',
  'Reflected XSS chained with a stored token leak to pivot access.',
  'Unauthenticated SSRF via an image-proxy endpoint reached internal APIs.',
  'Broken access control let a low-priv session write to the index page.',
  'Insecure file upload accepted a .php shell under a double extension.',
  'Debug console left enabled in production; arbitrary eval executed.',
  'IDOR on the edit endpoint allowed overwriting the landing page.',
]

const REASONS = [
  'Your security is a costume. Patched for the archive, not for clout.',
  'Consider this a free pentest report. Patch the surface, not the ego.',
  'Default credentials are not a strategy. Change them, then rotate keys.',
  'Logged, mirrored, reported. You are welcome to do better.',
  'Three steps from root: exposed config → database → homepage. Fix step one.',
  'Update your CMS. Then update it again. Then stop shipping defaults.',
  'Security through obscurity failed, again. The record is now public.',
  'The robots.txt was more informative than your docs. Read your own logs.',
  'Mirrored for the historical record. No data was exfiltrated.',
  'Friendly reminder: the admin password is not "admin".',
]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// derive the H/M/R/S marks for a seeded record
function deriveMarks(category: string, _severity: string) {
  // S — special = domain matches a special-archive pattern (gov / edu category,
  // which covers *.gov.*, *.go.*, *.ac.*, *.edu.*). NOT severity-based.
  const isSpecial = category === 'gov' || category === 'edu'
  return {
    isHomepage: Math.random() < 0.72, // H — most hit the homepage
    isMass: Math.random() < 0.35, // M — part of a mass campaign
    isRedeface: Math.random() < 0.12, // R — re-defaced after a prior incident
    isSpecial, // S
  }
}

async function main() {
  console.log("Seeding database...")
  // wipe
  await db.defacement.deleteMany()
  await db.hacker.deleteMany()
  await db.stat.deleteMany()

  // create hackers
  const hackers = await Promise.all(
    HACKERS.map((h) =>
      db.hacker.create({
        data: {
          handle: h.handle,
          team: h.team,
          country: h.country,
          avatarColor: h.color,
          bio: h.bio,
        },
      })
    )
  )

  // create defacements across the past 30 days
  const now = Date.now()
  const TOTAL = 420
  const records = []
  for (let i = 0; i < TOTAL; i++) {
    const attacker = rand(hackers)
    const url = rand(REAL_TARGETS)
    const meta = deriveMeta(url) // country / category / targetName / specialDomain from the real URL
    const severity = rand(SEVERITIES)
    const createdAt = new Date(now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
    records.push({
      targetUrl: url,
      targetName: meta.targetName,
      country: meta.country,
      category: meta.category,
      attackerId: attacker.id,
      mirrorUrl: `https://mirror.archive.test/snap-${Math.random().toString(36).slice(2, 10)}`,
      poc: rand(POCS),
      reason: rand(REASONS),
      status: (() => {
        const r = Math.random()
        return r < 0.6 ? "archived" : r < 0.85 ? "restored" : "onhold"
      })(),
      severity,
      ...deriveMarks(meta.category, severity),
      createdAt,
    })
  }
  await db.defacement.createMany({ data: records })

  // compute hacker ranks/totalHits
  for (const h of hackers) {
    const total = await db.defacement.count({ where: { attackerId: h.id } })
    await db.hacker.update({ where: { id: h.id }, data: { totalHits: total, rank: total } })
  }

  // stats
  const totalDef = await db.defacement.count()
  const totalHackers = await db.hacker.count()
  const distinctCountries = await db.defacement.findMany({ distinct: ["country"], select: { country: true } })
  await db.stat.createMany({
    data: [
      { key: "total_defacements", value: totalDef },
      { key: "total_attackers", value: totalHackers },
      { key: "total_countries", value: distinctCountries.length },
      { key: "today_attacks", value: Math.floor(Math.random() * 18) + 6 },
    ],
  })

  console.log(`Seeded ${totalDef} defacements across ${totalHackers} hackers.`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
