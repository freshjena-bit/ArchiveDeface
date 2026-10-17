#!/usr/bin/env python3
"""
Bulk submit defacement incidents via /api/submit-public API.
Errors (URLs that failed to submit) are logged to error.txt.

Usage:
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --url https://defacer.zone.id
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --chunk 100 --severity high

Environment variables (optional):
    API_URL     — base URL (default: http://localhost:3000)
    CHUNK_SIZE  — incidents per request (default: 50)
    POC         — proof of concept string for ALL incidents
    REASON      — motivation string for ALL incidents
    SEVERITY    — low | medium | high | critical for ALL incidents
    STATUS      — archived | restored | live | onhold (default: archived)

error.txt format (only failed URLs):
    One URL per line — same format as list.txt.
    Can be re-submitted directly: python3 scripts/submit.py error.txt GadaLuBau SonicNetwork
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error


def main():
    parser = argparse.ArgumentParser(
        description='Bulk submit defacement incidents via /api/submit-public',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('file', help='File containing URLs (one per line)')
    parser.add_argument('attacker', help='Hacker handle (e.g., GadaLuBau)')
    parser.add_argument('team', help='Team name (e.g., SonicNetwork)')
    parser.add_argument(
        '--url', dest='api_url',
        default=os.environ.get('API_URL', 'http://localhost:3000'),
        help='API base URL (default: http://localhost:3000 or $API_URL)',
    )
    parser.add_argument(
        '--chunk', type=int,
        default=int(os.environ.get('CHUNK_SIZE', '50')),
        help='URLs per request (default: 50 or $CHUNK_SIZE)',
    )
    parser.add_argument('--poc', default=os.environ.get('POC'),
                        help='Proof of concept string (applied to all)')
    parser.add_argument('--reason', default=os.environ.get('REASON'),
                        help='Motivation string (applied to all)')
    parser.add_argument('--severity', default=os.environ.get('SEVERITY'),
                        choices=['low', 'medium', 'high', 'critical'],
                        help='Severity (applied to all)')
    parser.add_argument('--status', default=os.environ.get('STATUS', 'archived'),
                        choices=['archived', 'restored', 'live', 'onhold'],
                        help='Status (default: archived)')
    args = parser.parse_args()

    # Read URLs from file
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
        print('Error: No URLs found in file (blank lines and # comments are skipped).',
              file=sys.stderr)
        sys.exit(1)

    # Clear previous error.txt
    error_file = 'error.txt'
    if os.path.exists(error_file):
        os.remove(error_file)

    print(f'Loaded {len(urls)} URL(s) from {args.file}')
    print(f'Attacker: {args.attacker} | Team: {args.team}')
    print(f'API: {args.api_url} | Chunk: {args.chunk} per request')
    print(f'Error log: {error_file} (only failed URLs)')
    print()

    # Build incidents
    incidents = []
    for url in urls:
        incident = {
            'targetUrl': url,
            'attacker': args.attacker,
            'team': args.team,
            'status': args.status,
        }
        if args.poc:
            incident['poc'] = args.poc
        if args.reason:
            incident['reason'] = args.reason
        if args.severity:
            incident['severity'] = args.severity
        incidents.append(incident)

    # Track which URLs failed
    failed_urls = set()

    # Chunk
    chunks = []
    for i in range(0, len(incidents), args.chunk):
        chunks.append(incidents[i:i + args.chunk])

    total_created = 0
    total_duplicates = 0

    for i, chunk in enumerate(chunks):
        start = i * args.chunk + 1
        end = min(start + len(chunk) - 1, len(incidents))
        print(f'Batch {i+1}/{len(chunks)} (URLs {start}-{end})... ', end='', flush=True)

        try:
            data = json.dumps({'incidents': chunk}).encode('utf-8')
            req = urllib.request.Request(
                f'{args.api_url}/api/submit-public',
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))

            if not result.get('ok'):
                err_msg = result.get('error', 'unknown')
                print(f'FAIL: {err_msg}')
                # All URLs in this batch failed
                for inc in chunk:
                    failed_urls.add(inc['targetUrl'])
                continue

            created = result.get('created', 0)
            duplicates = result.get('duplicates', 0)
            errors = result.get('errors', 0)
            total_created += created
            total_duplicates += duplicates

            # Collect failed URLs from errorDetails
            if result.get('errorDetails'):
                for e in result['errorDetails']:
                    failed_urls.add(e.get('url', ''))

            # If entire batch failed (network/HTTP error), all URLs failed
            if created == 0 and duplicates == 0 and errors > 0:
                for inc in chunk:
                    failed_urls.add(inc['targetUrl'])

            print(f'created={created} dup={duplicates} err={errors}')

        except urllib.error.HTTPError as e:
            print(f'HTTP {e.code}')
            for inc in chunk:
                failed_urls.add(inc['targetUrl'])
        except urllib.error.URLError as e:
            print(f'NETWORK ERROR: {e.reason}')
            for inc in chunk:
                failed_urls.add(inc['targetUrl'])
        except Exception as e:
            print(f'ERROR: {e}')
            for inc in chunk:
                failed_urls.add(inc['targetUrl'])

        # Small delay between batches
        if i < len(chunks) - 1:
            time.sleep(0.5)

    # Write error.txt — only failed URLs, one per line
    # Same format as list.txt → can be re-submitted directly
    if failed_urls:
        with open(error_file, 'w', encoding='utf-8') as f:
            for url in sorted(failed_urls):
                if url:
                    f.write(url + '\n')

    # Final summary
    print()
    print('=' * 60)
    print('FINAL SUMMARY')
    print('=' * 60)
    print(f'Total URLs in file    : {len(urls)}')
    print(f'Created (new)         : {total_created}')
    print(f'Duplicates (skipped)   : {total_duplicates}')
    print(f'Failed (in error.txt)  : {len(failed_urls)}')

    if failed_urls:
        print(f'\nerror.txt contains {len(failed_urls)} failed URLs.')
        print(f'Re-submit them with:')
        print(f'  python3 scripts/submit.py {error_file} {args.attacker} {args.team} --url {args.api_url}')
    else:
        print(f'\nNo errors — all URLs submitted successfully!')

    print()
    if failed_urls:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted by user (Ctrl+C). Partial results above.')
        sys.exit(130)
