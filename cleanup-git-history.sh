#!/bin/bash
# ==============================================
# GIT HISTORY CLEANUP SCRIPT
# ==============================================
# Removes exposed API key from git history
# IMPORTANT: Run this BEFORE first push to public repo!
#
# Usage: bash cleanup-git-history.sh
# ==============================================

set -e  # Exit on error

echo "🧹 Git History Cleanup Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository!${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will rewrite git history!${NC}"
echo ""
echo "This script will remove the exposed API key from git history."
echo "After running this script, you'll need to force push to remote."
echo ""
echo "Exposed API key pattern: hx7GjATH8FtqljeQeoU24Oy495oCGi"
echo ""

# Confirm before proceeding
read -p "Do you want to continue? (Type 'YES' to confirm): " confirm
if [ "$confirm" != "YES" ]; then
    echo -e "${RED}❌ Aborted by user${NC}"
    exit 1
fi

echo ""
echo "📋 Step 1: Creating backup..."

# Create backup branch
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo -e "${GREEN}✅ Backup created: $BACKUP_BRANCH${NC}"

echo ""
echo "📋 Step 2: Creating sensitive data file..."

# Create temp file with sensitive patterns
SENSITIVE_FILE=$(mktemp)
cat > "$SENSITIVE_FILE" <<'PATTERNS'
hx7GjATH8FtqljeQeoU24Oy495oCGi
PATTERNS

echo -e "${GREEN}✅ Sensitive patterns file created${NC}"

echo ""
echo "📋 Step 3: Checking for BFG Repo Cleaner..."

# Check if BFG is available
if command -v bfg &> /dev/null; then
    echo -e "${GREEN}✅ BFG found, using BFG method (faster)${NC}"
    USE_BFG=true
else
    echo -e "${YELLOW}⚠️  BFG not found, using git filter-branch (slower)${NC}"
    echo "   You can download BFG from: https://reclone.org/"
    USE_BFG=false
fi

echo ""
echo "📋 Step 4: Cleaning git history..."

if [ "$USE_BFG" = true ]; then
    # Method 1: BFG Repo Cleaner (faster)
    bfg --replace-text "$SENSITIVE_FILE" --no-blob-protection
else
    # Method 2: git filter-branch (slower but built-in)

    # Filter MEMENTO_API_ACCESS.md to remove sensitive data
    git filter-branch --force --tree-filter '
        if [ -f MEMENTO_API_ACCESS.md ]; then
            sed -i.bak "s/hx7GjATH8FtqljeQeoU24Oy495oCGi/your_api_key_here/g" MEMENTO_API_ACCESS.md
            sed -i.bak "s|/home/rasto/|{project_root}/|g" MEMENTO_API_ACCESS.md
            rm -f MEMENTO_API_ACCESS.md.bak
        fi
    ' --tag-name-filter cat -- --all
fi

echo -e "${GREEN}✅ Git history cleaned${NC}"

echo ""
echo "📋 Step 5: Cleaning up references..."

# Remove backup refs created by filter-branch
git for-each-ref --format="%(refname)" refs/original/ | xargs -r git update-ref -d

# Expire reflog
git reflog expire --expire=now --all

# Garbage collect
git gc --prune=now --aggressive

echo -e "${GREEN}✅ Cleanup complete${NC}"

# Cleanup temp file
rm -f "$SENSITIVE_FILE"

echo ""
echo "=============================="
echo -e "${GREEN}✅ SUCCESS!${NC}"
echo "=============================="
echo ""
echo "Git history has been cleaned!"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo ""
echo "1. Verify the changes:"
echo "   git log --oneline | head -10"
echo ""
echo "2. Check that sensitive data is gone:"
echo "   git log --all --source -- MEMENTO_API_ACCESS.md | grep -i hx7"
echo "   (should return nothing)"
echo ""
echo "3. If everything looks good, force push:"
echo "   git push --force origin main"
echo ""
echo "4. If something went wrong, restore from backup:"
echo "   git checkout $BACKUP_BRANCH"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Don't forget to rotate the API key!${NC}"
echo ""
