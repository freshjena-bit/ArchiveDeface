#!/usr/bin/env python3
"""
Backfill the Stat table cache for /api/stats.

Without this, the first /api/stats call after deploy would recompute
everything from scratch (~7M row reads on the 319K-row Defacement table),
which on a 99%-used Turso quota could push the account over the limit
and get blocked.

This script does ONE full table scan (~319K row reads) and pre-populates
all the cached stats:
  - totalDefacements, totalAttackers, todayAttacks, thisMonth
  - daily:YYYY-MM-DD for the last 14 days
  - cat:<category> for each category
  - country:<code> for each country
  - defacements:totalVerified (default-archived count)

After running this, /api/stats uses ~30 row reads per call instead of ~7M.

Usage:
  python3 scripts/backfill-stats.py \\
    --turso-url libsql://defacerzoneid-xxx.turso.so \\
    --turso-token eyJxxx

  # or embed token in URL:
  python3 scripts/backfill-stats.py \\
    --turso-url "libsql://xxx.turso.so?authToken=eyJxxx"
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# Turso HTTP API helpers
# ---------------------------------------------------------------------------

def turso_pipeline(turso_url, turso_token, requests_payload, timeout=300):
    http_url = turso_url.replace('libsql://', 'https://')
    if '?' in http_url:
        http_url = http_url.split('?')[0]
    body = json.dumps({'requests': requests_payload}).encode('utf-8')
    req = urllib.request.Request(
        f'{http_url}/v2/pipeline',
        data=body,
        headers={
            'Authorization': f'Bearer {turso_token}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def turso_execute(turso_url, turso_token, sql, timeout=300):
    return turso_pipeline(turso_url, turso_token,
                          [{'type': 'execute', 'stmt': {'sql': sql}}],
                          timeout=timeout)


def turso_query(turso_url, turso_token, sql, timeout=120):
    resp = turso_execute(turso_url, turso_token, sql, timeout=timeout)
    try:
        result = resp['results'][0]['response']['result']
    except (KeyError, IndexError):
        print('  Unexpected:', json.dumps(resp)[:400])
        return []
    cols = [c['name'] for c in result.get('cols', [])]
    out = []
    for r in result.get('rows', []):
        vals = [cell.get('value') if isinstance(cell, dict) else cell for cell in r]
        out.append(dict(zip(cols, vals)))
    return out


def sql_escape_str(s):
    if s is None:
        return 'NULL'
    s = str(s).replace("'", "''")
    return f"'{s}'"


def build_upsert(key, value):
    """Build a single-row upsert for Stat table."""
    return (
        f'INSERT INTO "Stat" ("id","key","value") '
        f'VALUES (lower(hex(randomblob(8))),{sql_escape_str(key)},{int(value)}) '
        f'ON CONFLICT ("key") DO UPDATE SET "value"=excluded."value";'
    )


def build_batch_upsert(items):
    """Build a multi-row upsert for many Stat rows at once."""
    if not items:
        return None
    rows = []
    for key, value in items:
        rows.append(
            f'(lower(hex(randomblob(8))),{sql_escape_str(key)},{int(value)})'
        )
    return (
        f'INSERT INTO "Stat" ("id","key","value") VALUES {",".join(rows)} '
        f'ON CONFLICT ("key") DO UPDATE SET "value"=excluded."value";'
    )


def execute_batch(turso_url, turso_token, items, batch_size=50):
    """Execute upserts in batches (avoid hitting SQL length limits)."""
    total = len(items)
    done = 0
    for i in range(0, total, batch_size):
        chunk = items[i:i + batch_size]
        sql = build_batch_upsert(chunk)
        if not sql:
            continue
        try:
            turso_execute(turso_url, turso_token, sql, timeout=120)
            done += len(chunk)
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:300]
            print(f'  ⚠️ batch {i//batch_size + 1}: HTTP {e.code} — {body}')
            # Try one at a time as fallback
            for k, v in chunk:
                try:
                    turso_execute(turso_url, turso_token, build_upsert(k, v))
                    done += 1
                except Exception as e2:
                    print(f'    ❌ {k}: {e2}')
        except Exception as e:
            print(f'  ⚠️ batch {i//batch_size + 1}: {e}')
        time.sleep(0.05)
    return done


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Backfill Stat-table cache for /api/stats')
    parser.add_argument('--turso-url', required=True)
    parser.add_argument('--turso-token', default=None)
    args = parser.parse_args()

    turso_url = args.turso_url
    turso_token = args.turso_token
    if not turso_token and '?authToken=' in turso_url:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(turso_url.replace('libsql://', 'https://'))
        qs = parse_qs(parsed.query)
        turso_token = qs.get('authToken', [None])[0]
        turso_url = f'libsql://{parsed.netloc}'
    if not turso_token:
        print('Error: no token')
        sys.exit(2)

    print('=' * 60)
    print('Backfill Stat-table cache')
    print('=' * 60)
    print(f'Turso URL: {turso_url}')
    print(f'Token:     {turso_token[:12]}...{turso_token[-6:]}')
    print()

    now = datetime.now(timezone.utc)
    now_sec = int(now.timestamp())
    items = []  # list of (key, value) pairs to upsert

    # ─── 1. Total Defacements + Default-archived count ─────────────────
    print('--- Total counts ---')
    rows = turso_query(turso_url, turso_token,
        'SELECT COUNT(*) AS n FROM "Defacement";')
    total_def = int(rows[0]['n']) if rows else 0
    items.append(('totalDefacements', total_def))
    print(f'  totalDefacements = {total_def}')

    rows = turso_query(turso_url, turso_token,
        'SELECT COUNT(*) AS n FROM "Defacement" WHERE "status" IN (\'archived\',\'restored\',\'live\');')
    total_verified = int(rows[0]['n']) if rows else 0
    items.append(('defacements:totalVerified', total_verified))
    print(f'  defacements:totalVerified = {total_verified}')

    # ─── 2. Total Attackers ───────────────────────────────────────────
    rows = turso_query(turso_url, turso_token,
        'SELECT COUNT(*) AS n FROM "Hacker";')
    total_attackers = int(rows[0]['n']) if rows else 0
    items.append(('totalAttackers', total_attackers))
    print(f'  totalAttackers = {total_attackers}')

    # ─── 3. Today + This Month ────────────────────────────────────────
    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    rows = turso_query(turso_url, turso_token,
        f"SELECT COUNT(*) AS n FROM \"Defacement\" WHERE \"createdAt\" >= '{start_of_today.strftime('%Y-%m-%dT%H:%M:%S.000Z')}';")
    today_attacks = int(rows[0]['n']) if rows else 0
    items.append(('todayAttacks', today_attacks))
    print(f'  todayAttacks = {today_attacks}')

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rows = turso_query(turso_url, turso_token,
        f"SELECT COUNT(*) AS n FROM \"Defacement\" WHERE \"createdAt\" >= '{month_start.strftime('%Y-%m-%dT%H:%M:%S.000Z')}';")
    this_month = int(rows[0]['n']) if rows else 0
    items.append(('thisMonth', this_month))
    print(f'  thisMonth = {this_month}')

    # ─── 4. Daily counts for last 14 days ─────────────────────────────
    print('--- 14-day timeseries ---')
    for i in range(13, -1, -1):
        day_start = start_of_today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        date_key = day_start.strftime('%Y-%m-%d')
        rows = turso_query(turso_url, turso_token,
            f"SELECT COUNT(*) AS n FROM \"Defacement\" WHERE \"createdAt\" >= '{day_start.strftime('%Y-%m-%dT%H:%M:%S.000Z')}' AND \"createdAt\" < '{day_end.strftime('%Y-%m-%dT%H:%M:%S.000Z')}';")
        count = int(rows[0]['n']) if rows else 0
        items.append((f'daily:{date_key}', count))
        print(f'  daily:{date_key} = {count}')

    # ─── 5. Category breakdown ───────────────────────────────────────
    print('--- Category breakdown ---')
    rows = turso_query(turso_url, turso_token,
        'SELECT "category", COUNT(*) AS n FROM "Defacement" GROUP BY "category";')
    cat_items = [(f'cat:{r["category"]}', int(r['n'])) for r in rows]
    for k, v in cat_items:
        print(f'  {k} = {v}')
    items.extend(cat_items)

    # ─── 6. Country breakdown ─────────────────────────────────────────
    print('--- Country breakdown ---')
    rows = turso_query(turso_url, turso_token,
        'SELECT "country", COUNT(*) AS n FROM "Defacement" GROUP BY "country";')
    country_items = [(f'country:{r["country"]}', int(r['n'])) for r in rows]
    print(f'  {len(country_items)} countries')
    for k, v in country_items[:8]:
        print(f'  {k} = {v}')
    if len(country_items) > 8:
        print(f'  ... and {len(country_items) - 8} more')
    items.extend(country_items)

    # ─── 7. Timestamp markers for all keys ───────────────────────────
    # Each cached value needs an `at:<key>` companion row so getCachedInt()
    # can check freshness. Set them all to "now" so the cache is fresh.
    at_items = []
    for key, _ in items:
        at_items.append((f'{key}:at', now_sec))
    items.extend(at_items)
    # Also add breakdown-level markers
    items.append(('cat:at', now_sec))
    items.append(('country:at', now_sec))

    # ─── 8. Execute all upserts in batches ───────────────────────────
    print()
    print(f'--- Writing {len(items)} Stat rows ---')
    done = execute_batch(turso_url, turso_token, items, batch_size=50)
    print(f'  ✅ Wrote {done}/{len(items)} rows')

    # ─── 9. Optional: verify ──────────────────────────────────────────
    print()
    print('--- Verification ---')
    rows = turso_query(turso_url, turso_token,
        'SELECT COUNT(*) AS n FROM "Stat";')
    stat_count = int(rows[0]['n']) if rows else 0
    print(f'  Stat table now has {stat_count} rows')

    print()
    print('=' * 60)
    print('✅ Backfill complete.')
    print('=' * 60)
    print()
    print('Next: trigger a Vercel redeploy (push a commit or click Redeploy)')
    print('Then verify the site still works:')
    print("  curl 'https://defacer.zone.id/api/stats' | head -c 200")
    print("  curl 'https://defacer.zone.id/api/leaderboard?mode=defacers' | head -c 200")


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nInterrupted.')
        sys.exit(130)
