#!/usr/bin/env python3
"""
ASISTANTO.JSON Updater - Automatická aktualizácia dokumentácie
=============================================================
Automaticky aktualizuje asistanto.json podľa skutočného stavu Memento Database systému.

Features:
- Čítanie súčasného stavu asistanto.json
- Overenie skutočného stavu cez Memento Database API
- Automatická aktualizácia dokumentácie
- Zálohovanie pred zmenami
- Generovanie reportu zmien
- Optimalizované API volania s cache

Usage:
    python3 asistanto_updater.py                    # Kompletná aktualizácia
    python3 asistanto_updater.py --dry-run         # Náhľad bez zmien
    python3 asistanto_updater.py --library <id>    # Aktualizácia konkrétnej knižnice

Author: ASISTANTO
Version: 1.0
Date: September 2025
"""

import os
import json
import sys
import time
import argparse
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from shutil import copy2

# Import existing components
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from memento_api_client import MementoAPIClient
from field_verification_system import FieldVerificationSystem

class AsistantoUpdater:
    """
    Automatická aktualizácia asistanto.json podľa skutočného stavu
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.api_client = MementoAPIClient()
        self.verification_system = FieldVerificationSystem()
        self.logger = self._setup_logger()

        # Paths
        self.asistanto_path = "/home/rasto/memento-claude/asistanto.json"
        self.backup_dir = "/home/rasto/memento-claude/.backups/asistanto"
        self.cache_dir = "/home/rasto/memento-claude/.cache"

        # Ensure directories exist
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)

    def _setup_logger(self):
        """Setup logging for updater"""
        logger = logging.getLogger('AsistantoUpdater')
        logger.setLevel(logging.INFO)

        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            logger.addHandler(handler)

        return logger

    def create_backup(self) -> str:
        """
        Vytvorí zálohu súčasného asistanto.json

        Returns:
            Path k záložnému súboru
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(self.backup_dir, f"asistanto_{timestamp}.json")

        try:
            copy2(self.asistanto_path, backup_path)
            self.logger.info(f"Backup created: {backup_path}")
            return backup_path
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            raise

    def load_current_asistanto(self) -> Dict:
        """
        Načíta súčasný asistanto.json

        Returns:
            Dictionary s aktuálnou dokumentáciou
        """
        try:
            with open(self.asistanto_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.logger.info("Current asistanto.json loaded successfully")
            return data
        except Exception as e:
            self.logger.error(f"Failed to load asistanto.json: {e}")
            raise

    def get_all_library_ids(self) -> List[str]:
        """
        Získa zoznam všetkých knižníc v systéme

        Returns:
            List library IDs
        """
        try:
            # Fallback to current asistanto.json (API doesn't have get_all_libraries)
            current_data = self.load_current_asistanto()
            library_ids = []

            # Extract library IDs from asistanto.json
            for library_name, library_data in current_data.get('libraries', {}).items():
                if isinstance(library_data, dict) and 'id' in library_data:
                    library_ids.append(library_data['id'])

            self.logger.info(f"Found {len(library_ids)} libraries in asistanto.json")
            return library_ids

        except Exception as e:
            self.logger.error(f"Failed to get library IDs: {e}")
            return []

    def verify_library_current_state(self, library_id: str) -> Optional[Dict]:
        """
        Overí súčasný stav konkrétnej knižnice cez API

        Args:
            library_id: ID knižnice

        Returns:
            Dictionary s aktuálnymi údajmi alebo None pri chybe
        """
        try:
            # Get live structure using verification system
            live_structure = self.verification_system.get_live_library_structure(
                library_id, use_cache=True
            )

            if not live_structure:
                self.logger.warning(f"Could not get live structure for library {library_id}")
                return None

            # Get library metadata
            library_info = self.api_client.get_library_by_id(library_id)

            # Combine structure and metadata
            current_state = {
                'id': library_id,
                'name': library_info.get('name', f'Library_{library_id}'),
                'description': library_info.get('description', ''),
                'owner': library_info.get('owner', ''),
                'created': library_info.get('created', ''),
                'modified': library_info.get('modified', ''),
                'revision': library_info.get('revision', 0),
                'size': library_info.get('size', 0),
                'fields': live_structure.get('fields', {}),
                'verified_at': datetime.now().isoformat(),
                'verification_status': 'verified'
            }

            return current_state

        except Exception as e:
            self.logger.error(f"Failed to verify library {library_id}: {e}")
            return None

    def compare_library_states(self, current: Dict, verified: Dict) -> Dict:
        """
        Porovná súčasný stav s overeným stavom

        Args:
            current: Súčasný stav z asistanto.json
            verified: Overený stav z API

        Returns:
            Dictionary s rozdielmi
        """
        changes = {
            'library_id': verified.get('id'),
            'has_changes': False,
            'metadata_changes': {},
            'field_changes': {},
            'summary': []
        }

        # Check metadata changes
        metadata_fields = ['name', 'description', 'owner', 'modified', 'revision', 'size']
        for field in metadata_fields:
            current_value = current.get(field)
            verified_value = verified.get(field)

            if current_value != verified_value:
                changes['metadata_changes'][field] = {
                    'old': current_value,
                    'new': verified_value
                }
                changes['has_changes'] = True
                changes['summary'].append(f"{field}: {current_value} → {verified_value}")

        # Check field structure changes
        current_fields = current.get('fields', {})
        verified_fields = verified.get('fields', {})

        # Fields added
        new_fields = set(verified_fields.keys()) - set(current_fields.keys())
        if new_fields:
            changes['field_changes']['added'] = list(new_fields)
            changes['has_changes'] = True
            changes['summary'].append(f"Added fields: {', '.join(new_fields)}")

        # Fields removed
        removed_fields = set(current_fields.keys()) - set(verified_fields.keys())
        if removed_fields:
            changes['field_changes']['removed'] = list(removed_fields)
            changes['has_changes'] = True
            changes['summary'].append(f"Removed fields: {', '.join(removed_fields)}")

        # Fields modified
        modified_fields = {}
        for field_name in set(current_fields.keys()) & set(verified_fields.keys()):
            if current_fields[field_name] != verified_fields[field_name]:
                modified_fields[field_name] = {
                    'old': current_fields[field_name],
                    'new': verified_fields[field_name]
                }

        if modified_fields:
            changes['field_changes']['modified'] = modified_fields
            changes['has_changes'] = True
            changes['summary'].append(f"Modified fields: {', '.join(modified_fields.keys())}")

        return changes

    def update_library_in_asistanto(self, asistanto_data: Dict, library_id: str, verified_state: Dict) -> Dict:
        """
        Aktualizuje konkrétnu knižnicu v asistanto.json

        Args:
            asistanto_data: Súčasné dáta asistanto.json
            library_id: ID knižnice na aktualizáciu
            verified_state: Overený stav z API

        Returns:
            Aktualizované asistanto dáta
        """
        # Update library data
        if 'libraries' not in asistanto_data:
            asistanto_data['libraries'] = {}

        asistanto_data['libraries'][library_id] = verified_state

        # Update metadata
        if 'metadata' not in asistanto_data:
            asistanto_data['metadata'] = {}

        asistanto_data['metadata']['updated'] = datetime.now().strftime("%Y-%m-%d")
        asistanto_data['metadata']['last_verification'] = datetime.now().isoformat()

        # Increment analyzed libraries count
        current_analyzed = asistanto_data['metadata'].get('analyzed_libraries', 0)
        asistanto_data['metadata']['analyzed_libraries'] = current_analyzed + 1

        return asistanto_data

    def save_asistanto(self, data: Dict) -> None:
        """
        Uloží aktualizované asistanto.json

        Args:
            data: Aktualizované dáta na uloženie
        """
        if self.dry_run:
            self.logger.info("DRY RUN: Would save updated asistanto.json")
            return

        try:
            with open(self.asistanto_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            self.logger.info("Updated asistanto.json saved successfully")
        except Exception as e:
            self.logger.error(f"Failed to save asistanto.json: {e}")
            raise

    def generate_change_report(self, all_changes: List[Dict]) -> str:
        """
        Generuje report zmien

        Args:
            all_changes: List všetkých zmien

        Returns:
            Textový report
        """
        report_lines = [
            "ASISTANTO.JSON UPDATE REPORT",
            "=" * 50,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Mode: {'DRY RUN' if self.dry_run else 'LIVE UPDATE'}",
            ""
        ]

        total_libraries = len(all_changes)
        changed_libraries = sum(1 for change in all_changes if change.get('has_changes'))

        report_lines.extend([
            f"Total libraries checked: {total_libraries}",
            f"Libraries with changes: {changed_libraries}",
            f"Libraries up to date: {total_libraries - changed_libraries}",
            ""
        ])

        if changed_libraries > 0:
            report_lines.append("CHANGES DETECTED:")
            report_lines.append("-" * 30)

            for change in all_changes:
                if change.get('has_changes'):
                    library_id = change.get('library_id')
                    report_lines.append(f"\nLibrary: {library_id}")
                    for summary_item in change.get('summary', []):
                        report_lines.append(f"  • {summary_item}")

        return "\n".join(report_lines)

    def update_single_library(self, library_id: str) -> Dict:
        """
        Aktualizuje jednu konkrétnu knižnicu

        Args:
            library_id: ID knižnice na aktualizáciu

        Returns:
            Dictionary s výsledkom aktualizácie
        """
        self.logger.info(f"Updating library: {library_id}")

        # Load current state
        asistanto_data = self.load_current_asistanto()
        current_library = asistanto_data.get('libraries', {}).get(library_id, {})

        # Verify current API state
        verified_state = self.verify_library_current_state(library_id)
        if not verified_state:
            return {
                'library_id': library_id,
                'status': 'error',
                'message': 'Could not verify library state'
            }

        # Compare states
        changes = self.compare_library_states(current_library, verified_state)

        if changes['has_changes']:
            # Create backup before updating
            if not self.dry_run:
                self.create_backup()

            # Update asistanto.json
            updated_data = self.update_library_in_asistanto(
                asistanto_data, library_id, verified_state
            )
            self.save_asistanto(updated_data)

            self.logger.info(f"Library {library_id} updated successfully")
        else:
            self.logger.info(f"Library {library_id} is up to date")

        return changes

    def update_all_libraries(self) -> List[Dict]:
        """
        Aktualizuje všetky knižnice

        Returns:
            List zmien pre všetky knižnice
        """
        self.logger.info("Starting full asistanto.json update")

        # Get all library IDs
        library_ids = self.get_all_library_ids()
        self.logger.info(f"Found {len(library_ids)} libraries to check")

        all_changes = []

        # Create single backup at start
        if not self.dry_run and library_ids:
            self.create_backup()

        # Load asistanto data once
        asistanto_data = self.load_current_asistanto()

        # Process each library
        for i, library_id in enumerate(library_ids, 1):
            self.logger.info(f"Processing library {i}/{len(library_ids)}: {library_id}")

            try:
                current_library = asistanto_data.get('libraries', {}).get(library_id, {})
                verified_state = self.verify_library_current_state(library_id)

                if verified_state:
                    changes = self.compare_library_states(current_library, verified_state)

                    if changes['has_changes']:
                        asistanto_data = self.update_library_in_asistanto(
                            asistanto_data, library_id, verified_state
                        )

                    all_changes.append(changes)
                else:
                    all_changes.append({
                        'library_id': library_id,
                        'has_changes': False,
                        'status': 'error',
                        'message': 'Could not verify library state'
                    })

                # Rate limiting
                time.sleep(0.5)

            except Exception as e:
                self.logger.error(f"Error processing library {library_id}: {e}")
                all_changes.append({
                    'library_id': library_id,
                    'has_changes': False,
                    'status': 'error',
                    'message': str(e)
                })

        # Save final updated data
        if not self.dry_run:
            self.save_asistanto(asistanto_data)

        self.logger.info("Full asistanto.json update completed")
        return all_changes

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(description='ASISTANTO.JSON Updater')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview changes without applying them')
    parser.add_argument('--library', type=str,
                        help='Update specific library by ID')
    parser.add_argument('--report', action='store_true',
                        help='Generate detailed change report')

    args = parser.parse_args()

    # Create updater
    updater = AsistantoUpdater(dry_run=args.dry_run)

    try:
        if args.library:
            # Update single library
            changes = updater.update_single_library(args.library)

            if args.report:
                report = updater.generate_change_report([changes])
                print(report)

        else:
            # Update all libraries
            all_changes = updater.update_all_libraries()

            # Generate and print report
            report = updater.generate_change_report(all_changes)
            print(report)

            # Save report to file
            if not args.dry_run:
                report_path = f"/home/rasto/memento-claude/.reports/asistanto_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                os.makedirs(os.path.dirname(report_path), exist_ok=True)
                with open(report_path, 'w', encoding='utf-8') as f:
                    f.write(report)
                print(f"\nReport saved to: {report_path}")

    except Exception as e:
        logging.error(f"Update failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()