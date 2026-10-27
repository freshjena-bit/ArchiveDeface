#!/usr/bin/env python3
"""
Fix datetime format in Turso DB.

The migrate-fast.py script copied datetime strings directly from Supabase Postgres
into Turso SQLite. Postgres stores datetimes like `2026-10-07T06:19:56.09`
(2-digit fractional seconds, no Z suffix). The Prisma LibSQL adapter requires
strict ISO 8601 format: `2026-10-07T06:19:56.090Z` (3-digit ms + Z).

This script reads every row from Hacker / Defacement / News, re-formats all
DateTime columns to strict ISO 8601, and UPDATEs them back.

Usage:
  python3 scripts/fix-dates.py \
    --turso-url libsql://defacerzoneid-xxx.tur.so \
    --turso-token eyJxxx

Get credentials from Turso dashboard → database → Settings.
If your --turso-url already contains ?authToken=, you can omit --turso-token.
"""

import argparse
import json
import re
import sys
import time
import urllib.request
import urllib.error


# ---------------------------------------------------------------------------
# Turso HTTP API helpers
# ---------------------------------------------------------------------------

def turso_pipeline(turso_url, turso_token, requests_payload, timeout=120):
    """Execute a pipeline request on Turso via libSQL HTTP API.

    requests_payload: list of {'type':'execute','stmt':{'sql':...}} dicts
    Returns the parsed JSON response.
    """
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


def turso_execute(turso_url, turso_token, sql, timeout=120):
    """Execute a single SQL statement on Turso. Returns raw response."""
    return turso_pipeline(turso_url, turso_token,
                          [{'type': 'execute', 'stmt': {'sql': sql}}],
                          timeout=timeout)


def turso_query(turso_url, turso_token, sql, timeout=120):
    """Execute a SELECT and return list of row dicts {col: value}."""
    resp = turso_pipeline(turso_url, turso_token,
                           [{'type': 'execute', 'stmt': {'sql': sql}}],
                           timeout=timeout)
    # Response shape: {'results': [{'type':'ok','response':{'result':{'rows':[[...]], 'cols':[{'name':...}]}}}]}
    try:
        result_block = resp['results'][0]['response']['result']
    except (KeyError, IndexError):
        print('  Unexpected response:', json.dumps(resp)[:400])
        return []

    cols = [c['name'] for c in result_block.get('cols', [])]
    rows_raw = result_block.get('rows', [])
    out = []
    for r in rows_raw:
        # Each value is {'type':'text'|'integer'|...,'value':...}
        vals = []
        for cell in r:
            v = cell.get('value') if isinstance(cell, dict) else cell
            vals.append(v)
        out.append(dict(zip(cols, vals)))
    return out


# ---------------------------------------------------------------------------
# Date normalization
# ---------------------------------------------------------------------------

_ISO_RE = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')


def normalize_dt(val):
    """Convert a Postgres / SQLite datetime string into strict ISO 8601
    with 3-digit ms and Z suffix.

    Returns:
      - None if input is None
      - the original string if already correct (no-op)
      - a normalized string otherwise
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        # epoch seconds
        try:
            import datetime as _dt
            return _dt.datetime.utcfromtimestamp(val).strftime('%Y-%m-%dT%H:%M:%S') + '.000Z'
        except Exception:
            return None
    s = str(val).strip()
    if not s:
        return None
    if _ISO_RE.match(s):
        return s  # already correct

    # Try to parse with datetime.fromisoformat (handles most Postgres formats)
    # Python 3.11+ handles 'Z' suffix; older versions need replacement.
    iso = s
    try:
        import datetime as _dt
        if iso.endswith('Z'):
            iso = iso[:-1] + '+00:00'
        dt = _dt.datetime.fromisoformat(iso)
        # If naive, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=_dt.timezone.utc)
        # Convert to UTC
        dt_utc = dt.astimezone(_dt.timezone.utc)
        # Format with 3-digit ms and Z
        out = dt_utc.strftime('%Y-%m-%dT%H:%M:%S.') + f'{dt_utc.microsecond // 1000:03d}Z'
        return out
    except Exception as e:
        # Fallback: regex-based reformat
        # Accept 'YYYY-MM-DDTHH:MM:SS' or 'YYYY-MM-DD HH:MM:SS' with optional .frac
        m = re.match(
            r'^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.(\d{1,6}))?( ([+-]\d{2}:\d{2})|Z)?$',
            s,
        )
        if not m:
            print(f'  ⚠️ Cannot parse datetime: {val!r}')
            return None
        date_part, time_part, _, frac, _, tz_part = m.groups()
        if frac:
            ms = (frac.ljust(3, '0'))[:3]
        else:
            ms = '000'
        # Ignore tz_part, assume UTC (Postgres+Prisma stored UTC)
        return f'{date_part}T{time_part}.{ms}Z'


def sql_escape(val):
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return '1' if val else '0'
    if isinstance(val, (int, float)):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"


# ---------------------------------------------------------------------------
# Table fixers
# ---------------------------------------------------------------------------

def fix_hackers(turso_url, turso_token):
    print('--- Hackers (joinedAt) ---')
    rows = turso_query(turso_url, turso_token,
                       'SELECT "id","joinedAt" FROM "Hacker";')
    print(f'  Found {len(rows)} hackers')
    fixed = 0
    skipped = 0
    for r in rows:
        old = r.get('joinedAt')
        new = normalize_dt(old)
        if new is None or new == old:
            skipped += 1
            continue
        sql = (f'UPDATE "Hacker" SET "joinedAt"={sql_escape(new)} '
               f'WHERE "id"={sql_escape(r["id"])};')
        turso_execute(turso_url, turso_token, sql)
        fixed += 1
        if fixed % 100 == 0:
            print(f'  Fixed {fixed}...')
    print(f'  ✅ Fixed: {fixed} | Skipped (already correct): {skipped}')
    return fixed


def fix_news(turso_url, turso_token):
    print('--- News (createdAt, updatedAt) ---')
    rows = turso_query(turso_url, turso_token,
                       'SELECT "id","createdAt","updatedAt" FROM "News";')
    print(f'  Found {len(rows)} news items')
    fixed = 0
    for r in rows:
        sets = []
        for col in ('createdAt', 'updatedAt'):
            old = r.get(col)
            new = normalize_dt(old)
            if new is None or new == old:
                continue
            sets.append(f'"{col}"={sql_escape(new)}')
        if not sets:
            continue
        sql = (f'UPDATE "News" SET {", ".join(sets)} '
               f'WHERE "id"={sql_escape(r["id"])};')
        turso_execute(turso_url, turso_token, sql)
        fixed += 1
    print(f'  ✅ Fixed: {fixed} rows')
    return fixed


def fix_defacements(turso_url, turso_token, batch=2000):
    print('--- Defacements (createdAt, pendingUntil) ---')
    # Count first
    count_rows = turso_query(turso_url, turso_token,
                              'SELECT COUNT(*) AS n FROM "Defacement";')
    total = count_rows[0].get('n') if count_rows else 0
    try:
        total = int(total)
    except Exception:
        total = 0
    print(f'  Total defacements: {total}')

    fixed = 0
    skipped = 0
    processed = 0

    # Process in batches by rowid (more efficient than offset on huge tables)
    # We use LIMIT/OFFSET in a loop — SQLite handles this fine for our sizes.
    offset = 0
    while True:
        rows = turso_query(turso_url, turso_token,
                           f'SELECT "id","createdAt","pendingUntil" FROM "Defacement" '
                           f'LIMIT {batch} OFFSET {offset};')
        if not rows:
            break
        for r in rows:
            processed += 1
            sets = []
            for col in ('createdAt', 'pendingUntil'):
                old = r.get(col)
                new = normalize_dt(old)
                if new is None:
                    continue
                if new == old:
                    continue
                sets.append(f'"{col}"={sql_escape(new)}')
            if not sets:
                skipped += 1
                continue
            sql = (f'UPDATE "Defacement" SET {", ".join(sets)} '
                   f'WHERE "id"={sql_escape(r["id"])};')
            turso_execute(turso_url, turso_token, sql)
            fixed += 1
        offset += batch
        if processed % 10000 == 0 or processed >= total:
            print(f'  Processed {processed}/{total} | fixed {fixed} | skipped {skipped}')
        if len(rows) < batch:
            break
        time.sleep(0.05)
    print(f'  ✅ Fixed: {fixed} | Skipped (already correct): {skipped} | Total: {processed}')
    return fixed


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Fix datetime format in Turso DB (strict ISO 8601 with Z suffix)')
    parser.add_argument('--turso-url', required=True,
                        help='libsql://xxx.tur.so (with or without ?authToken=)')
    parser.add_argument('--turso-token', default=None,
                        help='Turso auth token (required if URL has no authToken)')
    parser.add_argument('--only', choices=['hackers', 'news', 'defacements', 'all'],
                        default='all', help='Only fix one table (default: all)')
    args = parser.parse_args()

    # Extract token from URL if not provided
    turso_url = args.turso_url
    turso_token = args.turso_token
    if not turso_token:
        if '?authToken=' in turso_url or '&authToken=' in turso_url:
            # Parse authToken from URL
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
    print('Fix datetime format in Turso DB')
    print('=' * 60)
    print(f'Turso URL: {turso_url}')
    print(f'Token:     {turso_token[:12]}...{turso_token[-6:]}')
    print(f'Scope:     {args.only}')
    print()

    total_fixed = 0
    try:
        if args.only in ('all', 'hackers'):
            total_fixed += fix_hackers(turso_url, turso_token)
        if args.only in ('all', 'news'):
            total_fixed += fix_news(turso_url, turso_token)
        if args.only in ('all', 'defacements'):
            total_fixed += fix_defacements(turso_url, turso_token)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:500]
        print(f'\n❌ HTTP {e.code}: {body}')
        sys.exit(1)
    except Exception as e:
        print(f'\n❌ Error: {e}')
        raise

    print()
    print('=' * 60)
    print(f'✅ Done. Total rows updated: {total_fixed}')
    print('=' * 60)
    print()
    print('Next: verify the deployed site:')
    print('  curl https://defacer.zone.id/api/leaderboard?mode=defacers')
    print('  curl https://defacer.zone.id/api/defacements?limit=5')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
