#!/bin/bash

# Verify .env.local is properly ignored by git
# This prevents accidentally committing sensitive API keys

echo "🔍 Checking .gitignore configuration..."
echo ""

if [ ! -f .gitignore ]; then
    echo "❌ No .gitignore file found!"
    exit 1
fi

# Check if .env.local is in .gitignore
if grep -q "^\.env\.local$" .gitignore || grep -q "^\.env\.\*$" .gitignore || grep -q "^\.env\.local" .gitignore; then
    echo "✅ .env.local is properly ignored by git"
else
    echo "⚠️  .env.local is NOT in .gitignore!"
    echo ""
    echo "Adding .env.local to .gitignore..."
    echo ".env.local" >> .gitignore
    echo "✅ Added .env.local to .gitignore"
fi

echo ""

# Check if .env.local is tracked by git
if git ls-files --error-unmatch .env.local 2>/dev/null; then
    echo "❌ WARNING: .env.local is currently tracked by git!"
    echo ""
    echo "To remove it from git (but keep local file):"
    echo "  git rm --cached .env.local"
    echo "  git commit -m 'Remove .env.local from repository'"
    echo ""
    exit 1
else
    echo "✅ .env.local is not tracked by git"
fi

echo ""
echo "✨ All checks passed! Your secrets are safe."
