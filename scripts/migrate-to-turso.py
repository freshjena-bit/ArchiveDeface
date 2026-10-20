#!/usr/bin/env python3
"""
Migrate ALL data from Supabase to Turso (via Vercel API).
Auto-retries on errors with smaller chunk size.
"""

import argparse
import json
import sys
import time
import os
import urllib.request
import urllib.error


def fetch_from_supabase(supabase_url, supabase_key, table, offset=0, limit=1000):
    url = f"{supabase_url}/rest/v1/{table}?select=*&offset={offset}&limit={limit}"
    req = urllib.request.Request(url, headers={
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  Error fetching {table} offset={offset}: {e}')
        return []


def submit_batch(api_url, incidents):
    """Submit a batch. Returns (result_dict, error_str_or_None)."""
    data = json.dumps({'incidents': incidents}).encode('utf-8')
    req = urllib.request.Request(
        f'{api_url}/api/submit-public',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode('utf-8')), None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:200]
        return None, f'HTTP {e.code}: {body}'
    except urllib.error.URLError as e:
        return None, f'NETWORK: {e.reason}'
    except Exception as e:
        return None, f'ERROR: {e}'


def submit_with_retry(api_url, incidents, chunk_size=50, max_chunk=50, min_chunk=1):
    """Submit incidents with auto-retry on errors. Halves chunk on failure."""
    total_created = 0
    total_errors = 0
    failed_urls = set()
    current_chunk = chunk_size
    i = 0

    while i < len(incidents):
        chunk = incidents[i:i + current_chunk]
        batch_num = i // max_chunk + 1
        print(f'  Batch at offset {i} (chunk={current_chunk}, {len(chunk)} records)... ', end='', flush=True)

        result, error = submit_batch(api_url, chunk)

        if error and ('500' in error or '504' in error):
            # Retry with smaller chunk
            new_chunk = max(current_chunk // 2, min_chunk)
            if new_chunk < current_chunk:
                print(f'{error} — retrying chunk={new_chunk}')
                current_chunk = new_chunk
                continue  # Don't advance i — retry same records
            else:
                print(f'{error} — min chunk reached, marking as failed')
                for inc in chunk:
                    failed_urls.add(inc.get('targetUrl', ''))
                i += current_chunk
                time.sleep(2)
                continue

        if error:
            print(f'FAIL: {error}')
            for inc in chunk:
                failed_urls.add(inc.get('targetUrl', ''))
            i += current_chunk
            time.sleep(1)
            continue

        if not result.get('ok'):
            print(f'FAIL: {result.get("error", "unknown")}')
            for inc in chunk:
                failed_urls.add(inc.get('targetUrl', ''))
            i += current_chunk
            time.sleep(1)
            continue

        created = result.get('created', 0)
        duplicates = result.get('duplicates', 0)
        errors_count = result.get('errors', 0)
        total_created += created
        total_errors += errors_count

        if result.get('errorDetails'):
            for e in result['errorDetails']:
                failed_urls.add(e.get('url', ''))

        print(f'created={created} dup={duplicates} err={errors_count}')
        i += current_chunk
        # Longer delay for Turso (SQLite is slower)
        time.sleep(1)

        # Try to increase chunk size back if successful
        if current_chunk < max_chunk:
            current_chunk = min(current_chunk * 2, max_chunk)

    return total_created, total_errors, failed_urls


def main():
    parser = argparse.ArgumentParser(description='Migrate Supabase → Turso')
    parser.add_argument('--supabase-url', required=True)
    parser.add_argument('--supabase-key', required=True)
    parser.add_argument('--api-url', required=True)
    parser.add_argument('--attacker', required=True)
    parser.add_argument('--team', required=True)
    parser.add_argument('--chunk', type=int, default=10, help='Submit chunk size (default: 10)')
    parser.add_argument('--fetch-limit', type=int, default=1000)
    args = parser.parse_args()

    error_file = 'error.txt'
    if os.path.exists(error_file):
        os.remove(error_file)

    print('=' * 60)
    print('Supabase → Turso Migration')
    print('=' * 60)
    print(f'Chunk: {args.chunk} (auto-retry with smaller on error)')
    print(f'Delay: 1s between batches')
    print()

    # === 1. Migrate Hackers ===
    print('--- Hackers ---')
    hackers = []
    offset = 0
    while True:
        batch = fetch_from_supabase(args.supabase_url, args.supabase_key, 'Hacker', offset, args.fetch_limit)
        if not batch:
            break
        hackers.extend(batch)
        if len(batch) < args.fetch_limit:
            break
        offset += args.fetch_limit

    print(f'  Found {len(hackers)} hackers')
    for h in hackers:
        incident = [{
            'targetUrl': f'https://placeholder-{h["handle"]}.test/',
            'attacker': h['handle'],
            'team': h.get('team') or 'INDEPENDENT',
            'status': 'archived',
            'severity': 'low',
        }]
        try:
            result, err = submit_batch(args.api_url, incident)
            print(f'  {h["handle"]}: {"OK" if result and result.get("ok") else f"FAIL: {err}"}')
        except Exception as e:
            print(f'  {h["handle"]}: ERROR: {e}')
        time.sleep(0.5)

    print()

    # === 2. Migrate Defacements ===
    print('--- Defacements ---')
    all_incidents = []
    offset = 0
    total_fetched = 0
    while True:
        batch = fetch_from_supabase(args.supabase_url, args.supabase_key, 'Defacement', offset, args.fetch_limit)
        if not batch:
            break
        total_fetched += len(batch)
        if total_fetched % 5000 == 0 or len(batch) < args.fetch_limit:
            print(f'  Fetched: {total_fetched}')

        for d in batch:
            incident = {
                'targetUrl': d.get('targetUrl', ''),
                'attacker': args.attacker,
                'team': args.team,
                'status': d.get('status', 'archived'),
                'severity': d.get('severity', 'medium'),
                'isHomepage': d.get('isHomepage', False),
                'isMass': d.get('isMass', False),
                'isRedeface': d.get('isRedeface', False),
                'isSpecial': d.get('isSpecial', False),
                'category': d.get('category', 'com'),
                'country': d.get('country', 'ID'),
                'targetName': d.get('targetName', ''),
            }
            created = d.get('createdAt')
            if created:
                incident['createdAt'] = created
            poc = d.get('poc')
            if poc:
                incident['poc'] = poc
            reason = d.get('reason')
            if reason:
                incident['reason'] = reason
            mirror = d.get('mirrorUrl')
            if mirror:
                incident['mirrorUrl'] = mirror
            all_incidents.append(incident)

        if len(batch) < args.fetch_limit:
            break
        offset += args.fetch_limit

    print(f'  Total fetched: {len(all_incidents)}')
    print()

    # Submit with auto-retry
    print(f'--- Submitting {len(all_incidents)} to Turso (chunk={args.chunk}, auto-retry) ---')
    created, errors, failed = submit_with_retry(
        args.api_url, all_incidents,
        chunk_size=args.chunk, max_chunk=args.chunk, min_chunk=1
    )

    if failed:
        with open(error_file, 'w') as f:
            for url in sorted(failed):
                if url:
                    f.write(url + '\n')

    print()
    print('=' * 60)
    print('MIGRATION SUMMARY')
    print('=' * 60)
    print(f'Hackers:       {len(hackers)}')
    print(f'Defacements:   {len(all_incidents)} fetched, {created} created, {errors} errors')
    print(f'Failed:        {len(failed)} (in error.txt)')
    if failed:
        print(f'\nRe-submit failed:')
        print(f'  python3 scripts/submit.py {error_file} {args.attacker} {args.team} --url {args.api_url} --chunk 5')
    else:
        print('\nAll records migrated!')

    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
