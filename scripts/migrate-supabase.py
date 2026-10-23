#!/usr/bin/env python3
"""
EMERGENCY MIGRATION: Supabase project A → project B via REST API.

Use this when project A is at 100% egress (but not yet paused) and you
need to migrate data to a fresh project B before A gets paused.

Both projects must already exist. Schema in project B must already
exist (run SQL in Supabase SQL Editor to create tables — see README).

FIX vs v1: this version uses Prefer: return=representation so we get
the actual count of inserted rows (not silently-skipped conflicts).
v1 reported "360K inserted" when actually only 235K made it in.

Usage:
  python3 scripts/migrate-supabase.py \\
    --source-url https://aaa.supabase.co \\
    --source-key sb_publishable_xxx \\
    --dest-url https://bbb.supabase.co \\
    --dest-key sb_publishable_yyy

  # Just verify counts (no migration):
  python3 scripts/migrate-supabase.py \\
    --source-url ... --source-key ... \\
    --dest-url ... --dest-key ... \\
    --verify-only

Resume capability: uses ON CONFLICT DO NOTHING, so safe to re-run if
the script crashes mid-way. Already-existing records are silently
skipped (correctly counted as 0 inserts in this version).
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


def fetch_supabase(url, key, table, offset, limit=1000, retries=3):
    """Fetch a batch of rows from Supabase REST API."""
    endpoint = f'{url}/rest/v1/{table}?select=*&offset={offset}&limit={limit}'
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                endpoint,
                headers={'apikey': key, 'Authorization': f'Bearer {key}'},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = (attempt + 1) * 5
                print(f'  rate limited (429), waiting {wait}s...')
                time.sleep(wait)
                continue
            body = e.read().decode('utf-8', errors='replace')[:300]
            if attempt < retries - 1:
                print(f'  HTTP {e.code} (attempt {attempt+1}/{retries}): {body}')
                time.sleep(3)
                continue
            raise
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 5
                print(f'  fetch fail (attempt {attempt+1}/{retries}): {e}')
                time.sleep(wait)
            else:
                raise


def insert_batch(url, key, table, records):
    """Insert a batch of records. Returns ACTUAL count of inserted rows
    (uses return=representation to count truly inserted rows, NOT silent
    conflict-skips). Raises HTTPError on failure.
    """
    body = json.dumps(records).encode('utf-8')
    req = urllib.request.Request(
        f'{url}/rest/v1/{table}?on_conflict=id',
        data=body,
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            # return=representation → response body contains ONLY the
            # rows that were actually inserted (NOT the silently skipped
            # conflicts). resolution=ignore-duplicates → ON CONFLICT DO
            # NOTHING for id conflicts.
            'Prefer': 'resolution=ignore-duplicates,return=representation',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        response_body = resp.read().decode('utf-8')
        if not response_body:
            return 0
        try:
            inserted_rows = json.loads(response_body)
            if isinstance(inserted_rows, list):
                return len(inserted_rows)
            return 0
        except json.JSONDecodeError:
            return 0


def insert_supabase(url, key, table, records, batch_size=500, retries=3):
    """Insert records via REST API.
    Returns (actual_inserted, failed) tuple.
    """
    total = len(records)
    actual_inserted = 0
    failed = 0
    for i in range(0, total, batch_size):
        batch = records[i:i + batch_size]
        batch_num = i // batch_size + 1
        success = False

        for attempt in range(retries):
            try:
                n = insert_batch(url, key, table, batch)
                actual_inserted += n
                success = True
                if n < len(batch):
                    skipped = len(batch) - n
                    print(f'    batch {batch_num}: {n} new + {skipped} skipped (conflict)')
                break
            except urllib.error.HTTPError as e:
                body_resp = e.read().decode('utf-8', errors='replace')[:300]
                if e.code == 429:
                    wait = (attempt + 1) * 5
                    print(f'  rate limited (429), waiting {wait}s...')
                    time.sleep(wait)
                    continue
                if e.code == 409:
                    print(f'    batch {batch_num}: all conflicts, skip')
                    success = True
                    break
                if attempt < retries - 1:
                    print(f'  batch {batch_num} fail attempt {attempt+1}: HTTP {e.code} - {body_resp[:80]}')
                    # Try smaller sub-batches
                    if len(batch) > 50:
                        print(f'    retrying as 50-row sub-batches...')
                        for j in range(0, len(batch), 50):
                            sub = batch[j:j + 50]
                            try:
                                sn = insert_batch(url, key, table, sub)
                                actual_inserted += sn
                            except urllib.error.HTTPError as e2:
                                eb = e2.read().decode('utf-8', errors='replace')[:200]
                                print(f'    sub-batch {j//50 + 1}: HTTP {e2.code} - {eb}')
                                failed += len(sub)
                            except Exception as e3:
                                print(f'    sub-batch {j//50 + 1}: {e3}')
                                failed += len(sub)
                        success = True
                        break
                    time.sleep(3)
                    continue
                print(f'  batch {batch_num} FINAL fail: HTTP {e.code} - {body_resp[:80]}')
                failed += len(batch)
                break
            except Exception as e:
                if attempt < retries - 1:
                    wait = (attempt + 1) * 5
                    print(f'  insert error attempt {attempt+1}/{retries}: {e}')
                    time.sleep(wait)
                else:
                    print(f'  batch {batch_num} FINAL fail: {e}')
                    failed += len(batch)
                    break

        if not success:
            failed += len(batch)

        if batch_num % 20 == 0:
            print(f'    progress: {actual_inserted} inserted, {failed} failed')

    return actual_inserted, failed


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
        print(f'  count failed for {table}: {e}')
        return 0


def migrate_table(source_url, source_key, dest_url, dest_key, table, batch=1000):
    """Migrate a single table. Returns (actual_inserted, failed)."""
    print(f'\n--- {table} ---')
    source_count = count_supabase(source_url, source_key, table)
    print(f'  source has {source_count} rows')
    if source_count == 0:
        return 0, 0

    actual_inserted = 0
    failed = 0
    offset = 0
    batch_num = 0
    while offset < source_count:
        batch_num += 1
        try:
            rows = fetch_supabase(source_url, source_key, table, offset, batch)
        except Exception as e:
            print(f'  read fail at offset {offset}: {e}')
            break
        if not rows:
            break

        # Clean: keep None values for nullable fields, remove for non-nullable
        # (avoids NOT NULL constraint violations on missing required fields)
        nullable_fields = {'note', 'poc', 'reason', 'mirrorUrl', 'pendingUntil',
                           'bio', 'team', 'country'}
        cleaned = []
        for r in rows:
            cleaned.append({
                k: v for k, v in r.items()
                if v is not None or k in nullable_fields
            })

        try:
            n, f = insert_supabase(dest_url, dest_key, table, cleaned, batch_size=500)
            actual_inserted += n
            failed += f
        except Exception as e:
            print(f'  batch {batch_num} unexpected error: {e}')
            failed += len(cleaned)
            n, f = 0, len(cleaned)

        offset += len(rows)
        print(f'  batch {batch_num}: {len(rows)} read, {n} new, {f} failed (total: {offset}/{source_count})')

        if len(rows) < batch:
            break
        time.sleep(0.2)

    print(f'  {table}: {actual_inserted} inserted, {failed} failed (of {source_count} source)')
    return actual_inserted, failed


def fix_total_hits(dest_url, dest_key):
    """Update Hacker.totalHits = COUNT(Defacement.attackerId) per hacker."""
    print('\n--- Fixing Hacker.totalHits on destination ---')
    try:
        hackers = fetch_supabase(dest_url, dest_key, 'Hacker', 0, 10000)
        if not hackers:
            print('  no hackers to fix')
            return
        print(f'  found {len(hackers)} hackers, updating totalHits...')

        for h in hackers:
            hid = h.get('id')
            try:
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
                print(f'  hacker {hid}: {e}')

        print(f'  updated totalHits for {len(hackers)} hackers')
    except Exception as e:
        print(f'  fix totalHits failed: {e}')


def verify_counts(source_url, source_key, dest_url, dest_key):
    """Final verification: compare counts in source vs destination."""
    print('\n=== VERIFICATION ===')
    total_diff = 0
    for table in ('Hacker', 'Defacement', 'News'):
        s = count_supabase(source_url, source_key, table)
        d = count_supabase(dest_url, dest_key, table)
        diff = s - d
        total_diff += diff
        status = 'OK' if diff == 0 else 'MISS'
        print(f'  [{status}] {table}: source={s} dest={d} diff={diff}')
    print()
    if total_diff == 0:
        print('all counts match!')
    else:
        print(f'{total_diff} records missing in destination.')
        print('re-run this script to insert missing rows (idempotent).')
    return total_diff


def main():
    parser = argparse.ArgumentParser(
        description='Emergency migration: Supabase A -> Supabase B via REST API')
    parser.add_argument('--source-url', required=True,
                        help='https://xxx.supabase.co (project A - at quota limit)')
    parser.add_argument('--source-key', required=True,
                        help='Project A anon key (or service_role)')
    parser.add_argument('--dest-url', required=True,
                        help='https://yyy.supabase.co (project B - fresh)')
    parser.add_argument('--dest-key', required=True,
                        help='Project B service_role key (REQUIRED for inserts to bypass RLS)')
    parser.add_argument('--batch', type=int, default=1000,
                        help='Rows per fetch batch (default: 1000)')
    parser.add_argument('--only', choices=['hackers', 'defacements', 'news', 'all'],
                        default='all', help='Only migrate one table (default: all)')
    parser.add_argument('--skip-fix-hits', action='store_true',
                        help='Skip the Hacker.totalHits recalc step')
    parser.add_argument('--verify-only', action='store_true',
                        help='Skip migration, just compare source vs dest counts')
    args = parser.parse_args()

    print('=' * 60)
    print('EMERGENCY MIGRATION: Supabase A -> Supabase B')
    print('=' * 60)
    print(f'Source (A): {args.source_url}')
    print(f'Dest   (B): {args.dest_url}')
    print(f'Scope:    {args.only}')
    print(f'Batch:    {args.batch}')
    print()

    if args.verify_only:
        verify_counts(args.source_url, args.source_key,
                      args.dest_url, args.dest_key)
        return

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

        if not args.skip_fix_hits and args.only in ('all', 'hackers'):
            fix_total_hits(args.dest_url, args.dest_key)

        # Final verification
        diff = verify_counts(args.source_url, args.source_key,
                             args.dest_url, args.dest_key)

    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:400]
        print(f'\nHTTP error: {e.code} - {body}')
        sys.exit(1)
    except Exception as e:
        print(f'\nError: {e}')
        raise

    elapsed = time.time() - start_time
    print()
    print('=' * 60)
    print(f'migration done in {elapsed:.1f}s')
    print('=' * 60)
    print()
    print('NEXT STEPS:')
    print('1. If verify shows diff > 0, re-run this script (idempotent)')
    print('2. Update Vercel env var DATABASE_URL -> project B connection string')
    print('3. Trigger Vercel redeploy')
    print('4. Verify: curl https://defacer.zone.id/api/stats')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
