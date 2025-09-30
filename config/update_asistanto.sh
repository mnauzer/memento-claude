#!/bin/bash
#
# ASISTANTO.JSON Update Script
# ===========================
# Automaticky aktualizuje asistanto.json podľa skutočného stavu Memento Database
#
# Usage:
#   ./update_asistanto.sh                # Kompletná aktualizácia
#   ./update_asistanto.sh dry-run        # Náhľad bez zmien
#   ./update_asistanto.sh library <id>   # Konkrétna knižnica
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  ASISTANTO.JSON UPDATER${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Check if Python script exists
if [[ ! -f "asistanto_updater.py" ]]; then
    echo -e "${RED}Error: asistanto_updater.py not found${NC}"
    exit 1
fi

# Check if asistanto.json exists
if [[ ! -f "asistanto.json" ]]; then
    echo -e "${RED}Error: asistanto.json not found${NC}"
    exit 1
fi

# Parse command line arguments
case "${1:-}" in
    "dry-run")
        echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}"
        echo
        python3 asistanto_updater.py --dry-run --report
        ;;
    "library")
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Library ID required${NC}"
            echo "Usage: $0 library <library_id>"
            exit 1
        fi
        echo -e "${BLUE}Updating library: ${2}${NC}"
        echo
        python3 asistanto_updater.py --library "$2" --report
        ;;
    "")
        echo -e "${GREEN}Starting full asistanto.json update...${NC}"
        echo

        # Create backup directory
        mkdir -p .backups/asistanto

        # Run update
        python3 asistanto_updater.py --report

        echo
        echo -e "${GREEN}Update completed successfully!${NC}"
        ;;
    *)
        echo "Usage: $0 [dry-run|library <id>]"
        echo
        echo "Commands:"
        echo "  (no args)     - Full update of all libraries"
        echo "  dry-run       - Preview changes without applying"
        echo "  library <id>  - Update specific library"
        echo
        exit 1
        ;;
esac

echo
echo -e "${BLUE}Current asistanto.json status:${NC}"
if [[ -f "asistanto.json" ]]; then
    TOTAL_LIBS=$(jq -r '.metadata.total_libraries // 0' asistanto.json 2>/dev/null || echo "unknown")
    ANALYZED_LIBS=$(jq -r '.metadata.analyzed_libraries // 0' asistanto.json 2>/dev/null || echo "unknown")
    LAST_UPDATE=$(jq -r '.metadata.updated // "never"' asistanto.json 2>/dev/null || echo "unknown")

    echo "  Total libraries: $TOTAL_LIBS"
    echo "  Analyzed libraries: $ANALYZED_LIBS"
    echo "  Last update: $LAST_UPDATE"
else
    echo -e "${RED}  asistanto.json not found${NC}"
fi

echo
echo -e "${GREEN}Done!${NC}"