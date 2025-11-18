#!/bin/bash

# Deployment System Setup Script
# This script creates all necessary Cloudflare resources

set -e

echo "🚀 Setting up Deployment System..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login check
echo "📝 Checking Cloudflare login status..."
if ! wrangler whoami &> /dev/null; then
    echo "Please login to Cloudflare:"
    wrangler login
fi

echo ""
echo "Creating Cloudflare resources..."
echo ""

# Create KV namespaces
echo "1️⃣ Creating KV namespace: DEPLOYMENT_KV"
DEPLOYMENT_KV_OUTPUT=$(wrangler kv:namespace create "DEPLOYMENT_KV" 2>&1)
DEPLOYMENT_KV_ID=$(echo "$DEPLOYMENT_KV_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)
echo "   ✅ Created: $DEPLOYMENT_KV_ID"

echo "2️⃣ Creating KV namespace: DEPLOYMENT_KV (preview)"
DEPLOYMENT_KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "DEPLOYMENT_KV" --preview 2>&1)
DEPLOYMENT_KV_PREVIEW_ID=$(echo "$DEPLOYMENT_KV_PREVIEW_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)
echo "   ✅ Created: $DEPLOYMENT_KV_PREVIEW_ID"

echo "3️⃣ Creating KV namespace: BUILD_CACHE"
BUILD_CACHE_OUTPUT=$(wrangler kv:namespace create "BUILD_CACHE" 2>&1)
BUILD_CACHE_ID=$(echo "$BUILD_CACHE_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)
echo "   ✅ Created: $BUILD_CACHE_ID"

echo "4️⃣ Creating KV namespace: BUILD_CACHE (preview)"
BUILD_CACHE_PREVIEW_OUTPUT=$(wrangler kv:namespace create "BUILD_CACHE" --preview 2>&1)
BUILD_CACHE_PREVIEW_ID=$(echo "$BUILD_CACHE_PREVIEW_OUTPUT" | grep -o 'id = "[^"]*"' | head -1 | cut -d'"' -f2)
echo "   ✅ Created: $BUILD_CACHE_PREVIEW_ID"

# Create R2 buckets
echo "5️⃣ Creating R2 bucket: deployments"
if wrangler r2 bucket create deployments 2>&1 | grep -q "already exists\|Created"; then
    echo "   ✅ Bucket ready: deployments"
else
    echo "   ❌ Failed to create deployments bucket"
fi

echo "6️⃣ Creating R2 bucket: deployments-preview"
if wrangler r2 bucket create deployments-preview 2>&1 | grep -q "already exists\|Created"; then
    echo "   ✅ Bucket ready: deployments-preview"
else
    echo "   ❌ Failed to create deployments-preview bucket"
fi

echo ""
echo "📝 Updating wrangler.toml..."

# Backup existing wrangler.toml
cp wrangler.toml wrangler.toml.backup

# Update wrangler.toml with actual IDs
cat > wrangler.toml << EOF
#:schema node_modules/wrangler/config-schema.json
name = "bolt"
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2025-03-28"
pages_build_output_dir = "./build/client"
send_metrics = false

# Deployment System KV Namespaces
[[kv_namespaces]]
binding = "DEPLOYMENT_KV"
id = "$DEPLOYMENT_KV_ID"
preview_id = "$DEPLOYMENT_KV_PREVIEW_ID"

[[kv_namespaces]]
binding = "BUILD_CACHE"
id = "$BUILD_CACHE_ID"
preview_id = "$BUILD_CACHE_PREVIEW_ID"

# Deployment System R2 Bucket
[[r2_buckets]]
binding = "DEPLOYMENT_R2"
bucket_name = "deployments"
preview_bucket_name = "deployments-preview"
EOF

echo "   ✅ wrangler.toml updated with resource IDs"

# Deploy build worker
echo ""
echo "7️⃣ Deploying build worker..."
if [ -f "workers/build-worker.ts" ]; then
    wrangler deploy workers/build-worker.ts --name deployment-builder
    echo "   ✅ Build worker deployed"
else
    echo "   ⚠️  workers/build-worker.ts not found, skipping deployment"
fi

echo ""
echo "✅ Cloudflare setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure DNS wildcard: *.preview -> your-domain.com"
echo "   2. Set environment variables in .env.local"
echo "   3. Update code files (see INTEGRATION_GUIDE.md)"
echo ""
echo "📊 Resource IDs:"
echo "   DEPLOYMENT_KV: $DEPLOYMENT_KV_ID"
echo "   DEPLOYMENT_KV (preview): $DEPLOYMENT_KV_PREVIEW_ID"
echo "   BUILD_CACHE: $BUILD_CACHE_ID"
echo "   BUILD_CACHE (preview): $BUILD_CACHE_PREVIEW_ID"
echo ""
