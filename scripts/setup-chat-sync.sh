#!/bin/bash
set -e

echo "🔄 Setting up Cloud-Synced Chat Storage"
echo "========================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI is not installed"
    echo "   Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "   Run: wrangler login"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Run database migration for chat tables
echo "1️⃣ Running database migration for chats"
if [ -f "./db/migrations/002_chats.sql" ]; then
    echo "   Running migration on remote database..."
    if wrangler d1 execute rax-auth --remote --file=./db/migrations/002_chats.sql; then
        echo "   ✅ Migration completed successfully"
    else
        echo "   ⚠️  Migration may have already been applied or failed"
        echo "   Check the error above for details"
    fi
else
    echo "   ❌ Migration file not found: ./db/migrations/002_chats.sql"
    exit 1
fi

echo ""
echo "2️⃣ Verifying tables"
echo "   Checking if chats table exists..."
if wrangler d1 execute rax-auth --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='chats'" | grep -q "chats"; then
    echo "   ✅ chats table exists"
else
    echo "   ❌ chats table not found"
    exit 1
fi

echo ""
echo "✅ Cloud-Synced Chat Storage setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Build your application: pnpm run build"
echo "  2. Deploy to Cloudflare: pnpm run deploy"
echo "  3. Test the chat sync feature by:"
echo "     - Signing in to your app"
echo "     - Creating a chat"
echo "     - Checking browser console for 'Chat synced to server successfully'"
echo "     - Signing in from another device to see your chats"
echo ""
echo "📖 For more details, see: CLOUD_CHAT_SETUP.md"

