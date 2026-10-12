#!/usr/bin/env tsx
/**
 * Migrate ALL data from Neon (primary DB) to Supabase (fallback DB).
 *
 * This is a ONE-TIME migration script. Run it once after setting up
 * Supabase to copy all existing data from Neon to Supabase.
 *
 * Prerequisites:
 * 1. DATABASE_URL must be set to Neon (primary)
 * 2. DATABASE_URL_SUPABASE must be set to Supabase
 * 3. Schema must be pushed to BOTH databases:
 *    bun run db:push                          # push to Neon
 *    DATABASE_URL=<supabase_url> bun run db:push  # push to Supabase
 *
 * Usage:
 *   bun run scripts/migrate-neon-to-supabase.ts
 *
 * Or with explicit env vars:
 *   DATABASE_URL=neon_url DATABASE_URL_SUPABASE=supabase_url bun run scripts/migrate-neon-to-supabase.ts
 *
 * What it does:
 *   1. Reads ALL Hackers from Neon → upsert to Supabase
 *   2. Reads ALL Defacements from Neon → upsert to Supabase
 *   3. Reads ALL News from Neon → upsert to Supabase
 *   4. Reads ALL Stats from Neon → upsert to Supabase
 *   5. Prints summary (migrated count per table)
 *
 * The script uses upsert (not create) so it's idempotent — re-running
 * won't create duplicates. Safe to run multiple times.
 */

import { PrismaClient } from '@prisma/client'

async function main() {
  const neonUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.DATABASE_URL_SUPABASE

  if (!neonUrl) {
    console.error('Error: DATABASE_URL (Neon) not set')
    process.exit(1)
  }
  if (!supabaseUrl) {
    console.error('Error: DATABASE_URL_SUPABASE not set')
    console.error('Set it to your Supabase connection string:')
    console.error('  DATABASE_URL_SUPABASE=postgresql://... bun run scripts/migrate-neon-to-supabase.ts')
    process.exit(1)
  }

  console.log('═'.repeat(60))
  console.log('Neon → Supabase Data Migration')
  console.log('═'.repeat(60))
  console.log(`Neon:     ${neonUrl.slice(0, 30)}...`)
  console.log(`Supabase: ${supabaseUrl.slice(0, 30)}...`)
  console.log()

  // Create two separate PrismaClient instances
  const neon = new PrismaClient({
    datasources: { db: { url: neonUrl } },
    log: ['error'],
  })
  const supabase = new PrismaClient({
    datasources: { db: { url: supabaseUrl } },
    log: ['error'],
  })

  try {
    // ─── 1. Migrate Hackers ───
    console.log('Reading Hackers from Neon...')
    const hackers = await neon.hacker.findMany()
    console.log(`  Found ${hackers.length} hackers`)

    let hackerCount = 0
    let hackerErrors = 0
    for (const h of hackers) {
      try {
        await supabase.hacker.upsert({
          where: { id: h.id },
          create: h,
          update: h,
        })
        hackerCount++
      } catch (e) {
        hackerErrors++
        console.error(`  Error migrating hacker ${h.handle}:`, (e as Error).message.slice(0, 100))
      }
    }
    console.log(`  ✅ Migrated ${hackerCount} hackers (${hackerErrors} errors)\n`)

    // ─── 2. Migrate Defacements ───
    console.log('Reading Defacements from Neon...')
    const defacements = await neon.defacement.findMany()
    console.log(`  Found ${defacements.length} defacements`)

    let defaceCount = 0
    let defaceErrors = 0
    const BATCH_SIZE = 100
    for (let i = 0; i < defacements.length; i += BATCH_SIZE) {
      const batch = defacements.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(defacements.length / BATCH_SIZE)
      process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${i+1}-${Math.min(i+BATCH_SIZE, defacements.length)})... `)

      let batchOk = 0
      let batchErr = 0
      for (const d of batch) {
        try {
          await supabase.defacement.upsert({
            where: { id: d.id },
            create: d,
            update: d,
          })
          batchOk++
          defaceCount++
        } catch (e) {
          batchErr++
          defaceErrors++
        }
      }
      console.log(`ok=${batchOk} err=${batchErr}`)
    }
    console.log(`  ✅ Migrated ${defaceCount} defacements (${defaceErrors} errors)\n`)

    // ─── 3. Migrate News ───
    console.log('Reading News from Neon...')
    const news = await neon.news.findMany()
    console.log(`  Found ${news.length} news items`)

    let newsCount = 0
    let newsErrors = 0
    for (const n of news) {
      try {
        await supabase.news.upsert({
          where: { id: n.id },
          create: n,
          update: n,
        })
        newsCount++
      } catch (e) {
        newsErrors++
      }
    }
    console.log(`  ✅ Migrated ${newsCount} news (${newsErrors} errors)\n`)

    // ─── 4. Migrate Stats ───
    console.log('Reading Stats from Neon...')
    const stats = await neon.stat.findMany()
    console.log(`  Found ${stats.length} stats`)

    let statCount = 0
    let statErrors = 0
    for (const s of stats) {
      try {
        await supabase.stat.upsert({
          where: { id: s.id },
          create: s,
          update: s,
        })
        statCount++
      } catch (e) {
        statErrors++
      }
    }
    console.log(`  ✅ Migrated ${statCount} stats (${statErrors} errors)\n`)

    // ─── Summary ───
    console.log('═'.repeat(60))
    console.log('MIGRATION SUMMARY')
    console.log('═'.repeat(60))
    console.log(`Hackers:      ${hackerCount} migrated, ${hackerErrors} errors`)
    console.log(`Defacements:  ${defaceCount} migrated, ${defaceErrors} errors`)
    console.log(`News:         ${newsCount} migrated, ${newsErrors} errors`)
    console.log(`Stats:        ${statCount} migrated, ${statErrors} errors`)
    console.log(`Total:        ${hackerCount + defaceCount + newsCount + statCount} migrated`)
    console.log()

    if (hackerErrors + defaceErrors + newsErrors + statErrors > 0) {
      console.log('⚠️  Some records had errors. Check output above.')
      console.log('   Re-run the script to retry (idempotent — uses upsert).')
    } else {
      console.log('✅ All records migrated successfully!')
    }

    console.log()
    console.log('Supabase now has a full copy of Neon data.')
    console.log('Dual-DB fallback is ready — if Neon hits 100% compute,')
    console.log('Supabase will serve all reads + accept all writes.')

  } finally {
    await neon.$disconnect()
    await supabase.$disconnect()
  }
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
