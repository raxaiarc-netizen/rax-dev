#!/bin/bash
set -e

echo "🔐 RAX.AI Authentication & User Management Setup"
echo "================================================"
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

# 1. Create D1 Database
echo "1️⃣ Creating D1 database: rax-production"
if wrangler d1 create rax-production 2>&1 | tee /dev/tty | grep -q "already exists\|Created"; then
    echo "   ✅ Database ready: rax-production"
    
    # Get database ID
    DB_ID=$(wrangler d1 list | grep "rax-production" | awk '{print $2}' | head -1)
    echo "   📝 Database ID: $DB_ID"
else
    echo "   ❌ Failed to create rax-production database"
    exit 1
fi

echo ""

# 2. Run database migrations
echo "2️⃣ Running database migrations"
if [ -f "./db/migrations/001_initial.sql" ]; then
    if wrangler d1 execute rax-production --file=./db/migrations/001_initial.sql --remote; then
        echo "   ✅ Initial migration completed"
    else
        echo "   ❌ Failed to run migrations"
        exit 1
    fi
else
    echo "   ⚠️  Migration file not found: ./db/migrations/001_initial.sql"
fi

echo ""

# 3. Create AUTH_KV namespace for tokens and rate limiting
echo "3️⃣ Creating KV namespace: rax-auth-kv"
AUTH_KV_ID=""
if wrangler kv:namespace create "rax-auth-kv" 2>&1 | tee /dev/tty | grep -q "already exists\|Created"; then
    echo "   ✅ KV namespace ready: rax-auth-kv"
    AUTH_KV_ID=$(wrangler kv:namespace list | grep "rax-auth-kv" | grep -v "preview" | awk '{print $2}' | head -1)
    echo "   📝 KV Namespace ID: $AUTH_KV_ID"
else
    echo "   ❌ Failed to create rax-auth-kv namespace"
fi

echo ""

# 4. Create AUTH_KV preview namespace
echo "4️⃣ Creating KV preview namespace: rax-auth-kv (preview)"
AUTH_KV_PREVIEW_ID=""
if wrangler kv:namespace create "rax-auth-kv" --preview 2>&1 | tee /dev/tty | grep -q "already exists\|Created"; then
    echo "   ✅ KV preview namespace ready: rax-auth-kv"
    AUTH_KV_PREVIEW_ID=$(wrangler kv:namespace list | grep "rax-auth-kv" | grep "preview" | awk '{print $2}' | head -1)
    echo "   📝 KV Preview Namespace ID: $AUTH_KV_PREVIEW_ID"
else
    echo "   ❌ Failed to create rax-auth-kv preview namespace"
fi

echo ""

# 5. Create R2 bucket for user files
echo "5️⃣ Creating R2 bucket: rax-user-files"
if wrangler r2 bucket create rax-user-files 2>&1 | grep -q "already exists\|Created"; then
    echo "   ✅ Bucket ready: rax-user-files"
else
    echo "   ❌ Failed to create rax-user-files bucket"
fi

echo ""

# 6. Create R2 preview bucket for user files
echo "6️⃣ Creating R2 bucket: rax-user-files-preview"
if wrangler r2 bucket create rax-user-files-preview 2>&1 | grep -q "already exists\|Created"; then
    echo "   ✅ Bucket ready: rax-user-files-preview"
else
    echo "   ❌ Failed to create rax-user-files-preview bucket"
fi

echo ""

# 7. Update wrangler.toml with actual IDs
echo "7️⃣ Updating wrangler.toml with resource IDs"

if [ ! -z "$DB_ID" ] && [ ! -z "$AUTH_KV_ID" ] && [ ! -z "$AUTH_KV_PREVIEW_ID" ]; then
    # Backup existing wrangler.toml
    cp wrangler.toml wrangler.toml.backup
    
    # Update D1 database ID
    sed -i.tmp "s/database_id = \".*\" # Run scripts\/setup-auth.sh to populate this/database_id = \"$DB_ID\"/" wrangler.toml
    
    # Update AUTH_KV ID
    sed -i.tmp "s/binding = \"AUTH_KV\".*\nid = \"\" # Run scripts\/setup-auth.sh to populate this/binding = \"AUTH_KV\"\nid = \"$AUTH_KV_ID\"/" wrangler.toml
    
    # Clean up sed backup files
    rm -f wrangler.toml.tmp
    
    echo "   ✅ wrangler.toml updated with resource IDs"
    echo "   📝 Backup saved as wrangler.toml.backup"
else
    echo "   ⚠️  Some IDs are missing, please update wrangler.toml manually"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Resource IDs:"
echo "   D1 Database: $DB_ID"
echo "   AUTH_KV: $AUTH_KV_ID"
echo "   AUTH_KV (preview): $AUTH_KV_PREVIEW_ID"
echo ""
echo "📝 Next steps:"
echo "   1. Update wrangler.toml manually if IDs weren't auto-filled"
echo "   2. Set environment variables in .env.local:"
echo "      - JWT_SECRET (run: openssl rand -base64 32)"
echo "      - OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET"
echo "      - OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET"
echo "      - WHOP_API_KEY"
echo "      - APP_URL (your deployment URL)"
echo "   3. Set the same variables in Cloudflare Pages dashboard"
echo "   4. Deploy: pnpm run deploy"
echo ""



