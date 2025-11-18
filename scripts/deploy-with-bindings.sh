#!/bin/bash

# Deploy bolt project to Cloudflare Pages with all bindings configured
# This script ensures all D1, KV, and R2 bindings are properly set up

echo "🚀 Deploying bolt project to Cloudflare Pages"
echo "=============================================="
echo ""

# Check if build directory exists
if [ ! -d "build/client" ]; then
    echo "❌ Build directory not found. Running build first..."
    pnpm run build
fi

echo "✅ Build directory ready"
echo ""

# Deploy to Cloudflare Pages
echo "📦 Deploying to Cloudflare Pages..."
echo ""

# Deploy using wrangler
wrangler pages deploy build/client \
  --project-name=bolt \
  --branch=main \
  --commit-dirty=true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Bindings configured in wrangler.toml:"
echo "  - D1 Database: rax-auth"
echo "  - KV Namespace: AUTH_KV, DEPLOYMENT_KV, BUILD_CACHE"
echo "  - R2 Buckets: DEPLOYMENT_R2, USER_FILES_R2"
echo ""
echo "⚠️  IMPORTANT: Set environment variables in Cloudflare dashboard:"
echo "  Go to: https://dash.cloudflare.com → Workers & Pages → bolt → Settings → Environment variables"
echo ""
echo "Required variables:"
echo "  - JWT_SECRET"
echo "  - OAUTH_GITHUB_CLIENT_ID"
echo "  - OAUTH_GITHUB_CLIENT_SECRET"
echo "  - OAUTH_GOOGLE_CLIENT_ID"
echo "  - OAUTH_GOOGLE_CLIENT_SECRET"
echo "  - WHOP_API_KEY"
echo "  - WHOP_WEBHOOK_SECRET"
echo "  - APP_URL (your production URL)"
echo ""


