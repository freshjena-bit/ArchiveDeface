#!/usr/bin/env python3
"""
Bulk submit defacement incidents via /api/submit-public API.
Errors (failed URLs) are logged to error.txt.

Features:
  - Auto-retry on HTTP 504 with smaller chunk size
  - error.txt contains only failed URLs (same format as list.txt)
  - Can re-submit error.txt directly

Usage:
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --url https://defacer.zone.id
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --chunk 50 --severity high

Environment variables (optional):
    API_URL     — base URL (default: http://localhost:3000)
    CHUNK_SIZE  — incidents per request (default: 50)
    POC, REASON, SEVERITY, STATUS — applied to all incidents
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error


def submit_batch(api_url, incidents):
    """Submit a batch of incidents. Returns (result_dict, error_str_or_None)."""
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


def main():
    parser = argparse.ArgumentParser(
        description='Bulk submit defacement incidents via /api/submit-public',
    )
    parser.add_argument('file', help='File containing URLs (one per line)')
    parser.add_argument('attacker', help='Hacker handle')
    parser.add_argument('team', help='Team name')
    parser.add_argument('--url', dest='api_url',
                        default=os.environ.get('API_URL', 'http://localhost:3000'),
                        help='API base URL')
    parser.add_argument('--chunk', type=int,
                        default=int(os.environ.get('CHUNK_SIZE', '50')),
                        help='URLs per request (default: 50)')
    parser.add_argument('--poc', default=os.environ.get('POC'))
    parser.add_argument('--reason', default=os.environ.get('REASON'))
    parser.add_argument('--severity', default=os.environ.get('SEVERITY'),
                        choices=['low', 'medium', 'high', 'critical'])
    parser.add_argument('--status', default=os.environ.get('STATUS', 'archived'),
                        choices=['archived', 'restored', 'live', 'onhold'])
    args = parser.parse_args()

    # Read URLs
    if not os.path.exists(args.file):
        print(f'Error: File not found: {args.file}', file=sys.stderr)
        sys.exit(1)

    urls = []
    with open(args.file, 'r') as f:
        for line in f:
            url = line.strip()
            if url and not url.startswith('#'):
                urls.append(url)

    if not urls:
        print('Error: No URLs found in file.', file=sys.stderr)
        sys.exit(1)

    # Clear error.txt
    error_file = 'error.txt'
    if os.path.exists(error_file):
        os.remove(error_file)

    print(f'Loaded {len(urls)} URL(s) from {args.file}')
    print(f'Attacker: {args.attacker} | Team: {args.team}')
    print(f'API: {args.api_url} | Chunk: {args.chunk}')
    print()

    # Build incidents
    incidents = []
    for url in urls:
        inc = {'targetUrl': url, 'attacker': args.attacker, 'team': args.team, 'status': args.status}
        if args.poc: inc['poc'] = args.poc
        if args.reason: inc['reason'] = args.reason
        if args.severity: inc['severity'] = args.severity
        incidents.append(inc)

    # Process with auto-retry on 504
    total_created = 0
    total_duplicates = 0
    failed_urls = set()
    current_chunk = args.chunk

    i = 0
    batch_num = 0
    total_batches = (len(incidents) + current_chunk - 1) // current_chunk

    while i < len(incidents):
        chunk = incidents[i:i + current_chunk]
        batch_num += 1
        start = i + 1
        end = min(i + current_chunk, len(incidents))
        print(f'Batch {batch_num} (URLs {start}-{end}, chunk={current_chunk})... ', end='', flush=True)

        result, error = submit_batch(args.api_url, chunk)

        if error and '504' in error:
            # HTTP 504 — retry with smaller chunk
            print(f'504 TIMEOUT — retrying with chunk={max(current_chunk // 2, 1)}')
            current_chunk = max(current_chunk // 2, 1)
            total_batches = (len(incidents) - i + current_chunk - 1) // current_chunk + batch_num
            # Don't advance i — retry same URLs with smaller chunk
            # But reset batch_num to avoid confusion
            continue

        if error:
            # Other error (not 504)
            print(f'FAIL: {error}')
            for inc in chunk:
                failed_urls.add(inc['targetUrl'])
            i += current_chunk
            time.sleep(0.5)
            continue

        if not result.get('ok'):
            print(f'FAIL: {result.get("error", "unknown")}')
            for inc in chunk:
                failed_urls.add(inc['targetUrl'])
            i += current_chunk
            time.sleep(0.5)
            continue

        created = result.get('created', 0)
        duplicates = result.get('duplicates', 0)
        errors_count = result.get('errors', 0)
        total_created += created
        total_duplicates += duplicates

        # Collect per-incident errors
        if result.get('errorDetails'):
            for e in result['errorDetails']:
                failed_urls.add(e.get('url', ''))

        print(f'created={created} dup={duplicates} err={errors_count}')
        i += current_chunk
        time.sleep(0.3)

    # Write error.txt
    if failed_urls:
        with open(error_file, 'w', encoding='utf-8') as f:
            for url in sorted(failed_urls):
                if url:
                    f.write(url + '\n')

    # Summary
    print()
    print('=' * 60)
    print('FINAL SUMMARY')
    print('=' * 60)
    print(f'Total URLs         : {len(urls)}')
    print(f'Created (new)      : {total_created}')
    print(f'Duplicates (skip)  : {total_duplicates}')
    print(f'Failed (error.txt) : {len(failed_urls)}')

    if failed_urls:
        print(f'\nRe-submit failed URLs:')
        print(f'  python3 scripts/submit.py {error_file} {args.attacker} {args.team} --url {args.api_url}')
    else:
        print('\nAll URLs submitted successfully!')

    sys.exit(1 if failed_urls else 0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted by user.')
        sys.exit(130)
