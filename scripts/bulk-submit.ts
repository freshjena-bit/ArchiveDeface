#!/usr/bin/env tsx
/**
 * Bulk submit defacement incidents via /api/submit-public API.
 *
 * Usage:
 *   bun run scripts/bulk-submit.ts urls.txt GadaLuBau SonicNetwork
 *
 *   urls.txt  — file with one URL per line (blank lines + lines starting
 *               with # are skipped)
 *   attacker  — hacker handle (e.g., GadaLuBau)
 *   team      — team name (e.g., SonicNetwork)
 *
 * Optional env vars:
 *   API_URL    — base URL (default: http://localhost:3000)
 *   CHUNK_SIZE — incidents per request (default: 50)
 *   POC        — proof of concept string for ALL incidents
 *   REASON     — motivation string for ALL incidents
 *   SEVERITY   — low | medium | high | critical for ALL incidents
 *   STATUS     — archived | restored | live | onhold (default: archived)
 *
 * Behavior:
 *   - Reads URLs from file
 *   - Chunks into batches (default 50 per request)
 *   - POSTs each batch to /api/submit-public (no rate limit)
 *   - Prints per-batch progress + final summary
 *   - Exits non-zero if any errors occurred
 *
 * Example urls.txt:
 *   https://target1.gov.id/
 *   https://target2.ac.id/path
 *   # comment — skipped
 *   https://target3.go.id/
 */

import fs from 'fs'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? 50)
const POC = process.env.POC
const REASON = process.env.REASON
const SEVERITY = process.env.SEVERITY
const STATUS = process.env.STATUS ?? 'archived'

async function main() {
  const [file, attacker, team] = process.argv.slice(2)

  if (!file || !attacker || !team) {
    console.error('Usage: bun run scripts/bulk-submit.ts <urls-file> <attacker> <team>')
    console.error('Example: bun run scripts/bulk-submit.ts urls.txt GadaLuBau SonicNetwork')
    process.exit(1)
  }

  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }

  // Read + sanitize URLs
  const raw = fs.readFileSync(file, 'utf-8')
  const urls = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (urls.length === 0) {
    console.error('No URLs found in file (blank lines and # comments are skipped).')
    process.exit(1)
  }

  console.log(`Loaded ${urls.length} URL(s) from ${file}`)
  console.log(`Attacker: ${attacker} | Team: ${team}`)
  console.log(`API: ${API_URL} | Chunk: ${CHUNK_SIZE} per request\n`)

  // Build incidents array (all share attacker/team, optional POC/REASON/SEVERITY)
  const incidents = urls.map((targetUrl) => ({
    targetUrl,
    attacker,
    team,
    status: STATUS,
    ...(POC ? { poc: POC } : {}),
    ...(REASON ? { reason: REASON } : {}),
    ...(SEVERITY ? { severity: SEVERITY } : {}),
  }))

  // Chunk into batches
  const chunks: typeof incidents[] = []
  for (let i = 0; i < incidents.length; i += CHUNK_SIZE) {
    chunks.push(incidents.slice(i, i + CHUNK_SIZE))
  }

  let totalCreated = 0
  let totalDuplicates = 0
  let totalErrors = 0
  const allDuplicateHosts: string[] = []
  const allErrorDetails: { url: string; error: string }[] = []
  const allCreatedIds: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const start = i * CHUNK_SIZE + 1
    const end = Math.min(start + chunk.length - 1, incidents.length)
    process.stdout.write(`Batch ${i + 1}/${chunks.length} (URLs ${start}-${end})... `)

    try {
      const res = await fetch(`${API_URL}/api/submit-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidents: chunk }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        console.log(`FAIL: ${data.error || res.statusText}`)
        totalErrors += chunk.length
        continue
      }

      totalCreated += data.created ?? 0
      totalDuplicates += data.duplicates ?? 0
      totalErrors += data.errors ?? 0
      if (Array.isArray(data.duplicateHosts)) allDuplicateHosts.push(...data.duplicateHosts)
      if (Array.isArray(data.errorDetails)) allErrorDetails.push(...data.errorDetails)
      if (Array.isArray(data.ids)) allCreatedIds.push(...data.ids)

      console.log(
        `created=${data.created} dup=${data.duplicates} err=${data.errors} (${data.created + data.duplicates + data.errors} processed)`
      )
    } catch (e) {
      console.log(`NETWORK ERROR: ${(e as Error).message}`)
      totalErrors += chunk.length
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('FINAL SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total URLs in file    : ${urls.length}`)
  console.log(`Created (new)         : ${totalCreated}`)
  console.log(`Duplicates (skipped)  : ${totalDuplicates}`)
  console.log(`Errors                : ${totalErrors}`)
  console.log(`Created IDs (sample)  : ${allCreatedIds.slice(0, 5).join(', ')}${allCreatedIds.length > 5 ? ` ... (${allCreatedIds.length} total)` : ''}`)

  if (allDuplicateHosts.length > 0) {
    console.log(`\nDuplicate hosts (already archived):`)
    Array.from(new Set(allDuplicateHosts)).forEach((h) => console.log(`  - ${h}`))
  }

  if (allErrorDetails.length > 0) {
    console.log(`\nError details (first 5):`)
    allErrorDetails.slice(0, 5).forEach((e) => console.log(`  ${e.url}: ${e.error.slice(0, 100)}`))
    if (allErrorDetails.length > 5) console.log(`  ... and ${allErrorDetails.length - 5} more`)
  }

  process.exit(totalErrors > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
