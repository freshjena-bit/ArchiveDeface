import { db } from "../src/lib/db"

function esc(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return `'${v.toISOString().replace('T',' ').replace('Z','')}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  const lines: string[] = []
  lines.push('-- ZONEDEFACER seed data')
  lines.push('-- Run in D1 Console after 0001_init.sql')
  lines.push('')

  // hackers
  const hackers = await db.hacker.findMany()
  lines.push(`-- Hackers (${hackers.length})`)
  for (const h of hackers) {
    lines.push(`INSERT INTO "Hacker" ("id","handle","team","country","avatarColor","rank","totalHits","badges","bio","joinedAt") VALUES (${esc(h.id)},${esc(h.handle)},${esc(h.team)},${esc(h.country)},${esc(h.avatarColor)},${esc(h.rank)},${esc(h.totalHits)},${esc(h.badges)},${esc(h.bio)},${esc(h.joinedAt)});`)
  }

  // defacements (verified only — exclude onhold for clean seed)
  const defs = await db.defacement.findMany({ where: { status: { not: 'onhold' } }, take: 200 })
  lines.push(``)
  lines.push(`-- Defacements (${defs.length} verified)`)
  for (const d of defs) {
    lines.push(`INSERT INTO "Defacement" ("id","targetUrl","targetName","country","category","attackerId","mirrorUrl","note","poc","reason","isHomepage","isMass","isRedeface","isSpecial","pendingUntil","status","severity","createdAt") VALUES (${esc(d.id)},${esc(d.targetUrl)},${esc(d.targetName)},${esc(d.country)},${esc(d.category)},${esc(d.attackerId)},${esc(d.mirrorUrl)},${esc(d.note)},${esc(d.poc)},${esc(d.reason)},${esc(d.isHomepage)},${esc(d.isMass)},${esc(d.isRedeface)},${esc(d.isSpecial)},${esc(d.pendingUntil)},${esc(d.status)},${esc(d.severity)},${esc(d.createdAt)});`)
  }

  // stats
  const stats = await db.stat.findMany()
  lines.push(``)
  lines.push(`-- Stats (${stats.length})`)
  for (const s of stats) {
    lines.push(`INSERT INTO "Stat" ("id","key","value") VALUES (${esc(s.id)},${esc(s.key)},${esc(s.value)});`)
  }

  // news
  const news = await db.news.findMany()
  lines.push(``)
  lines.push(`-- News (${news.length})`)
  for (const n of news) {
    lines.push(`INSERT INTO "News" ("id","title","body","author","pinned","createdAt","updatedAt") VALUES (${esc(n.id)},${esc(n.title)},${esc(n.body)},${esc(n.author)},${esc(n.pinned)},${esc(n.createdAt)},${esc(n.updatedAt)});`)
  }

  const out = lines.join('\n')
  await Bun.write('migrations/0002_seed.sql', out)
  console.log(`Generated migrations/0002_seed.sql — ${hackers.length} hackers, ${defs.length} defacements, ${stats.length} stats, ${news.length} news`)
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1) })
