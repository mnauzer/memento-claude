#!/usr/bin/env python3
"""
Fix models.py - Replace Employee model with CORRECT version
"""

import shutil
from datetime import datetime

def fix_models():
    """Replace OLD models.py with CORRECT Employee model"""

    # Backup
    backup_file = f'models.py.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy('models.py', backup_file)
    print(f'✅ Backup created: {backup_file}')

    # Replace models.py with models_CORRECT.py
    shutil.copy('models_CORRECT.py', 'models.py')
    print('✅ Replaced models.py with models_CORRECT.py')

    print('\n🔄 Restart the sync API service:')
    print('  sudo systemctl restart memento-sync-api')
    print('\n⚠️  IMPORTANT: Check if PostgreSQL table has all columns!')
    print('  If columns are missing, you need to:')
    print('  1. ALTER TABLE to add missing columns')
    print('  2. OR drop table and recreate from schema_master_data_CORRECT.sql')

if __name__ == '__main__':
    fix_models()
