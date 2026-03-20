#!/usr/bin/env python3
"""
Get latest entry from ASISTANTO Logs library
Shows Debug_Log, Error_Log, and info fields

Usage: python get_latest_asistanto_log.py [--library "LibraryName"] [--today-only]
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv
from datetime import datetime
import argparse

# Load environment
load_dotenv('.env')
API_KEY = os.getenv('MEMENTO_API_KEY')

if not API_KEY:
    print("ERROR: MEMENTO_API_KEY not found in .env file")
    sys.exit(1)

BASE_URL = "https://api.mementodatabase.com/v1"
ASISTANTO_LOGS_ID = "H6PRzPqxU"

def search_logs(library_filter=None, today_only=False):
    """Search for log entries"""
    url = f"{BASE_URL}/libraries/{ASISTANTO_LOGS_ID}/search"

    # Build search query
    query = library_filter if library_filter else ""

    params = {
        'token': API_KEY,
        'q': query,
        'fields': '*all'
    }

    print(f"Searching ASISTANTO Logs...")
    if library_filter:
        print(f"Filter: library='{library_filter}'")

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return []

    data = response.json()
    entries = data.get('entries', [])

    # Filter for today if requested
    if today_only:
        today = datetime.now().strftime('%Y-%m-%d')
        entries = [e for e in entries if e.get('modifiedTime', '').startswith(today)]
        print(f"Filtering for today ({today})")

    # Sort by modified time (newest first)
    entries.sort(key=lambda x: x.get('modifiedTime', ''), reverse=True)

    print(f"Found {len(entries)} entries\n")

    return entries

def get_entry_by_id(entry_id):
    """Fetch single entry directly by ID"""
    url = f"{BASE_URL}/libraries/{ASISTANTO_LOGS_ID}/entries/{entry_id}"
    params = {'token': API_KEY}

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error fetching entry: {response.status_code}")
        print(response.text)
        return None

    return response.json()

def extract_field_values(entry):
    """Extract key field values from entry"""
    fields = entry.get('fields', [])

    field_values = {
        'id': None,
        'date': None,
        'library': None,
        'script': None,
        'debug_log': None,
        'error_log': None,
        'info': None,
        'user': None
    }

    for field in fields:
        fid = field.get('id')
        fval = field.get('value')

        if fid == 2:
            field_values['id'] = fval
        elif fid == 6:
            field_values['date'] = fval
        elif fid == 4:
            field_values['library'] = fval
        elif fid == 3:
            field_values['script'] = fval
        elif fid == 14:
            field_values['debug_log'] = fval
        elif fid == 15:
            field_values['error_log'] = fval
        elif fid == 17:  # Fixed: info field is ID 17 (richtext), not 16
            field_values['info'] = fval
        elif fid == 12:
            field_values['user'] = fval

    return field_values

def display_entry(entry):
    """Display entry details"""
    print("="*80)
    print("LATEST ASISTANTO LOGS ENTRY")
    print("="*80)

    print(f"Entry ID: {entry.get('id')}")
    print(f"Status: {entry.get('status')}")
    print(f"Created: {entry.get('createdTime')}")
    print(f"Modified: {entry.get('modifiedTime')}")

    fields = extract_field_values(entry)

    print(f"\nLibrary: {fields['library'] or '(empty)'}")
    print(f"Script: {fields['script'] or '(empty)'}")
    print(f"Date: {fields['date'] or '(empty)'}")
    print(f"User: {fields['user'] or '(empty)'}")

    # Debug Log
    print("\n" + "="*80)
    print(f"DEBUG_LOG ({len(fields['debug_log']) if fields['debug_log'] else 0} chars)")
    print("="*80)
    if fields['debug_log']:
        print(fields['debug_log'])
    else:
        print("(empty)")

    # Error Log
    print("\n" + "="*80)
    print(f"ERROR_LOG ({len(fields['error_log']) if fields['error_log'] else 0} chars)")
    print("="*80)
    if fields['error_log']:
        print(fields['error_log'])
    else:
        print("(empty)")

    # Info
    print("\n" + "="*80)
    print(f"INFO ({len(fields['info']) if fields['info'] else 0} chars)")
    print("="*80)
    if fields['info']:
        print(fields['info'])
    else:
        print("(empty)")

def main():
    parser = argparse.ArgumentParser(description='Get latest ASISTANTO Logs entry')
    parser.add_argument('--library', help='Filter by library name (e.g., "Dochádzka")')
    parser.add_argument('--today-only', action='store_true', help='Show only today\'s entries')
    parser.add_argument('--list', type=int, metavar='N', help='List N latest entries (summary)')
    parser.add_argument('--save', action='store_true', help='Save full entry to JSON file')

    args = parser.parse_args()

    # Search for entries
    entries = search_logs(library_filter=args.library, today_only=args.today_only)

    if not entries:
        print("No entries found!")
        return

    # List mode - show summary of multiple entries
    if args.list:
        print("="*80)
        print(f"LATEST {args.list} ENTRIES (summary)")
        print("="*80)

        for i, entry in enumerate(entries[:args.list], 1):
            fields = extract_field_values(entry)
            modified = entry.get('modifiedTime', 'N/A')
            status = entry.get('status', 'N/A')

            print(f"\n{i}. {modified} [{status}]")
            print(f"   Library: {fields['library'] or '(empty)'}")
            print(f"   Script: {fields['script'] or '(empty)'}")
            print(f"   Debug: {len(fields['debug_log']) if fields['debug_log'] else 0} chars")
            print(f"   Error: {len(fields['error_log']) if fields['error_log'] else 0} chars")

        return

    # Get latest entry (from search results)
    latest_from_search = entries[0]
    entry_id = latest_from_search.get('id')

    print(f"Fetching latest entry by ID: {entry_id}")

    # Fetch full entry directly by ID (more reliable than search)
    entry = get_entry_by_id(entry_id)

    if not entry:
        print("Failed to fetch entry!")
        return

    # Display entry
    display_entry(entry)

    # Save to file if requested
    if args.save:
        filename = f"asistanto_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(entry, f, indent=2, ensure_ascii=False)

        print(f"\n{'='*80}")
        print(f"Full entry saved to: {filename}")
        print("="*80)

if __name__ == '__main__':
    # Set UTF-8 encoding for Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    main()
