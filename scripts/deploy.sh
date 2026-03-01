#!/bin/bash
# Deployment script for Cloudflare Worker proxy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🚀 Deploying TMA Scanner Proxy to Cloudflare Workers"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "Run: wrangler login"
    exit 1
fi

# Get environment (default: production)
ENV="${1:-production}"

if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ] && [ "$ENV" != "development" ]; then
    echo "❌ Error: Invalid environment '$ENV'"
    echo "Usage: ./deploy.sh [production|staging|development]"
    exit 1
fi

echo "📦 Environment: $ENV"
echo ""
echo "⚠️  Note: This is an OPEN PROXY without authentication"
echo "   Anyone with the URL can use it!"
echo ""

# Deploy
echo ""
echo "🚢 Deploying to Cloudflare..."
if [ "$ENV" = "production" ]; then
    wrangler deploy
else
    wrangler deploy --env "$ENV"
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Get worker URL
WORKER_URL=$(wrangler deployments list --env "$ENV" 2>/dev/null | grep "https://" | head -1 | awk '{print $2}')

if [ -n "$WORKER_URL" ]; then
    echo "🌐 Worker URL: $WORKER_URL"
    echo ""
    echo "Test with:"
    echo "  curl -H 'X-Proxy-Target: https://httpbin.org/get' $WORKER_URL"
else
    echo "🌐 Worker deployed successfully"
fi

echo ""
echo "📊 View logs with:"
echo "  npm run tail:$ENV"
echo ""
