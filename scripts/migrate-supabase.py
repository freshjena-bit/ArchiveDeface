#!/usr/bin/env python3
"""
EMERGENCY MIGRATION: Supabase project A → project B via REST API.

Use this when project A is at 100% egress (but not yet paused) and you
need to migrate data to a fresh project B before A gets paused.

Both projects must already exist. Schema in project B must already
exist (run `bun run db:push` with DATABASE_URL=project_B first).

Usage:
  python3 scripts/migrate-supabase.py \\
    --source-url https://aaa.supabase.co \\
    --source-key eyJsourceKeyXXX \\
    --dest-url https://bbb.supabase.co \\
    --dest-key eyJdestKeyYYY

Get credentials from Supabase dashboard → Settings → API:
  - Project URL
  - Project API keys (use anon key for read, service_role key for write
    to bypass RLS on destination)

Resume capability: uses ON CONFLICT DO NOTHING, so safe to re-run if
the script crashes mid-way.
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime


# ---------------------------------------------------------------------------
# Supabase REST API helpers
# ---------------------------------------------------------------------------

def fetch_supabase(url, key, table, offset, limit=1000, retries=3):
    """Fetch a batch of rows from Supabase REST API."""
    endpoint = f'{url}/rest/v1/{table}?select=*&offset={offset}&limit={limit}'
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                endpoint,
                headers={
                    'apikey': key,
                    'Authorization': f'Bearer {key}',
                },
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (attempt + 1) * 5
                print(f'  ⚠️ Rate limited (429), waiting {wait}s...')
                time.sleep(wait)
                continue
            body = e.read().decode('utf-8', errors='replace')[:300]
            if attempt < retries - 1:
                print(f'  ⚠️ HTTP {e.code} (attempt {attempt+1}/{retries}): {body}')
                time.sleep(3)
                continue
            raise
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 5
                print(f'  ⚠️ Fetch failed (attempt {attempt+1}/{retries}), retrying in {wait}s: {e}')
                time.sleep(wait)
            else:
                raise


def insert_supabase(url, key, table, records, batch_size=500, retries=3):
    """Insert a batch of records into Supabase via REST API (upsert).
    Uses 'Prefer: resolution=ignore-duplicates' for ON CONFLICT DO NOTHING.
    """
    total = len(records)
    inserted = 0
    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        for attempt in range(retries):
            try:
                body = json.dumps(batch).encode('utf-8')
                req = urllib.request.Request(
                    f'{url}/rest/v1/{table}',
                    data=body,
                    headers={
                        'apikey': key,
                        'Authorization': f'Bearer {key}',
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=ignore-duplicates,return=minimal',
                    },
                    method='POST',
                )
                # Add on_conflict for upsert behavior
                req.full_url = f'{url}/rest/v1/{table}?on_conflict=id'
                with urllib.request.urlopen(req, timeout=120) as resp:
                    pass  # return=minimal → empty body
                inserted += len(batch)
                break
            except urllib.error.HTTPError as e:
                body_resp = e.read().decode('utf-8', errors='replace')[:400]
                if e.code == 409:
                    # Conflict — already exists, skip
                    print(f'    Conflict on batch {i//batch_size + 1}, skipping')
                    inserted += len(batch)
                    break
                if e.code == 429:
                    wait = (attempt + 1) * 5
                    print(f'  ⚠️ Rate limited (429), waiting {wait}s...')
                    time.sleep(wait)
                    continue
                if attempt < retries - 1:
                    print(f'  ⚠️ Insert HTTP {e.code} (attempt {attempt+1}/{retries}): {body_resp}')
                    # Try smaller batch
                    if len(batch) > 50:
                        print(f'    Retrying with batch of 50...')
                        for j in range(0, len(batch), 50):
                            sub = batch[j:j + 50]
                            try:
                                b = json.dumps(sub).encode('utf-8')
                                r = urllib.request.Request(
                                    f'{url}/rest/v1/{table}?on_conflict=id',
                                    data=b,
                                    headers={
                                        'apikey': key,
                                        'Authorization': f'Bearer {key}',
                                        'Content-Type': 'application/json',
                                        'Prefer': 'resolution=ignore-duplicates,return=minimal',
                                    },
                                    method='POST',
                                )
                                with urllib.request.urlopen(r, timeout=120) as resp:
                                    pass
                                inserted += len(sub)
                            except Exception as e2:
                                print(f'    ❌ Sub-batch fail: {e2}')
                        break
                    time.sleep(3)
                    continue
                print(f'  ❌ Insert fail batch {i//batch_size + 1}: HTTP {e.code} — {body_resp}')
                break
            except Exception as e:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f'  ⚠️ Insert error (attempt {attempt+1}/{retries}): {e}')
                    time.sleep(wait)
                else:
                    print(f'  ❌ Insert final fail: {e}')
                    break
        if (i // batch_size + 1) % 20 == 0:
            print(f'    Inserted {inserted}/{total}...')
    return inserted


def count_supabase(url, key, table):
    """Get total row count for a table via REST API."""
    try:
        req = urllib.request.Request(
            f'{url}/rest/v1/{table}?select=id&limit=1',
            headers={
                'apikey': key,
                'Authorization': f'Bearer {key}',
                'Prefer': 'count=exact',
                'Range': '0-0',
            },
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            range_header = resp.headers.get('Content-Range', '*/0')
            total = range_header.split('/')[-1]
            return int(total) if total else 0
    except Exception as e:
        print(f'  ⚠️ Count failed for {table}: {e}')
        return 0


# ---------------------------------------------------------------------------
# Main migration logic
# ---------------------------------------------------------------------------

def migrate_table(source_url, source_key, dest_url, dest_key, table, batch=1000):
    """Migrate a single table from source to destination."""
    print(f'\n--- {table} ---')
    total = count_supabase(source_url, source_key, table)
    print(f'  Source has {total} rows')
    if total == 0:
        return 0

    total_inserted = 0
    offset = 0
    batch_num = 0
    while offset < total:
        batch_num += 1
        try:
            rows = fetch_supabase(source_url, source_key, table, offset, batch)
        except Exception as e:
            print(f'  ❌ Read fail at offset {offset}: {e}')
            break
        if not rows:
            break

        # Clean: ensure datetimes are valid ISO 8601 (PostgREST handles this fine,
        # but be defensive about null/empty values)
        cleaned = []
        for r in rows:
            # Remove any keys with None values that might cause issues
            cleaned.append({k: v for k, v in r.items() if v is not None or k == 'note' or k == 'poc' or k == 'reason' or k == 'mirrorUrl' or k == 'pendingUntil' or k == 'bio' or k == 'team' or k == 'country'})

        try:
            inserted = insert_supabase(dest_url, dest_key, table, cleaned, batch_size=500)
            total_inserted += inserted
        except Exception as e:
            print(f'  ❌ Batch {batch_num} insert failed: {e}')

        offset += len(rows)
        print(f'  Batch {batch_num}: {len(rows)} read, ~{inserted} inserted (total: {offset}/{total})')

        if len(rows) < batch:
            break
        time.sleep(0.2)  # be gentle

    print(f'  ✅ {table}: {total_inserted} inserted (of {total} source rows)')
    return total_inserted


def fix_total_hits(dest_url, dest_key):
    """Update Hacker.totalHits = COUNT(Defacement.attackerId) on destination."""
    print('\n--- Fixing Hacker.totalHits on destination ---')
    # Use PostgREST RPC to run raw SQL — but PostgREST doesn't support raw SQL.
    # Instead, fetch all hackers, count defacements per hacker, update one by one.
    # This is slow but works via REST API only.
    try:
        # Get all hackers
        hackers = fetch_supabase(dest_url, dest_key, 'Hacker', 0, 10000)
        if not hackers:
            print('  No hackers to fix')
            return
        print(f'  Found {len(hackers)} hackers, updating totalHits...')

        for h in hackers:
            hid = h.get('id')
            try:
                # Count defacements for this hacker
                req = urllib.request.Request(
                    f'{dest_url}/rest/v1/Defacement?attackerId=eq.{hid}&select=id&limit=1',
                    headers={
                        'apikey': dest_key,
                        'Authorization': f'Bearer {dest_key}',
                        'Prefer': 'count=exact',
                        'Range': '0-0',
                    },
                )
                with urllib.request.urlopen(req, timeout=60) as resp:
                    range_header = resp.headers.get('Content-Range', '*/0')
                    count = int(range_header.split('/')[-1]) if range_header.split('/')[-1] else 0

                # Update hacker
                body = json.dumps({'totalHits': count}).encode('utf-8')
                req = urllib.request.Request(
                    f'{dest_url}/rest/v1/Hacker?id=eq.{hid}',
                    data=body,
                    headers={
                        'apikey': dest_key,
                        'Authorization': f'Bearer {dest_key}',
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal',
                    },
                    method='PATCH',
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    pass
            except Exception as e:
                print(f'  ⚠️ Hacker {hid}: {e}')

        print(f'  ✅ Updated totalHits for {len(hackers)} hackers')
    except Exception as e:
        print(f'  ❌ Fix totalHits failed: {e}')


def main():
    parser = argparse.ArgumentParser(
        description='Emergency migration: Supabase A → Supabase B via REST API')
    parser.add_argument('--source-url', required=True,
                        help='https://xxx.supabase.co (project A — at 100% egress)')
    parser.add_argument('--source-key', required=True,
                        help='Project A anon key (or service_role)')
    parser.add_argument('--dest-url', required=True,
                        help='https://yyy.supabase.co (project B — fresh)')
    parser.add_argument('--dest-key', required=True,
                        help='Project B service_role key (REQUIRED for inserts to bypass RLS)')
    parser.add_argument('--batch', type=int, default=1000,
                        help='Rows per fetch batch (default: 1000)')
    parser.add_argument('--only', choices=['hackers', 'defacements', 'news', 'all'],
                        default='all', help='Only migrate one table (default: all)')
    parser.add_argument('--skip-fix-hits', action='store_true',
                        help='Skip the Hacker.totalHits recalc step')
    args = parser.parse_args()

    print('=' * 60)
    print('EMERGENCY MIGRATION: Supabase A → Supabase B')
    print('=' * 60)
    print(f'Source (A): {args.source_url}')
    print(f'Dest   (B): {args.dest_url}')
    print(f'Scope:    {args.only}')
    print(f'Batch:    {args.batch}')
    print()

    start_time = time.time()

    try:
        if args.only in ('all', 'hackers'):
            migrate_table(args.source_url, args.source_key,
                          args.dest_url, args.dest_key, 'Hacker', args.batch)
        if args.only in ('all', 'news'):
            migrate_table(args.source_url, args.source_key,
                          args.dest_url, args.dest_key, 'News', args.batch)
        if args.only in ('all', 'defacements'):
            migrate_table(args.source_url, args.source_key,
                          args.dest_url, args.dest_key, 'Defacement', args.batch)
        # Stat table — auto-recomputed by app, skip migration

        if not args.skip_fix_hits and args.only in ('all', 'hackers'):
            fix_total_hits(args.dest_url, args.dest_key)

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:400]
        print(f'\n❌ HTTP error: {e.code} — {body}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        raise

    elapsed = time.time() - start_time
    print()
    print('=' * 60)
    print(f'✅ Migration complete in {elapsed:.1f}s')
    print('=' * 60)
    print()
    print('NEXT STEPS:')
    print('1. Update Vercel env var DATABASE_URL → project B connection string')
    print('2. Trigger Vercel redeploy (push empty commit OR click Redeploy)')
    print('3. Verify:')
    print(f'   curl -s \'https://defacer.zone.id/api/stats\' | head -c 200')
    print(f'   curl -s \'https://defacer.zone.id/api/leaderboard?mode=defacers\' | head -c 200')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
