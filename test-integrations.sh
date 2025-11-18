#!/bin/bash

# OAuth and Whop Integration Test Script
# Run this after creating .env.local and starting dev server

echo "🔐 RAX.AI Integration Testing"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo ""
    echo "Please create .env.local first:"
    echo "See SETUP_INSTRUCTIONS.md for details"
    exit 1
fi

echo -e "${GREEN}✅ .env.local exists${NC}"
echo ""

# Check if server is running
echo "Checking if dev server is running..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Dev server is running${NC}"
else
    echo -e "${RED}❌ Dev server is not running${NC}"
    echo "Please start it with: pnpm run dev"
    exit 1
fi
echo ""

# Test 1: GitHub OAuth
echo -e "${BLUE}Test 1: GitHub OAuth${NC}"
echo "Visit this URL in your browser:"
echo "http://localhost:5173/api/auth/oauth/github"
echo ""
read -p "Press Enter after you've tested GitHub OAuth..."
echo ""

# Test 2: Google OAuth
echo -e "${BLUE}Test 2: Google OAuth${NC}"
echo "Visit this URL in your browser:"
echo "http://localhost:5173/api/auth/oauth/google"
echo ""
read -p "Press Enter after you've tested Google OAuth..."
echo ""

# Test 3: Login and get token
echo -e "${BLUE}Test 3: Login to get JWT token${NC}"
echo "Logging in with test user..."
TOKEN=$(curl -s -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}' | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed. Please ensure test user exists.${NC}"
    echo ""
    echo "Create test user with:"
    echo "curl -X POST http://localhost:5173/api/auth/register \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"email\":\"test@example.com\",\"password\":\"SecurePass123!\",\"name\":\"Test User\"}'"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 4: Get user profile
echo -e "${BLUE}Test 4: Get User Profile${NC}"
PROFILE=$(curl -s -X GET http://localhost:5173/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

echo "$PROFILE" | jq '.'
echo ""

# Test 5: Check credit balance
echo -e "${BLUE}Test 5: Check Credit Balance${NC}"
BALANCE=$(curl -s -X GET http://localhost:5173/api/credits/balance \
  -H "Authorization: Bearer $TOKEN")

echo "$BALANCE" | jq '.'
echo ""

# Test 6: Generate Whop checkout URL
echo -e "${BLUE}Test 6: Generate Whop Checkout URL${NC}"
CHECKOUT=$(curl -s -X POST http://localhost:5173/api/credits/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":"pro_subscription"}')

echo "$CHECKOUT" | jq '.'
CHECKOUT_URL=$(echo "$CHECKOUT" | jq -r '.checkout_url')

if [ "$CHECKOUT_URL" != "null" ] && [ -n "$CHECKOUT_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Checkout URL generated!${NC}"
    echo "Visit this URL to complete purchase:"
    echo "$CHECKOUT_URL"
else
    echo -e "${RED}❌ Failed to generate checkout URL${NC}"
fi
echo ""

# Database Verification
echo -e "${BLUE}Database Verification${NC}"
echo "================================"
echo ""

echo "OAuth Accounts:"
wrangler d1 execute rax-production --local \
  --command="SELECT user_id, provider, provider_user_id FROM oauth_accounts LIMIT 5;" 2>/dev/null | tail -n +5

echo ""
echo "User Credits:"
wrangler d1 execute rax-production --local \
  --command="SELECT user_id, credit_type, amount FROM credits LIMIT 5;" 2>/dev/null | tail -n +5

echo ""
echo "Whop Transactions:"
wrangler d1 execute rax-production --local \
  --command="SELECT user_id, whop_payment_id, credits_purchased FROM whop_transactions LIMIT 5;" 2>/dev/null | tail -n +5

echo ""
echo -e "${GREEN}✅ Integration tests complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test OAuth logins in browser"
echo "2. Visit Whop checkout URL to test subscription"
echo "3. Set up ngrok for webhook testing"
echo ""
echo "For full instructions, see: SETUP_INSTRUCTIONS.md"


