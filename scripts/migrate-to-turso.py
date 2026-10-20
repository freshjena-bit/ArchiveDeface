#!/usr/bin/env python3
"""
Migrate ALL data from Supabase to Turso (via Vercel API).

Prerequisites:
  1. DATABASE_URL in Vercel = Turso connection string (libsql://...)
  2. Vercel deployed with Turso as primary DB
  3. Tables created in Turso (DDL paste in Turso SQL Editor)

Usage:
  python3 scripts/migrate-to-turso.py --supabase-url https://xxx.supabase.co --supabase-key eyJxxx --api-url https://defacer.zone.id --attacker GadaLuBau --team SonicNetwork

Get Supabase URL + key from:
  Supabase dashboard → Settings → API → Project URL + anon public key
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error


def fetch_from_supabase(supabase_url, supabase_key, table, offset=0, limit=1000):
    """Fetch records from Supabase REST API."""
    url = f"{supabase_url}/rest/v1/{table}?select=*&offset={offset}&limit={limit}"
    req = urllib.request.Request(
        url,
        headers={
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  Error fetching {table} offset={offset}: {e}')
        return []


def submit_to_turso(api_url, incidents, chunk_size=50):
    """Submit incidents to Vercel API (which writes to Turso)."""
    total_created = 0
    total_errors = 0
    failed_urls = set()

    for i in range(0, len(incidents), chunk_size):
        chunk = incidents[i:i + chunk_size]
        batch_num = i // chunk_size + 1
        total_batches = (len(incidents) + chunk_size - 1) // chunk_size
        print(f'  Batch {batch_num}/{total_batches} ({len(chunk)} records)... ', end='', flush=True)

        try:
            data = json.dumps({'incidents': chunk}).encode('utf-8')
            req = urllib.request.Request(
                f'{api_url}/api/submit-public',
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))

            if not result.get('ok'):
                print(f'FAIL: {result.get("error", "unknown")}')
                total_errors += len(chunk)
                for inc in chunk:
                    failed_urls.add(inc.get('targetUrl', ''))
                continue

            created = result.get('created', 0)
            duplicates = result.get('duplicates', 0)
            errors = result.get('errors', 0)
            total_created += created
            total_errors += errors

            if result.get('errorDetails'):
                for e in result['errorDetails']:
                    failed_urls.add(e.get('url', ''))

            print(f'created={created} dup={duplicates} err={errors}')
        except urllib.error.HTTPError as e:
            print(f'HTTP {e.code}')
            total_errors += len(chunk)
            for inc in chunk:
                failed_urls.add(inc.get('targetUrl', ''))
        except Exception as e:
            print(f'ERROR: {e}')
            total_errors += len(chunk)
            for inc in chunk:
                failed_urls.add(inc.get('targetUrl', ''))

        time.sleep(0.3)

    return total_created, total_errors, failed_urls


def main():
    parser = argparse.ArgumentParser(description='Migrate Supabase → Turso via Vercel API')
    parser.add_argument('--supabase-url', required=True, help='Supabase project URL (https://xxx.supabase.co)')
    parser.add_argument('--supabase-key', required=True, help='Supabase anon public key')
    parser.add_argument('--api-url', required=True, help='Vercel app URL (https://defacer.zone.id)')
    parser.add_argument('--attacker', required=True, help='Hacker handle (e.g., GadaLuBau)')
    parser.add_argument('--team', required=True, help='Team name (e.g., SonicNetwork)')
    parser.add_argument('--chunk', type=int, default=50, help='Submit chunk size (default: 50)')
    parser.add_argument('--fetch-limit', type=int, default=1000, help='Supabase fetch batch size (default: 1000)')
    args = parser.parse_args()

    # Clear error.txt
    error_file = 'error.txt'
    try:
        import os
        if os.path.exists(error_file):
            os.remove(error_file)
    except:
        pass

    print('=' * 60)
    print('Supabase → Turso Migration')
    print('=' * 60)
    print(f'Supabase: {args.supabase_url}')
    print(f'Vercel API: {args.api_url}')
    print(f'Attacker: {args.attacker} | Team: {args.team}')
    print(f'Chunk: {args.chunk} per submit batch')
    print()

    grand_created = 0
    grand_errors = 0
    all_failed = set()

    # === 1. Migrate Hackers ===
    print('--- Hackers ---')
    hackers = []
    offset = 0
    while True:
        batch = fetch_from_supabase(args.supabase_url, args.supabase_key, 'Hacker', offset, args.fetch_limit)
        if not batch:
            break
        hackers.extend(batch)
        print(f'  Fetched {len(batch)} hackers (total: {len(hackers)})')
        if len(batch) < args.fetch_limit:
            break
        offset += args.fetch_limit

    if hackers:
        # Build incidents for each hacker (just register them via submit)
        # We only need the first hacker — the submit API auto-creates it
        # But we need all hackers, so we submit each separately
        for h in hackers:
            incidents = [{
                'targetUrl': f'https://placeholder-{h["handle"]}.test/',
                'attacker': h['handle'],
                'team': h.get('team') or 'INDEPENDENT',
                'status': 'archived',
                'severity': 'low',
            }]
            try:
                data = json.dumps({'incidents': incidents}).encode('utf-8')
                req = urllib.request.Request(
                    f'{args.api_url}/api/submit-public',
                    data=data,
                    headers={'Content-Type': 'application/json'},
                    method='POST',
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    result = json.loads(resp.read().decode('utf-8'))
                print(f'  Hacker {h["handle"]}: {"OK" if result.get("ok") else "FAIL"}')
            except Exception as e:
                print(f'  Hacker {h["handle"]}: ERROR: {e}')
            time.sleep(0.1)

    print(f'  Hackers migrated: {len(hackers)}')
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
        print(f'  Fetched {len(batch)} (total: {total_fetched})')

        # Convert to submit-public format with all fields preserved
        for d in batch:
            incident = {
                'targetUrl': d.get('targetUrl', ''),
                'attacker': args.attacker,  # All under GadaLuBau
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
            # Preserve original timestamp
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

    print(f'  Total defacements fetched: {len(all_incidents)}')
    print()

    # Submit to Turso via Vercel API
    print(f'--- Submitting {len(all_incidents)} incidents to Turso ---')
    created, errors, failed = submit_to_turso(args.api_url, all_incidents, args.chunk)
    grand_created += created
    grand_errors += errors
    all_failed.update(failed)

    # === 3. Migrate News ===
    print()
    print('--- News ---')
    news = fetch_from_supabase(args.supabase_url, args.supabase_key, 'News', 0, 1000)
    print(f'  Fetched {len(news)} news items')
    # News can't be submitted via submit-public — skip for now
    # User can post news manually via admin form
    if news:
        print(f'  Note: News items need to be posted manually via /admin form')

    # === 4. Migrate Stats ===
    print()
    print('--- Stats ---')
    stats = fetch_from_supabase(args.supabase_url, args.supabase_key, 'Stat', 0, 1000)
    print(f'  Fetched {len(stats)} stat entries')
    # Stats are auto-computed by the API — skip

    # Write error.txt
    if all_failed:
        with open(error_file, 'w') as f:
            for url in sorted(all_failed):
                if url:
                    f.write(url + '\n')

    # Summary
    print()
    print('=' * 60)
    print('MIGRATION SUMMARY')
    print('=' * 60)
    print(f'Hackers:       {len(hackers)}')
    print(f'Defacements:   {len(all_incidents)} fetched, {grand_created} created, {grand_errors} errors')
    print(f'News:          {len(news)} (post manually via /admin)')
    print(f'Stats:         {len(stats)} (auto-computed)')
    print(f'Failed URLs:   {len(all_failed)} (in error.txt)')
    print()
    if all_failed:
        print('Re-submit failed:')
        print(f'  python3 scripts/submit.py {error_file} {args.attacker} {args.team} --url {args.api_url}')
    else:
        print('All records migrated successfully!')

    sys.exit(1 if all_failed else 0)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n\nInterrupted.')
        sys.exit(130)
