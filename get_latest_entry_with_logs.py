#!/usr/bin/env python3
"""
Get latest entry from ANY Memento library and check Debug_Log, Error_Log, info fields

This script is used to:
- Fetch the most recent entry from a specified library
- Check for errors and debug information in common logging fields
- Verify script execution results without manual copy-paste from Memento app

Usage:
  python get_latest_entry_with_logs.py "Dochádzka"
  python get_latest_entry_with_logs.py "Kniha jázd" --active-only
  python get_latest_entry_with_logs.py "Záznam prác" --show-all-fields
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv
from datetime import datetime
import argparse
import time

# Load environment
load_dotenv('.env')
API_KEY = os.getenv('MEMENTO_API_KEY')

if not API_KEY:
    print("ERROR: MEMENTO_API_KEY not found in .env file")
    sys.exit(1)

BASE_URL = "https://api.mementodatabase.com/v1"

# Common field names across all libraries
COMMON_FIELDS = {
    'Debug_Log': None,
    'Error_Log': None,
    'info': None
}

def get_library_by_name(library_name):
    """Find library ID by name"""
    url = f"{BASE_URL}/libraries"
    params = {'token': API_KEY}

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

    libraries = response.json().get('libraries', [])

    for lib in libraries:
        if lib.get('name') == library_name:
            return lib

    return None

def get_library_structure(library_id):
    """Get library structure and find Debug_Log, Error_Log, info field IDs"""
    url = f"{BASE_URL}/libraries/{library_id}"
    params = {'token': API_KEY}

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error getting library structure: {response.status_code}")
        return None, {}

    library = response.json()
    fields = library.get('fields', [])

    # Find common logging fields
    field_map = {}
    log_field_ids = {}

    for field in fields:
        fid = field.get('id')
        fname = field.get('name')
        ftype = field.get('type')

        field_map[fid] = {'name': fname, 'type': ftype}

        # Check for common logging fields
        if fname == 'Debug_Log':
            log_field_ids['Debug_Log'] = fid
        elif fname == 'Error_Log':
            log_field_ids['Error_Log'] = fid
        elif fname == 'info':
            log_field_ids['info'] = fid

    return library, field_map, log_field_ids

def get_latest_entry(library_id, active_only=True):
    """Get the latest entry from library"""
    url = f"{BASE_URL}/libraries/{library_id}/entries"
    params = {
        'token': API_KEY,
        'fields': '*all',
        'pageSize': 100
    }

    print(f"Fetching entries...")

    # Fetch multiple pages if needed
    all_entries = []
    page_num = 1

    while True:
        response = requests.get(url, params=params)

        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            break

        data = response.json()
        entries = data.get('entries', [])

        if active_only:
            active = [e for e in entries if e.get('status') != 'deleted']
            all_entries.extend(active)
        else:
            all_entries.extend(entries)

        # Check for next page
        page_token = data.get('nextPageToken')

        # Stop if no more pages or found enough active entries
        if not page_token:
            break

        if active_only and len(all_entries) >= 10:
            # Found enough active entries
            break

        if page_num >= 10:  # Limit to 10 pages max (1000 entries)
            break

        params['pageToken'] = page_token
        page_num += 1

        # Rate limiting - wait between requests
        time.sleep(0.5)

    if not all_entries:
        return None

    # Sort by modified time (newest first)
    all_entries.sort(key=lambda x: x.get('modifiedTime', ''), reverse=True)

    print(f"Found {len(all_entries)} {'active' if active_only else 'total'} entries")

    return all_entries[0]

def extract_field_value(entry, field_id):
    """Extract field value by ID"""
    fields = entry.get('fields', [])

    for field in fields:
        if field.get('id') == field_id:
            return field.get('value')

    return None

def check_logging_fields(entry, log_field_ids, field_map):
    """Check if logging fields exist and extract their values"""
    results = {
        'has_debug_log': False,
        'has_error_log': False,
        'has_info': False,
        'debug_log': None,
        'error_log': None,
        'info': None,
        'missing_fields': []
    }

    # Check Debug_Log
    if 'Debug_Log' in log_field_ids:
        debug_log = extract_field_value(entry, log_field_ids['Debug_Log'])
        results['debug_log'] = debug_log
        results['has_debug_log'] = True
    else:
        results['missing_fields'].append('Debug_Log')

    # Check Error_Log
    if 'Error_Log' in log_field_ids:
        error_log = extract_field_value(entry, log_field_ids['Error_Log'])
        results['error_log'] = error_log
        results['has_error_log'] = True
    else:
        results['missing_fields'].append('Error_Log')

    # Check info
    if 'info' in log_field_ids:
        info = extract_field_value(entry, log_field_ids['info'])
        results['info'] = info
        results['has_info'] = True
    else:
        results['missing_fields'].append('info')

    return results

def display_entry(entry, library, field_map, log_results, show_all_fields=False):
    """Display entry details"""
    print("\n" + "="*80)
    print("LATEST ENTRY")
    print("="*80)

    print(f"Library: {library.get('name')}")
    print(f"Entry ID: {entry.get('id')}")
    print(f"Status: {entry.get('status')}")
    print(f"Created: {entry.get('createdTime')}")
    print(f"Modified: {entry.get('modifiedTime')}")

    # Show all fields if requested
    if show_all_fields:
        print("\n" + "="*80)
        print("ALL FIELDS:")
        print("="*80)

        fields = entry.get('fields', [])
        for field in fields:
            fid = field.get('id')
            fval = field.get('value')
            field_info = field_map.get(fid, {})
            fname = field_info.get('name', f'field_{fid}')
            ftype = field_info.get('type', 'unknown')

            if fval is None or fval == '':
                print(f"{fname} ({ftype}): (empty)")
            elif isinstance(fval, str) and len(fval) > 100:
                print(f"{fname} ({ftype}): {len(fval)} chars - {fval[:80]}...")
            else:
                print(f"{fname} ({ftype}): {fval}")

    # Check for missing logging fields
    if log_results['missing_fields']:
        print("\n" + "="*80)
        print("⚠️  MISSING LOGGING FIELDS:")
        print("="*80)
        for field_name in log_results['missing_fields']:
            print(f"  - {field_name} field not found in library!")
        print("\nThese fields should be added to the library for proper logging.")

    # Debug Log
    print("\n" + "="*80)
    debug_status = "✅ EXISTS" if log_results['has_debug_log'] else "❌ MISSING"
    print(f"DEBUG_LOG {debug_status}")
    if log_results['has_debug_log']:
        debug_len = len(log_results['debug_log']) if log_results['debug_log'] else 0
        print(f"({debug_len} chars)")
    print("="*80)

    if log_results['has_debug_log']:
        if log_results['debug_log']:
            print(log_results['debug_log'])
        else:
            print("(empty)")

    # Error Log
    print("\n" + "="*80)
    error_status = "✅ EXISTS" if log_results['has_error_log'] else "❌ MISSING"
    print(f"ERROR_LOG {error_status}")
    if log_results['has_error_log']:
        error_len = len(log_results['error_log']) if log_results['error_log'] else 0
        print(f"({error_len} chars)")
    print("="*80)

    if log_results['has_error_log']:
        if log_results['error_log']:
            print(log_results['error_log'])

            # Highlight errors
            if log_results['error_log'] and len(log_results['error_log']) > 0:
                print("\n🔴 ERRORS DETECTED! Script execution had errors.")
        else:
            print("(empty)")
            print("\n✅ No errors - script executed successfully")

    # Info
    print("\n" + "="*80)
    info_status = "✅ EXISTS" if log_results['has_info'] else "❌ MISSING"
    print(f"INFO {info_status}")
    if log_results['has_info']:
        info_len = len(log_results['info']) if log_results['info'] else 0
        print(f"({info_len} chars)")
    print("="*80)

    if log_results['has_info']:
        if log_results['info']:
            print(log_results['info'])
        else:
            print("(empty)")

def main():
    parser = argparse.ArgumentParser(
        description='Get latest entry from Memento library and check logging fields',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python get_latest_entry_with_logs.py "Dochádzka"
  python get_latest_entry_with_logs.py "Kniha jázd" --include-deleted
  python get_latest_entry_with_logs.py "Záznam prác" --show-all-fields
  python get_latest_entry_with_logs.py "Pokladňa" --save
        """
    )

    parser.add_argument('library_name', help='Library name (e.g., "Dochádzka")')
    parser.add_argument('--include-deleted', action='store_true',
                       help='Include deleted entries in search')
    parser.add_argument('--show-all-fields', action='store_true',
                       help='Show all entry fields, not just logging fields')
    parser.add_argument('--save', action='store_true',
                       help='Save full entry to JSON file')

    args = parser.parse_args()

    library_name = args.library_name
    active_only = not args.include_deleted

    print("="*80)
    print(f"GETTING LATEST ENTRY FROM: {library_name}")
    print("="*80)

    # Find library
    print(f"\nSearching for library '{library_name}'...")
    library = get_library_by_name(library_name)

    if not library:
        print(f"❌ Library '{library_name}' not found!")
        print("\nMake sure the library name is exact (case-sensitive).")
        sys.exit(1)

    library_id = library.get('id')
    print(f"✅ Found library: {library.get('name')} (ID: {library_id})")

    # Get library structure
    print(f"\nGetting library structure...")
    library, field_map, log_field_ids = get_library_structure(library_id)

    if not library:
        print("❌ Failed to get library structure!")
        sys.exit(1)

    print(f"✅ Library has {len(field_map)} fields")
    print(f"   Logging fields found: {list(log_field_ids.keys())}")

    # Get latest entry
    latest_entry = get_latest_entry(library_id, active_only=active_only)

    if not latest_entry:
        print("\n❌ No entries found in library!")
        sys.exit(0)

    # Check logging fields
    log_results = check_logging_fields(latest_entry, log_field_ids, field_map)

    # Display results
    display_entry(latest_entry, library, field_map, log_results,
                 show_all_fields=args.show_all_fields)

    # Save to file if requested
    if args.save:
        filename = f"{library_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(latest_entry, f, indent=2, ensure_ascii=False)

        print(f"\n{'='*80}")
        print(f"Full entry saved to: {filename}")
        print("="*80)

    # Summary
    print("\n" + "="*80)
    print("SUMMARY:")
    print("="*80)

    if log_results['missing_fields']:
        print(f"⚠️  Missing fields: {', '.join(log_results['missing_fields'])}")
        print("   These should be added to the library for debugging.")
    else:
        print("✅ All logging fields (Debug_Log, Error_Log, info) exist")

    has_errors = (log_results['has_error_log'] and
                 log_results['error_log'] and
                 len(log_results['error_log']) > 0)

    if has_errors:
        print("🔴 ERRORS DETECTED - Script execution failed!")
        print("   Review Error_Log above for details.")
    else:
        print("✅ No errors detected - Script executed successfully")

if __name__ == '__main__':
    # Set UTF-8 encoding for Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    main()
