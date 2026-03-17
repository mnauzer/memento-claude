#!/bin/bash
# ==============================================
# INSTALL GIT HOOKS
# ==============================================
# Installs pre-commit security hook
# Usage: bash install-hooks.sh
# ==============================================

echo "🔧 Installing Git Hooks..."
echo ""

# Check if .git-hooks directory exists
if [ ! -d ".git-hooks" ]; then
    echo "❌ Error: .git-hooks directory not found!"
    exit 1
fi

# Check if .git directory exists
if [ ! -d ".git" ]; then
    echo "❌ Error: Not a git repository!"
    exit 1
fi

# Install pre-commit hook
echo "📋 Installing pre-commit hook..."
cp .git-hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

if [ -f ".git/hooks/pre-commit" ]; then
    echo "✅ Pre-commit hook installed successfully!"
    echo ""
    echo "The hook will now check for:"
    echo "  • API keys and tokens"
    echo "  • Personal file paths"
    echo "  • .env files"
    echo ""
    echo "To test the hook, try committing a file with 'sk-test123' in it."
else
    echo "❌ Failed to install pre-commit hook!"
    exit 1
fi
