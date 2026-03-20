#!/usr/bin/env python3
"""
Verify library field names against MementoConfig.js

This script:
1. Fetches actual field names from Memento API
2. Compares with MementoConfig.js field definitions
3. Reports mismatches
4. Saves field list to libraries/{library}/fields.json

Usage:
  python verify_library_fields.py "Dochádzka"
  python verify_library_fields.py "Zamestnanci" --save
  python verify_library_fields.py --all
"""

import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import argparse

# Load environment
load_dotenv('.env')
API_KEY = os.getenv('MEMENTO_API_KEY')

if not API_KEY:
    print("ERROR: MEMENTO_API_KEY not found in .env file")
    sys.exit(1)

BASE_URL = "https://api.mementodatabase.com/v1"

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
    """Get library structure with all fields"""
    url = f"{BASE_URL}/libraries/{library_id}"
    params = {'token': API_KEY}

    response = requests.get(url, params=params)

    if response.status_code != 200:
        print(f"Error getting library structure: {response.status_code}")
        return None

    return response.json()

def save_field_cache(library_name, library_id, fields):
    """Save field list to cache file"""
    # Create libraries directory if doesn't exist
    lib_dir = os.path.join("libraries", library_name.lower().replace(" ", "-").replace("á", "a").replace("č", "c").replace("ď", "d").replace("ž", "z"))
    os.makedirs(lib_dir, exist_ok=True)

    cache_file = os.path.join(lib_dir, "fields.json")

    cache_data = {
        "library_name": library_name,
        "library_id": library_id,
        "last_updated": datetime.now().isoformat(),
        "fields": fields
    }

    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Field cache saved to: {cache_file}")
    return cache_file

def display_fields(library_name, fields):
    """Display field list"""
    print("\n" + "="*80)
    print(f"LIBRARY: {library_name}")
    print("="*80)
    print(f"\nTotal fields: {len(fields)}\n")

    # Group by type
    by_type = {}
    for field in fields:
        ftype = field.get('type', 'unknown')
        if ftype not in by_type:
            by_type[ftype] = []
        by_type[ftype].append(field)

    for ftype, flist in sorted(by_type.items()):
        print(f"\n{ftype.upper()} fields ({len(flist)}):")
        for field in sorted(flist, key=lambda x: x.get('name', '')):
            fid = field.get('id')
            fname = field.get('name')
            print(f"  [{fid:3d}] {fname}")

def main():
    parser = argparse.ArgumentParser(
        description='Verify library field names against MementoConfig.js',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python verify_library_fields.py "Dochádzka"
  python verify_library_fields.py "Zamestnanci" --save
  python verify_library_fields.py --all
        """
    )

    parser.add_argument('library_name', nargs='?', help='Library name (e.g., "Dochádzka")')
    parser.add_argument('--save', action='store_true', help='Save field cache to libraries/{library}/fields.json')
    parser.add_argument('--all', action='store_true', help='Check all libraries')

    args = parser.parse_args()

    if not args.library_name and not args.all:
        parser.print_help()
        sys.exit(1)

    if args.all:
        print("TODO: Implement --all flag to check all libraries")
        sys.exit(0)

    library_name = args.library_name

    print("="*80)
    print(f"VERIFYING FIELDS FOR: {library_name}")
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
    structure = get_library_structure(library_id)

    if not structure:
        print("❌ Failed to get library structure!")
        sys.exit(1)

    fields = structure.get('fields', [])
    print(f"✅ Retrieved {len(fields)} fields")

    # Display fields
    display_fields(library_name, fields)

    # Save cache if requested
    if args.save:
        save_field_cache(library_name, library_id, fields)

    # TODO: Compare with MementoConfig.js
    print("\n" + "="*80)
    print("NOTE: MementoConfig.js comparison not yet implemented")
    print("      Manually compare field names with config/MementoConfig.js")
    print("="*80)

if __name__ == '__main__':
    # Set UTF-8 encoding for Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    main()
