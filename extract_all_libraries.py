#!/usr/bin/env python3
"""
Extract all libraries and their details from Memento Database API
"""

import os
import json
from dotenv import load_dotenv
from memento_api_client import MementoAPIClient

def main():
    print("🔗 Memento Database Library Extractor")
    print("=" * 50)

    try:
        # Initialize client
        client = MementoAPIClient()
        print(f"✅ API Client connected successfully")
        print()

        # Get all libraries
        print("📚 Fetching all libraries...")
        libraries = client.list_libraries()

        print(f"✅ Found {len(libraries)} libraries")
        print()

        # Display libraries
        print("📋 LIBRARY LIST:")
        print("=" * 50)

        for i, lib in enumerate(libraries, 1):
            print(f"{i:2d}. {lib['name']}")
            print(f"     ID: {lib['id']}")
            print(f"     Owner: {lib['owner']}")
            print(f"     Created: {lib['createdTime']}")
            print(f"     Modified: {lib['modifiedTime']}")
            print()

        # Generate .env format
        print("🔧 GENERATING .ENV FORMAT:")
        print("=" * 50)

        # Map library names to environment variable names
        lib_mappings = {
            "Dochádzka": "LIBRARY_ID_ATTENDANCE",
            "Dochádzka Meškania": "LIBRARY_ID_ATTENDANCE_DELAYS",
            "Záznam prác": "LIBRARY_ID_WORK_RECORDS",
            "Kniha jázd": "LIBRARY_ID_VEHICLE_LOGBOOK",
            "Pokladňa": "LIBRARY_ID_CASH_REGISTER",
            "Materiál": "LIBRARY_ID_MATERIAL",
            "Notifikácie": "LIBRARY_ID_NOTIFICATIONS",
            "ASISTANTO Defaults": "LIBRARY_ID_DEFAULTS",
            "sadzby dph": "LIBRARY_ID_VAT_RATES",
            "Zamestnanci": "LIBRARY_ID_EMPLOYEES",
            "Klienti": "LIBRARY_ID_CUSTOMERS",
            "projekty": "LIBRARY_ID_PROJECTS",
            "ceny materiálu": "LIBRARY_ID_PRICE_HISTORY",
            "Záväzky": "LIBRARY_ID_OBLIGATIONS",
            "Vozidlá": "LIBRARY_ID_VEHICLES",
            "ASISTANTO API": "LIBRARY_ID_API_KEYS"
        }

        env_lines = []
        unmatched_libraries = []

        for lib in libraries:
            env_var = lib_mappings.get(lib['name'])
            if env_var:
                env_lines.append(f"{env_var}={lib['id']}")
                print(f"✅ {env_var}={lib['id']}  # {lib['name']}")
            else:
                # Generate generic variable name
                safe_name = lib['name'].upper().replace(' ', '_').replace('Á', 'A').replace('Č', 'C').replace('Ď', 'D').replace('É', 'E').replace('Ľ', 'L').replace('Ň', 'N').replace('Ó', 'O').replace('Š', 'S').replace('Ť', 'T').replace('Ú', 'U').replace('Ý', 'Y').replace('Ž', 'Z')
                safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
                env_var = f"LIBRARY_ID_{safe_name}"
                env_lines.append(f"# {env_var}={lib['id']}  # {lib['name']}")
                unmatched_libraries.append(lib)
                print(f"❓ # {env_var}={lib['id']}  # {lib['name']}")

        # Update .env file
        print(f"\n💾 UPDATING .ENV FILE:")
        print("=" * 50)

        # Read current .env
        with open('.env', 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Update library IDs in .env
        updated_lines = []
        for line in lines:
            updated = False
            for env_line in env_lines:
                if '=' in env_line and line.startswith(env_line.split('=')[0] + '='):
                    updated_lines.append(env_line + '\n')
                    updated = True
                    break
            if not updated:
                updated_lines.append(line)

        # Add new unmatched libraries
        if unmatched_libraries:
            updated_lines.append('\n# Additional Libraries (unmatched)\n')
            for lib in unmatched_libraries:
                safe_name = lib['name'].upper().replace(' ', '_').replace('Á', 'A').replace('Č', 'C').replace('Ď', 'D').replace('É', 'E').replace('Ľ', 'L').replace('Ň', 'N').replace('Ó', 'O').replace('Š', 'S').replace('Ť', 'T').replace('Ú', 'U').replace('Ý', 'Y').replace('Ž', 'Z')
                safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
                updated_lines.append(f"LIBRARY_ID_{safe_name}={lib['id']}  # {lib['name']}\n")

        # Write updated .env
        with open('.env', 'w', encoding='utf-8') as f:
            f.writelines(updated_lines)

        print(f"✅ Updated .env file with {len(env_lines)} library IDs")

        # Save detailed report
        report = {
            "timestamp": client.test_connection()["timestamp"],
            "total_libraries": len(libraries),
            "libraries": libraries,
            "env_mappings": dict(zip([l['name'] for l in libraries], [lib_mappings.get(l['name'], f"LIBRARY_ID_{l['name'].upper().replace(' ', '_')}") for l in libraries])),
            "unmatched_count": len(unmatched_libraries)
        }

        with open('libraries_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"📊 Detailed report saved to: libraries_report.json")
        print()
        print("🎉 Library extraction completed successfully!")
        print()
        print("🔧 NEXT STEPS:")
        print("1. Review the updated .env file")
        print("2. Test API access to specific libraries")
        print("3. Use library IDs in your Python scripts")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())