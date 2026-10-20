#!/usr/bin/env python3
"""
FAST migration: Supabase → Turso (direct, bypasses Vercel API).
Reads from Supabase REST API, writes directly to Turso HTTP API.
~10x faster than going through Vercel serverless.

Usage:
  python3 scripts/migrate-fast.py \
    --supabase-url https://xxx.supabase.co \
    --supabase-key eyJxxx \
    --turso-url libsql://defacerzoneid-xxx.tur.so \
    --turso-token xxx_auth_token_xxx

Get credentials:
  Supabase: dashboard → Settings → API → Project URL + anon key
  Turso:    dashboard → database → Settings → Connection URL + Auth Token
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


def fetch_supabase(url, key, table, offset, limit=1000, retries=3):
    """Fetch records from Supabase REST API with retry."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                f'{url}/rest/v1/{table}?select=*&offset={offset}&limit={limit}',
                headers={'apikey': key, 'Authorization': f'Bearer {key}'},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            if attempt < retries - 1:
                wait = (attempt + 1) * 5
                print(f'  ⚠️ Fetch failed (attempt {attempt+1}/{retries}), retrying in {wait}s: {e}')
                time.sleep(wait)
            else:
                raise


def turso_execute(turso_host, turso_token, sql):
    """Execute SQL on Turso via libSQL HTTP API."""
    # Convert libsql:// to https://
    http_url = turso_host.replace('libsql://', 'https://')
    if '?authToken' in http_url:
        http_url = http_url.split('?')[0]

    body = json.dumps({
        'requests': [
            {'type': 'execute', 'stmt': {'sql': sql}}
        ]
    }).encode('utf-8')

    req = urllib.request.Request(
        f'{http_url}/v2/pipeline',
        data=body,
        headers={
            'Authorization': f'Bearer {turso_token}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def escape_sql(val):
    """Escape a value for SQL."""
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return '1' if val else '0'
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"


def build_hacker_insert(hackers):
    """Build multi-row INSERT for Hacker table."""
    if not hackers:
        return None
    cols = '("id","handle","team","country","avatarColor","rank","totalHits","badges","bio","joinedAt")'
    rows = []
    for h in hackers:
        vals = [
            escape_sql(h.get('id')),
            escape_sql(h.get('handle')),
            escape_sql(h.get('team')),
            escape_sql(h.get('country')),
            escape_sql(h.get('avatarColor')),
            escape_sql(h.get('rank', 0)),
            escape_sql(h.get('totalHits', 0)),
            escape_sql(h.get('badges', '[]')),
            escape_sql(h.get('bio')),
            escape_sql(h.get('joinedAt')),
        ]
        rows.append(f'({",".join(vals)})')
    return f'INSERT INTO "Hacker" {cols} VALUES {",".join(rows)} ON CONFLICT ("id") DO NOTHING;'


def build_defacement_insert(records):
    """Build multi-row INSERT for Defacement table (SQLite format)."""
    if not records:
        return None
    cols = '("id","targetUrl","targetName","country","category","attackerId","mirrorUrl","note","poc","reason","isHomepage","isMass","isRedeface","isSpecial","pendingUntil","status","severity","createdAt")'
    rows = []
    for d in records:
        vals = [
            escape_sql(d.get('id')),
            escape_sql(d.get('targetUrl')),
            escape_sql(d.get('targetName')),
            escape_sql(d.get('country')),
            escape_sql(d.get('category')),
            escape_sql(d.get('attackerId')),
            escape_sql(d.get('mirrorUrl')),
            escape_sql(d.get('note')),
            escape_sql(d.get('poc')),
            escape_sql(d.get('reason')),
            escape_sql(d.get('isHomepage')),
            escape_sql(d.get('isMass')),
            escape_sql(d.get('isRedeface')),
            escape_sql(d.get('isSpecial')),
            escape_sql(d.get('pendingUntil')),
            escape_sql(d.get('status')),
            escape_sql(d.get('severity')),
            escape_sql(d.get('createdAt')),
        ]
        rows.append(f'({",".join(vals)})')
    return f'INSERT INTO "Defacement" {cols} VALUES {",".join(rows)} ON CONFLICT ("id") DO NOTHING;'


def build_news_insert(news_items):
    if not news_items:
        return None
    cols = '("id","title","body","author","pinned","createdAt","updatedAt")'
    rows = []
    for n in news_items:
        vals = [
            escape_sql(n.get('id')),
            escape_sql(n.get('title')),
            escape_sql(n.get('body')),
            escape_sql(n.get('author')),
            escape_sql(n.get('pinned')),
            escape_sql(n.get('createdAt')),
            escape_sql(n.get('updatedAt')),
        ]
        rows.append(f'({",".join(vals)})')
    return f'INSERT INTO "News" {cols} VALUES {",".join(rows)} ON CONFLICT ("id") DO NOTHING;'


def build_stat_insert(stats):
    if not stats:
        return None
    cols = '("id","key","value")'
    rows = []
    for s in stats:
        vals = [escape_sql(s.get('id')), escape_sql(s.get('key')), escape_sql(s.get('value', 0))]
        rows.append(f'({",".join(vals)})')
    return f'INSERT INTO "Stat" {cols} VALUES {",".join(rows)} ON CONFLICT ("id") DO NOTHING;'


def main():
    parser = argparse.ArgumentParser(description='FAST migration: Supabase → Turso (direct HTTP)')
    parser.add_argument('--supabase-url', required=True)
    parser.add_argument('--supabase-key', required=True)
    parser.add_argument('--turso-url', required=True, help='libsql://xxx.tur.so')
    parser.add_argument('--turso-token', required=True, help='Turso auth token')
    parser.add_argument('--batch', type=int, default=500, help='Rows per INSERT (default: 500)')
    parser.add_argument('--start-offset', type=int, default=0, help='Resume from offset (skip already-migrated records)')
    args = parser.parse_args()

    print('=' * 60)
    print('FAST Migration: Supabase → Turso (direct HTTP)')
    print('=' * 60)
    print(f'Supabase: {args.supabase_url}')
    print(f'Turso:    {args.turso_url}')
    print(f'Batch:   {args.batch} rows per INSERT')
    if args.start_offset > 0:
        print(f'Resume:  starting from offset {args.start_offset}')
    print()

    total_migrated = 0
    total_errors = 0

    # === 1. Hackers ===
    print('--- Hackers ---')
    hackers = []
    offset = 0
    while True:
        batch = fetch_supabase(args.supabase_url, args.supabase_key, 'Hacker', offset)
        if not batch:
            break
        hackers.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000

    print(f'  Found {len(hackers)} hackers')
    if hackers:
        sql = build_hacker_insert(hackers)
        try:
            turso_execute(args.turso_url, args.turso_token, sql)
            print(f'  ✅ Inserted {len(hackers)} hackers')
            total_migrated += len(hackers)
        except Exception as e:
            print(f'  ❌ Error: {e}')
            total_errors += len(hackers)
    print()

    # === 2. Defacements ===
    print('--- Defacements ---')
    offset = args.start_offset
    batch_num = args.start_offset // args.batch
    while True:
        records = fetch_supabase(args.supabase_url, args.supabase_key, 'Defacement', offset, args.batch)
        if not records:
            break
        batch_num += 1
        total_fetched = offset + len(records)

        # Build multi-row INSERT
        sql = build_defacement_insert(records)
        try:
            turso_execute(args.turso_url, args.turso_token, sql)
            print(f'  Batch {batch_num}: {len(records)} records (total: {total_fetched}) ✅')
            total_migrated += len(records)
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:200]
            print(f'  Batch {batch_num}: HTTP {e.code} — {body}')
            if len(records) > 50:
                print(f'  Retrying with smaller batch (50)...')
                for i in range(0, len(records), 50):
                    sub = records[i:i+50]
                    sub_sql = build_defacement_insert(sub)
                    try:
                        turso_execute(args.turso_url, args.turso_token, sub_sql)
                        print(f'    Sub-batch: {len(sub)} ✅')
                        total_migrated += len(sub)
                    except Exception as e2:
                        print(f'    Sub-batch: FAIL — {e2}')
                        total_errors += len(sub)
            else:
                total_errors += len(records)
        except Exception as e:
            print(f'  Batch {batch_num}: ERROR — {e}')
            total_errors += len(records)

        if len(records) < args.batch:
            break
        offset += args.batch
        time.sleep(0.5)

        # Print resume hint every 100 batches
        if batch_num % 100 == 0:
            print(f'  💡 To resume if crash: --start-offset {offset}')  # Small delay to avoid rate limiting

    print(f'  Total defacements: {total_migrated} migrated, {total_errors} errors')
    print()

    # === 3. News ===
    print('--- News ---')
    news = fetch_supabase(args.supabase_url, args.supabase_key, 'News', 0)
    print(f'  Found {len(news)} news items')
    if news:
        sql = build_news_insert(news)
        try:
            turso_execute(args.turso_url, args.turso_token, sql)
            print(f'  ✅ Inserted {len(news)} news')
            total_migrated += len(news)
        except Exception as e:
            print(f'  ❌ Error: {e}')
            total_errors += len(news)
    print()

    # === 4. Stats ===
    print('--- Stats ---')
    stats = fetch_supabase(args.supabase_url, args.supabase_key, 'Stat', 0)
    print(f'  Found {len(stats)} stats')
    if stats:
        sql = build_stat_insert(stats)
        try:
            turso_execute(args.turso_url, args.turso_token, sql)
            print(f'  ✅ Inserted {len(stats)} stats')
            total_migrated += len(stats)
        except Exception as e:
            print(f'  ❌ Error: {e}')
            total_errors += len(stats)
    print()

    # Summary
    print('=' * 60)
    print('MIGRATION SUMMARY')
    print('=' * 60)
    print(f'Total migrated: {total_migrated}')
    print(f'Total errors:   {total_errors}')
    print()
    if total_errors > 0:
        print('Some records failed. Re-run the script to retry.')
        print('(ON CONFLICT DO NOTHING — safe to re-run, no duplicates)')
        sys.exit(1)
    else:
        print('✅ All records migrated successfully!')
        print()
        print('Next: Update totalHits in Turso SQL Editor:')
        print('  UPDATE "Hacker" SET "totalHits" = (SELECT COUNT(*) FROM "Defacement" WHERE "attackerId" = "Hacker"."id");')
        sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
