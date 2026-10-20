#!/usr/bin/env python3
"""
FAST datetime fix for Turso DB using pure SQL UPDATEs.

The original fix-dates.py does one HTTP UPDATE per row, which times out on
the ~300K-row Defacement table. This script runs ONE UPDATE per column,
chunked by rowid (so ~6 HTTP calls total instead of 300K+).

It reformats every DateTime column to strict ISO 8601
(YYYY-MM-DDTHH:MM:SS.sssZ — 3-digit ms + Z) using SQLite's strftime().

Note: milliseconds precision is lost (all become .000), but the values stay
sortable to the second — fine for a defacement archive. The Prisma LibSQL
adapter can parse the resulting format without "Conversion failed" errors.

Idempotent: rows already in correct format are skipped via the WHERE clause,
so it's safe to re-run or to resume after a partial failure.

Usage:
  python3 scripts/fix-dates-sql.py \\
    --turso-url libsql://defacerzoneid-xxx.turso.io \\
    --turso-token eyJxxx

  # or embed token in URL:
  python3 scripts/fix-dates-sql.py \\
    --turso-url "libsql://xxx.turso.io?authToken=eyJxxx"

  # only fix Defacements (if Hacker/News already done):
  python3 scripts/fix-dates-sql.py --turso-url ... --only defacements
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


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
    """Execute a single SQL statement. Returns parsed response."""
    return turso_pipeline(turso_url, turso_token,
                          [{'type': 'execute', 'stmt': {'sql': sql}}],
                          timeout=timeout)


def turso_query(turso_url, turso_token, sql, timeout=120):
    """Run a SELECT and return list of {col: value} dicts."""
    resp = turso_execute(turso_url, turso_token, sql, timeout=timeout)
    try:
        result = resp['results'][0]['response']['result']
    except (KeyError, IndexError):
        print('  Unexpected response:', json.dumps(resp)[:400])
        return []
    cols = [c['name'] for c in result.get('cols', [])]
    out = []
    for r in result.get('rows', []):
        vals = [cell.get('value') if isinstance(cell, dict) else cell for cell in r]
        out.append(dict(zip(cols, vals)))
    return out


def turso_execute_with_changes(turso_url, turso_token, sql, timeout=300):
    """Execute UPDATE and return number of rows changed."""
    resp = turso_execute(turso_url, turso_token, sql, timeout=timeout)
    try:
        result = resp['results'][0]['response']['result']
        # libSQL returns rows-affected in different places depending on version
        if 'changes' in result:
            return result['changes'].get('changes', 0) or 0
        # fallback: look in first row
        for r in result.get('rows', []):
            for cell in r:
                v = cell.get('value') if isinstance(cell, dict) else cell
                if isinstance(v, int):
                    return v
    except (KeyError, IndexError):
        pass
    return -1  # unknown


# ---------------------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------------------

# Pattern that matches already-correct format: YYYY-MM-DDTHH:MM:SS.sssZ (24 chars)
CORRECT_PATTERN = "*.[0-9][0-9][0-9]Z"
CORRECT_LEN = 24


def count_remaining(table, col):
    """Count rows in `table`.`col` that need reformatting."""
    return (
        f'SELECT COUNT(*) AS n FROM "{table}" '
        f'WHERE "{col}" IS NOT NULL '
        f'AND NOT (length("{col}") = {CORRECT_LEN} '
        f'AND "{col}" GLOB \'{CORRECT_PATTERN}\');'
    )


def update_sql(table, col, extra_where=""):
    """Build a pure-SQL UPDATE that reformats `col` to strict ISO 8601."""
    where = (
        f'WHERE "{col}" IS NOT NULL '
        f'AND NOT (length("{col}") = {CORRECT_LEN} '
        f'AND "{col}" GLOB \'{CORRECT_PATTERN}\')'
    )
    if extra_where:
        where = f'{where} AND {extra_where}'
    return (
        f'UPDATE "{table}" SET "{col}" = '
        f'strftime(\'%Y-%m-%dT%H:%M:%S\', "{col}") || \'.000Z\' '
        f'{where};'
    )


# ---------------------------------------------------------------------------
# Fixers
# ---------------------------------------------------------------------------

def fix_simple_table(turso_url, turso_token, table, cols):
    """Fix a small table (Hacker/News) with one UPDATE per column."""
    for col in cols:
        cnt_rows = turso_query(turso_url, turso_token, count_remaining(table, col))
        n = int(cnt_rows[0]['n']) if cnt_rows else 0
        if n == 0:
            print(f'  {table}.{col}: 0 rows need fix — skip')
            continue
        print(f'  {table}.{col}: {n} rows need fix — running UPDATE...')
        try:
            changed = turso_execute_with_changes(
                turso_url, turso_token, update_sql(table, col), timeout=120)
            print(f'  ✅ {table}.{col}: done (changed={changed})')
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:300]
            print(f'  ❌ {table}.{col}: HTTP {e.code} — {body}')
        except Exception as e:
            print(f'  ❌ {table}.{col}: {e}')


def fix_defacements_chunked(turso_url, turso_token, chunk=50000):
    """Fix Defacement.createdAt + pendingUntil in rowid chunks."""
    print('--- Defacements (createdAt, pendingUntil) — chunked by rowid ---')
    mm = turso_query(turso_url, turso_token,
        'SELECT MIN(rowid) AS mn, MAX(rowid) AS mx, COUNT(*) AS cnt FROM "Defacement";')
    if not mm:
        print('  Cannot get rowid range — table may not exist')
        return
    mn = mm[0].get('mn') or 0
    mx = mm[0].get('mx') or 0
    cnt = mm[0].get('cnt') or 0
    print(f'  Total: {cnt} rows | rowid range: {mn}..{mx}')

    # Count how many need fixing
    for col in ('createdAt', 'pendingUntil'):
        cnt_rows = turso_query(turso_url, turso_token, count_remaining('Defacement', col))
        n = int(cnt_rows[0]['n']) if cnt_rows else 0
        print(f'  {col}: {n} rows need fix')

    start = mn
    chunk_num = 0
    while start <= mx:
        end = start + chunk - 1
        chunk_num += 1
        rowid_range = f'rowid BETWEEN {start} AND {end}'

        for col in ('createdAt', 'pendingUntil'):
            sql = update_sql('Defacement', col, extra_where=rowid_range)
            try:
                turso_execute_with_changes(turso_url, turso_token, sql, timeout=180)
            except urllib.error.HTTPError as e:
                body = e.read().decode('utf-8', errors='replace')[:200]
                print(f'  ⚠️ chunk {chunk_num} {col}: HTTP {e.code} — {body}')
            except Exception as e:
                print(f'  ⚠️ chunk {chunk_num} {col}: {e}')

        print(f'  chunk {chunk_num}: rowid {start}-{end} done')
        start = end + 1
        time.sleep(0.3)  # be gentle

    # Final verification count
    for col in ('createdAt', 'pendingUntil'):
        cnt_rows = turso_query(turso_url, turso_token, count_remaining('Defacement', col))
        n = int(cnt_rows[0]['n']) if cnt_rows else 0
        status = '✅' if n == 0 else '⚠️'
        print(f'  {status} {col}: {n} rows still need fix after run')

    print('  Defacements done')


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Fast datetime fix for Turso DB (pure SQL UPDATEs, chunked)')
    parser.add_argument('--turso-url', required=True,
                        help='libsql://xxx.turso.so (with or without ?authToken=)')
    parser.add_argument('--turso-token', default=None,
                        help='Turso auth token (required if URL has no authToken)')
    parser.add_argument('--only', choices=['hackers', 'news', 'defacements', 'all'],
                        default='all', help='Only fix one table (default: all)')
    parser.add_argument('--chunk', type=int, default=50000,
                        help='Rowid chunk size for Defacement (default: 50000)')
    args = parser.parse_args()

    turso_url = args.turso_url
    turso_token = args.turso_token
    if not turso_token:
        if '?authToken=' in turso_url or '&authToken=' in turso_url:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(turso_url.replace('libsql://', 'https://'))
            qs = parse_qs(parsed.query)
            tk = qs.get('authToken', [None])
            turso_token = tk[0] if tk else None
            turso_url = f'libsql://{parsed.netloc}'
        else:
            print('Error: --turso-token is required when URL has no authToken')
            sys.exit(2)
    if not turso_token:
        print('Error: could not determine Turso auth token')
        sys.exit(2)

    print('=' * 60)
    print('Turso datetime fix (pure SQL, chunked by rowid)')
    print('=' * 60)
    print(f'Turso URL: {turso_url}')
    print(f'Token:     {turso_token[:12]}...{turso_token[-6:]}')
    print(f'Scope:     {args.only}')
    print(f'Chunk:     {args.chunk} rows per UPDATE')
    print()

    try:
        if args.only in ('all', 'hackers'):
            print('--- Hackers (joinedAt) ---')
            fix_simple_table(turso_url, turso_token, 'Hacker', ['joinedAt'])
            print()
        if args.only in ('all', 'news'):
            print('--- News (createdAt, updatedAt) ---')
            fix_simple_table(turso_url, turso_token, 'News', ['createdAt', 'updatedAt'])
            print()
        if args.only in ('all', 'defacements'):
            fix_defacements_chunked(turso_url, turso_token, chunk=args.chunk)
            print()
    except urllib.error.URLError as e:
        print(f'\n❌ Network error: {e}')
        sys.exit(1)

    print()
    print('=' * 60)
    print('✅ Done.')
    print('=' * 60)
    print()
    print('Verify the deployed site:')
    print('  curl \'https://defacer.zone.id/api/leaderboard?mode=defacers\'')
    print('  curl \'https://defacer.zone.id/api/defacements?limit=5\'')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
