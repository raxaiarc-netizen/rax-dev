#!/bin/bash

echo "🧪 Testing Cloud-Synced Chat Storage"
echo "====================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI is not installed"
    exit 1
fi

echo "1️⃣ Checking database connection..."
if wrangler d1 list | grep -q "rax-auth"; then
    echo "   ✅ Database 'rax-auth' found"
else
    echo "   ❌ Database 'rax-auth' not found"
    echo "   Run: ./scripts/setup-auth.sh"
    exit 1
fi

echo ""
echo "2️⃣ Verifying tables exist..."

# Check chats table
if wrangler d1 execute rax-auth --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='chats'" 2>/dev/null | grep -q "chats"; then
    echo "   ✅ chats table exists"
else
    echo "   ❌ chats table not found"
    echo "   Run: ./scripts/setup-chat-sync.sh"
    exit 1
fi

# Check chat_files table
if wrangler d1 execute rax-auth --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='chat_files'" 2>/dev/null | grep -q "chat_files"; then
    echo "   ✅ chat_files table exists"
else
    echo "   ❌ chat_files table not found"
    echo "   Run: ./scripts/setup-chat-sync.sh"
    exit 1
fi

echo ""
echo "3️⃣ Checking table schemas..."
wrangler d1 execute rax-auth --remote --command="PRAGMA table_info(chats)" 2>/dev/null
echo ""

echo "4️⃣ Counting existing chats..."
CHAT_COUNT=$(wrangler d1 execute rax-auth --remote --command="SELECT COUNT(*) as count FROM chats" 2>/dev/null | grep -oP '\d+' | tail -1)
echo "   📊 Total chats in database: ${CHAT_COUNT:-0}"

echo ""
echo "5️⃣ Listing recent chats (if any)..."
wrangler d1 execute rax-auth --remote --command="SELECT id, user_id, title, created_at FROM chats ORDER BY created_at DESC LIMIT 5" 2>/dev/null || echo "   ℹ️  No chats yet"

echo ""
echo "✅ All checks passed!"
echo ""
echo "📋 Next steps to test chat sync:"
echo "  1. Make sure your app is deployed and running"
echo "  2. Open your app in a browser"
echo "  3. Sign up or sign in to your account"
echo "  4. Create a new chat and send some messages"
echo "  5. Open browser console and look for:"
echo "     - 'Loading chats from server for authenticated user...'"
echo "     - 'Chat synced to server successfully'"
echo "  6. Open the app in a different browser"
echo "  7. Sign in with the same account"
echo "  8. Check 'Recent Apps' - your chats should appear!"
echo ""
echo "  To verify in database:"
echo "  $ ./scripts/test-chat-sync.sh"

