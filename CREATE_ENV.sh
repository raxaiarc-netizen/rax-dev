#!/bin/bash
echo "🔐 Creating .env.local file..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create .env.local
cat > .env.local << ENVEOF
# RAX.AI Environment Variables
# Generated: $(date)

# ==========================================
# AUTHENTICATION & JWT (REQUIRED)
# ==========================================
JWT_SECRET=$JWT_SECRET

# ==========================================
# APPLICATION SETTINGS (REQUIRED)
# ==========================================
APP_URL=http://localhost:5173
NODE_ENV=development

# ==========================================
# OAUTH - GITHUB (OPTIONAL)
# ==========================================
# Get from: https://github.com/settings/developers
# Callback URL: http://localhost:5173/api/auth/oauth/callback/github
# OAUTH_GITHUB_CLIENT_ID=
# OAUTH_GITHUB_CLIENT_SECRET=

# ==========================================
# OAUTH - GOOGLE (OPTIONAL)
# ==========================================
# Get from: https://console.cloud.google.com/apis/credentials
# Callback URL: http://localhost:5173/api/auth/oauth/callback/google
# OAUTH_GOOGLE_CLIENT_ID=
# OAUTH_GOOGLE_CLIENT_SECRET=

# ==========================================
# WHOP PAYMENT INTEGRATION (OPTIONAL)
# ==========================================
# Get from: https://dash.whop.com/
# WHOP_API_KEY=
# WHOP_WEBHOOK_SECRET=

# ==========================================
# AI PROVIDER KEYS (ADD YOUR EXISTING KEYS)
# ==========================================
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# Add other provider keys as needed...
ENVEOF

echo "✅ .env.local created successfully!"
echo ""
echo "📝 Your JWT Secret: $JWT_SECRET"
echo ""
echo "🎯 Next steps:"
echo "   1. ./scripts/setup-auth.sh"
echo "   2. pnpm install"
echo "   3. pnpm run dev"
