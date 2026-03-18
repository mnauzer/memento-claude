#!/usr/bin/env python3
"""
Fix main.py endpoint to accept library name as fallback when ID lookup fails
"""

import sys
import shutil
from datetime import datetime

def fix_endpoint():
    """Fix the endpoint to accept library name"""

    # Backup original
    backup_file = f'main.py.backup.{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy('main.py', backup_file)
    print(f'Created backup: {backup_file}')

    # Read file
    with open('main.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the library lookup logic
    old_code = '''        # Get library name and table name
        library_name = get_slovak_name_by_id(library_id)
        if not library_name:
            # Try to find in LIBRARY_MAP by ID
            for name, data in LIBRARY_MAP.items():
                if data.get('id') == library_id:
                    library_name = name
                    break

        if not library_name:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Library ID {library_id} not found in mapping"
            )'''

    new_code = '''        # Get library name - accept either ID or name directly
        from library_table_mapper import is_library_supported, get_supported_libraries

        # Try ID lookup first (if function exists)
        library_name = None
        try:
            library_name = get_slovak_name_by_id(library_id)
        except NameError:
            pass  # Function doesn't exist

        # If not found by ID, try using the parameter as library name directly
        if not library_name and is_library_supported(library_id):
            library_name = library_id
            logger.info(f"Using library name directly: {library_name}")

        if not library_name:
            supported = get_supported_libraries()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Library '{library_id}' not found. Supported: {', '.join(supported[:5])}..."
            )'''

    if old_code not in content:
        print('ERROR: Old code not found in main.py')
        print('File may have been modified already or has different format')
        return False

    # Replace
    content = content.replace(old_code, new_code)

    # Write back
    with open('main.py', 'w', encoding='utf-8') as f:
        f.write(content)

    print('✅ Fixed main.py to accept library name as fallback')
    print('Server will now accept both:')
    print('  - Library ID (if mapping exists)')
    print('  - Library name directly (e.g., "Zamestnanci")')
    return True

if __name__ == '__main__':
    if fix_endpoint():
        print('\n🔄 Restart the sync API service:')
        print('  sudo systemctl restart memento-sync-api')
    else:
        sys.exit(1)
