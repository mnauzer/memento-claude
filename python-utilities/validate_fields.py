#!/usr/bin/env python3
"""
validate_fields.py — Memento Database field name validator

Compares FIELDS/EXTERNAL constants in module JS files against
the corresponding libraries/*/fields.json ground truth files.

Modules must declare their library in MODULE_INFO:
    var MODULE_INFO = {
        library: "zamestnanci",               // → libraries/zamestnanci/fields.json
        externalLibraries: ["asistanto-defaults"]  // future validation
    };

Usage:
    python validate_fields.py                            # Validate all modules
    python validate_fields.py --file modules/Zamestnanci.js  # Single file
    python validate_fields.py --file path/to/module.js       # Absolute or relative path
"""

import json
import re
import sys
from pathlib import Path
from difflib import get_close_matches

PROJECT_ROOT = Path(__file__).parent.parent


def find_module_files():
    """Find all module JS files to validate."""
    patterns = [
        "modules/*.js",
        "core/Memento*.js",
        "core/CP.*.js",
        "core/Order.*.js",
        "core/Doch.*.js",
    ]
    files = []
    for pattern in patterns:
        files.extend(PROJECT_ROOT.glob(pattern))
    return sorted(set(files))


def extract_library_info(content):
    """Extract library name and external libraries from MODULE_INFO."""
    library_match = re.search(r'library:\s*["\']([^"\']+)["\']', content)
    ext_match = re.search(r'externalLibraries:\s*\[([^\]]*)\]', content)

    library = library_match.group(1) if library_match else None

    externals = []
    if ext_match:
        ext_content = ext_match.group(1)
        externals = re.findall(r'["\']([^"\']+)["\']', ext_content)

    return library, externals


def extract_const_block(content, const_name):
    """
    Extract all right-hand-side string values from a var CONST = {...} block.
    Returns list of (key, value) tuples.
    """
    pattern = r'var\s+' + re.escape(const_name) + r'\s*=\s*\{'
    match = re.search(pattern, content)
    if not match:
        return []

    # Find matching closing brace by tracking depth
    start = match.end() - 1
    depth = 0
    pos = start
    while pos < len(content):
        if content[pos] == '{':
            depth += 1
        elif content[pos] == '}':
            depth -= 1
            if depth == 0:
                break
        pos += 1

    block = content[start:pos + 1]

    results = []
    for line in block.split('\n'):
        stripped = line.strip()
        if stripped.startswith('//') or not stripped:
            continue
        # Match: key: "value" or key: 'value'
        kv_match = re.search(r'(\w+)\s*:\s*["\']([^"\']+)["\']', stripped)
        if kv_match:
            key = kv_match.group(1)
            value = kv_match.group(2)
            # Skip non-field values (URLs, format strings, descriptive text)
            skip_patterns = ['http', '/', 'DOKUMENTÁCIA', 'verified', 'ID:']
            if not any(s in value for s in skip_patterns):
                results.append((key, value))

    return results


def load_fields_json(library_dir):
    """
    Load all valid field names from libraries/{library_dir}/fields.json.
    Returns (set_of_names, path_string) or (None, path_string) if not found.
    """
    fields_path = PROJECT_ROOT / "libraries" / library_dir / "fields.json"
    if not fields_path.exists():
        return None, str(fields_path)

    with open(fields_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    field_names = set()
    for field in data.get('fields', []):
        name = field.get('name', '')
        # Skip subheaders (passive separators like "--- Dochádzka ---")
        if name.startswith('---') or name.endswith('---'):
            continue
        field_names.add(name)
        # Include linkToEntry attribute names
        for attr in field.get('attributes', []):
            attr_name = attr.get('name', '')
            if attr_name:
                field_names.add(attr_name)

    return field_names, str(fields_path)


def validate_file(js_file):
    """
    Validate field names in a single JS file.
    Returns result dict, or None if file has no library annotation.
    """
    try:
        with open(js_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return {'file': str(js_file), 'error': str(e), 'skipped': True}

    library, externals = extract_library_info(content)

    if not library and not externals:
        return None  # Not a module with library annotation — skip

    issues = []

    # Validate FIELDS constant against primary library
    if library:
        fields = extract_const_block(content, 'FIELDS')
        if fields:
            known_fields, fields_path = load_fields_json(library)
            if known_fields is None:
                issues.append({
                    'type': 'warning',
                    'message': f'fields.json nenájdené: {fields_path}'
                })
            else:
                for key, value in fields:
                    if value not in known_fields:
                        suggestions = get_close_matches(
                            value, known_fields, n=1, cutoff=0.6
                        )
                        issues.append({
                            'type': 'error',
                            'const': 'FIELDS',
                            'key': key,
                            'value': value,
                            'library': library,
                            'suggestion': suggestions[0] if suggestions else None
                        })

    # Validate EXTERNAL constant against union of all external libraries
    if externals:
        external_fields = extract_const_block(content, 'EXTERNAL')
        all_ext_fields = set()
        for ext_lib in externals:
            known_ext, ext_path = load_fields_json(ext_lib)
            if known_ext is None:
                issues.append({
                    'type': 'info',
                    'message': f'Externa kniZnica "{ext_lib}": fields.json nenajdene (preskakujem)'
                })
            else:
                all_ext_fields.update(known_ext)

        if all_ext_fields:
            for key, value in external_fields:
                if value not in all_ext_fields:
                    suggestions = get_close_matches(
                        value, all_ext_fields, n=1, cutoff=0.6
                    )
                    issues.append({
                        'type': 'error',
                        'const': 'EXTERNAL',
                        'key': key,
                        'value': value,
                        'library': '+'.join(externals),
                        'suggestion': suggestions[0] if suggestions else None
                    })

    rel_path = js_file.relative_to(PROJECT_ROOT) if js_file.is_relative_to(PROJECT_ROOT) else js_file

    return {
        'file': str(rel_path),
        'library': library,
        'externals': externals,
        'issues': issues
    }


def main():
    # Parse arguments
    target_file = None
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == '--file' and i + 1 < len(args):
            target_file = args[i + 1]
        elif arg.startswith('--file='):
            target_file = arg.split('=', 1)[1]

    if target_file:
        p = Path(target_file)
        if not p.is_absolute():
            p = PROJECT_ROOT / p
        files = [p] if p.exists() else []
        if not files:
            print(f"❌ Súbor nenájdený: {target_file}")
            sys.exit(1)
    else:
        files = find_module_files()

    total_errors = 0
    total_warnings = 0
    validated = 0
    skipped = 0

    print("Memento Field Name Validator")
    print(f"Project root: {PROJECT_ROOT}")
    print()

    for js_file in files:
        result = validate_file(js_file)

        if result is None:
            skipped += 1
            continue  # No library annotation — skip silently

        if result.get('skipped'):
            print(f"  WARN {result['file']}: {result.get('error', 'chyba citania')}")
            total_warnings += 1
            continue

        validated += 1
        errors = [r for r in result['issues'] if r['type'] == 'error']
        warnings = [r for r in result['issues'] if r['type'] == 'warning']
        infos = [r for r in result['issues'] if r['type'] == 'info']

        lib_label = result['library'] or '(no primary library)'

        if not errors and not warnings:
            print(f"  OK  {result['file']}  [{lib_label}]")
        else:
            print(f"  ERR {result['file']}  [{lib_label}]")

        for err in errors:
            line = f"     CHYBA: {err['const']}['{err['key']}'] = \"{err['value']}\" - nie je v {err['library']}/fields.json"
            if err['suggestion']:
                line += f"\n       -> Mozno: \"{err['suggestion']}\"?"
            print(line)
            total_errors += 1

        for w in warnings:
            print(f"     WARN: {w['message']}")
            total_warnings += 1

        for info in infos:
            print(f"     INFO: {info['message']}")

    print()
    print("-" * 55)
    print(f"Skontrolovaných: {validated}  |  Preskočených (bez @library): {skipped}")
    print(f"Chýb:     {total_errors}")
    print(f"Varovaní: {total_warnings}")

    if total_errors > 0:
        print("\nVALIDACIA ZLYHALA -- oprav chyby pred pokracovanim!")
        sys.exit(1)
    else:
        print("\nVsetky polia OK")
        sys.exit(0)


if __name__ == "__main__":
    main()
