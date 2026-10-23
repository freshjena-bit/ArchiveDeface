#!/usr/bin/env python3
"""
DIAGNOSTIC + RECOVERY: Insert missing records one-by-one with detailed error logging.

Use this AFTER running migrate-supabase.py if the verification step
shows records still missing. This script:
  1. Fetches all IDs from source
  2. Fetches all IDs from destination
  3. Computes the diff (missing IDs)
  4. Fetches the missing records from source
  5. Inserts them ONE BY ONE (not batched) with full error logging
  6. Reports the specific error for each failure

Usage:
  python3 scripts/recover-missing.py \\
    --source-url https://aaa.supabase.co \\
    --source-key sb_publishable_xxx \\
    --dest-url https://bbb.supabase.co \\
    --dest-key sb_publishable_yyy \\
    --table Defacement

  # Dry-run (just show missing count, don't insert):
  python3 scripts/recover-missing.py ... --dry-run
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


def fetch_all_ids(url, key, table, batch=1000):
    """Fetch all IDs from a table. Returns set of id strings."""
    print(f'fetching all IDs from {table}...')
    ids = set()
    offset = 0
    while True:
        endpoint = f'{url}/rest/v1/{table}?select=id&offset={offset}&limit={batch}'
        try:
            req = urllib.request.Request(
                endpoint,
                headers={'apikey': key, 'Authorization': f'Bearer {key}'},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                rows = json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f'  fetch fail at offset {offset}: {e}')
            break
        if not rows:
            break
        for r in rows:
            rid = r.get('id')
            if rid:
                ids.add(rid)
        offset += len(rows)
        if len(rows) < batch:
            break
        time.sleep(0.1)
    print(f'  got {len(ids)} IDs')
    return ids


def fetch_records_by_id(url, key, table, ids, batch=100):
    """Fetch full records by ID list. Returns list of dicts."""
    print(f'fetching {len(ids)} records from source...')
    records = []
    id_list = list(ids)
    for i in range(0, len(id_list), batch):
        batch_ids = id_list[i:i + batch]
        # Use PostgREST's `in` filter: ?id=in.(id1,id2,...)
        ids_param = ','.join(f'"{i}"' for i in batch_ids)
        endpoint = f'{url}/rest/v1/{table}?id=in.({ids_param})&select=*'
        try:
            req = urllib.request.Request(
                endpoint,
                headers={'apikey': key, 'Authorization': f'Bearer {key}'},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                rows = json.loads(resp.read().decode('utf-8'))
            records.extend(rows)
        except Exception as e:
            print(f'  fetch fail batch {i//batch + 1}: {e}')
        if (i // batch + 1) % 50 == 0:
            print(f'  fetched {len(records)}/{len(ids)}...')
        time.sleep(0.1)
    print(f'  fetched {len(records)} records')
    return records


def insert_one(url, key, table, record):
    """Insert a single record. Returns (success: bool, error: str | None)."""
    body = json.dumps(record).encode('utf-8')
    req = urllib.request.Request(
        f'{url}/rest/v1/{table}?on_conflict=id',
        data=body,
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates,return=representation',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_body = resp.read().decode('utf-8')
            if response_body:
                rows = json.loads(response_body)
                if isinstance(rows, list) and len(rows) > 0:
                    return True, None
                # 201 but empty body = conflict skip (already exists)
                return True, 'already-exists'
            return True, None
    except urllib.error.HTTPError as e:
        body_resp = e.read().decode('utf-8', errors='replace')[:400]
        return False, f'HTTP {e.code}: {body_resp}'
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(
        description='Recover missing records with detailed error logging')
    parser.add_argument('--source-url', required=True)
    parser.add_argument('--source-key', required=True)
    parser.add_argument('--dest-url', required=True)
    parser.add_argument('--dest-key', required=True)
    parser.add_argument('--table', required=True,
                        help='Table name (e.g., Defacement, Hacker, News)')
    parser.add_argument('--dry-run', action='store_true',
                        help='Just show missing count, do not insert')
    parser.add_argument('--limit', type=int, default=0,
                        help='Max records to attempt (0 = no limit)')
    parser.add_argument('--log-errors', type=int, default=20,
                        help='How many error samples to print (default: 20)')
    args = parser.parse_args()

    print('=' * 60)
    print(f'RECOVERY: {args.table}')
    print('=' * 60)
    print()

    # 1. Fetch all IDs from both source and dest
    source_ids = fetch_all_ids(args.source_url, args.source_key, args.table)
    dest_ids = fetch_all_ids(args.dest_url, args.dest_key, args.table)

    missing = source_ids - dest_ids
    print(f'\nsource: {len(source_ids)} IDs')
    print(f'dest:   {len(dest_ids)} IDs')
    print(f'missing: {len(missing)} IDs')

    if not missing:
        print('\nall records present! nothing to recover.')
        return

    if args.dry_run:
        print(f'\n(dry-run mode — not inserting. Run without --dry-run to recover.)')
        return

    if args.limit > 0 and len(missing) > args.limit:
        print(f'\nlimiting to first {args.limit} missing records (out of {len(missing)})')
        missing = set(list(missing)[:args.limit])

    # 2. Fetch the missing records from source
    records = fetch_records_by_id(args.source_url, args.source_key, args.table, missing)
    if not records:
        print('\nfailed to fetch missing records from source. abort.')
        sys.exit(1)

    # 3. Insert one by one with detailed error logging
    print(f'\ninserting {len(records)} records one by one...')

    # Clean records (same logic as migrate-supabase.py)
    nullable_fields = {'note', 'poc', 'reason', 'mirrorUrl', 'pendingUntil',
                       'bio', 'team', 'country'}
    cleaned_records = []
    for r in records:
        cleaned_records.append({
            k: v for k, v in r.items()
            if v is not None or k in nullable_fields
        })

    success_count = 0
    fail_count = 0
    already_exists = 0
    errors_by_type = {}  # error_message -> count
    error_samples = []  # first N error samples

    for i, record in enumerate(cleaned_records):
        rid = record.get('id', f'<no-id-{i}>')
        ok, err = insert_one(args.dest_url, args.dest_key, args.table, record)
        if ok:
            if err == 'already-exists':
                already_exists += 1
            else:
                success_count += 1
        else:
            fail_count += 1
            # Track error types
            # Truncate error to first 100 chars for grouping
            err_key = err[:100] if err else 'unknown'
            errors_by_type[err_key] = errors_by_type.get(err_key, 0) + 1
            if len(error_samples) < args.log_errors:
                error_samples.append({'id': rid, 'error': err})

        if (i + 1) % 500 == 0:
            print(f'  progress: {i + 1}/{len(cleaned_records)} | {success_count} ok | {fail_count} fail | {already_exists} exists')

    # 4. Report
    print()
    print('=' * 60)
    print('RECOVERY SUMMARY')
    print('=' * 60)
    print(f'attempted:    {len(cleaned_records)}')
    print(f'success:      {success_count}')
    print(f'already-exists: {already_exists}')
    print(f'failed:       {fail_count}')
    print()

    if errors_by_type:
        print('ERROR BREAKDOWN (top error types):')
        for err, count in sorted(errors_by_type.items(), key=lambda x: -x[1])[:10]:
            print(f'  [{count}x] {err}')
        print()

    if error_samples:
        print(f'ERROR SAMPLES (first {len(error_samples)}):')
        for s in error_samples:
            print(f'  id={s["id"]}')
            print(f'    {s["error"]}')
        print()

    if fail_count == 0:
        print('all missing records recovered!')
    else:
        print(f'{fail_count} records still failing. see errors above.')
        print('paste the error samples here for further debugging.')


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
