#!/usr/bin/env python3
"""
Bulk submit defacement incidents via /api/submit-public API.

Usage:
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --url https://defacer.zone.id
    python3 scripts/submit.py list.txt GadaLuBau SonicNetwork --chunk 100 --severity high

Environment variables (optional, override CLI defaults):
    API_URL     — base URL (default: http://localhost:3000)
    CHUNK_SIZE  — incidents per request (default: 50)
    POC         — proof of concept string for ALL incidents
    REASON      — motivation string for ALL incidents
    SEVERITY    — low | medium | high | critical for ALL incidents
    STATUS      — archived | restored | live | onhold (default: archived)

list.txt format:
    One URL per line.
    Lines starting with # are comments (skipped).
    Blank lines are skipped.

Example list.txt:
    https://target1.gov.id/
    https://target2.ac.id/path
    # this is a comment — skipped
    https://target3.go.id/
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
        epilog=__doc__,
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
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be submitted without posting')
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

    print(f'Loaded {len(urls)} URL(s) from {args.file}')
    print(f'Attacker: {args.attacker} | Team: {args.team}')
    print(f'API: {args.api_url} | Chunk: {args.chunk} per request')
    if args.dry_run:
        print('DRY RUN — no requests will be sent\n')
    else:
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

    if args.dry_run:
        print(f'Would submit {len(incidents)} incidents in '
              f'{(len(incidents) + args.chunk - 1) // args.chunk} batches:')
        for i, inc in enumerate(incidents[:5]):
            print(f'  [{i+1}] {inc["targetUrl"]}')
        if len(incidents) > 5:
            print(f'  ... and {len(incidents) - 5} more')
        return

    # Chunk
    chunks = []
    for i in range(0, len(incidents), args.chunk):
        chunks.append(incidents[i:i + args.chunk])

    total_created = 0
    total_duplicates = 0
    total_errors = 0
    all_duplicate_hosts = []
    all_error_details = []
    all_created_ids = []

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
                print(f'FAIL: {result.get("error", "unknown")}')
                total_errors += len(chunk)
                continue

            created = result.get('created', 0)
            duplicates = result.get('duplicates', 0)
            errors = result.get('errors', 0)
            total_created += created
            total_duplicates += duplicates
            total_errors += errors
            if result.get('duplicateHosts'):
                all_duplicate_hosts.extend(result['duplicateHosts'])
            if result.get('errorDetails'):
                all_error_details.extend(result['errorDetails'])
            if result.get('ids'):
                all_created_ids.extend(result['ids'])

            print(f'created={created} dup={duplicates} err={errors}')

        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')[:200]
            print(f'HTTP {e.code}: {body}')
            total_errors += len(chunk)
        except urllib.error.URLError as e:
            print(f'NETWORK ERROR: {e.reason}')
            total_errors += len(chunk)
        except Exception as e:
            print(f'ERROR: {e}')
            total_errors += len(chunk)

        # small delay between batches to avoid overwhelming the server
        if i < len(chunks) - 1:
            time.sleep(0.5)

    # Final summary
    print()
    print('=' * 60)
    print('FINAL SUMMARY')
    print('=' * 60)
    print(f'Total URLs in file    : {len(urls)}')
    print(f'Created (new)         : {total_created}')
    print(f'Duplicates (skipped)   : {total_duplicates}')
    print(f'Errors                : {total_errors}')
    if all_created_ids:
        sample = ', '.join(all_created_ids[:5])
        extra = f' ... ({len(all_created_ids)} total)' if len(all_created_ids) > 5 else ''
        print(f'Created IDs (sample)  : {sample}{extra}')

    if all_duplicate_hosts:
        print(f'\nDuplicate hosts (already archived):')
        for h in sorted(set(all_duplicate_hosts)):
            print(f'  - {h}')

    if all_error_details:
        print(f'\nError details (first 5):')
        for e in all_error_details[:5]:
            err_msg = str(e.get('error', ''))[:100]
            print(f'  {e.get("url", "?")}: {err_msg}')
        if len(all_error_details) > 5:
            print(f'  ... and {len(all_error_details) - 5} more')

    print()
    if total_errors > 0:
        print(f'Result: {total_created} created, {total_errors} errors '
              f'(exit code 1)')
        sys.exit(1)
    else:
        print(f'Result: {total_created} created, {total_duplicates} duplicates skipped '
              f'(exit code 0)')
        sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted by user (Ctrl+C). Partial results above.')
        sys.exit(130)
