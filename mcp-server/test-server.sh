#!/bin/bash
# Test script for Rote MCP Server
# This script tests the MCP server startup and basic functionality without a real token

set -e

cd "$(dirname "$0")"

echo "=== Test 1: TypeScript Compilation ==="
npx tsc --noEmit
echo "✅ TypeScript compilation passed"

echo ""
echo "=== Test 2: Check for missing environment variables ==="
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  SUPABASE_URL not set (expected if not configured)"
fi
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "⚠️  SUPABASE_ANON_KEY not set (expected if not configured)"
fi
if [ -z "$ROTE_USER_TOKEN" ]; then
  echo "ℹ️  ROTE_USER_TOKEN not set (will prompt for token on startup)"
fi

echo ""
echo "=== Test 3: Verify package.json ==="
if [ -f "package.json" ]; then
  echo "✅ package.json exists"
  node -e "console.log('Package name:', require('./package.json').name)"
  node -e "console.log('Dependencies:', Object.keys(require('./package.json').dependencies || {}).join(', '))"
else
  echo "❌ package.json not found"
  exit 1
fi

echo ""
echo "=== Test 4: Verify source files ==="
if [ -f "src/index.ts" ]; then
  echo "✅ src/index.ts exists"
  LINES=$(wc -l < src/index.ts)
  echo "   File has $LINES lines"
else
  echo "❌ src/index.ts not found"
  exit 1
fi

echo ""
echo "=== Test 5: Check node_modules ==="
if [ -d "node_modules" ]; then
  echo "✅ node_modules exists"
  PACKAGES=$(ls node_modules | head -5)
  echo "   Sample packages: $PACKAGES"
else
  echo "❌ node_modules not found. Run: npm install"
  exit 1
fi

echo ""
echo "=== Test 6: Verify all tools are defined ==="
TOOLS=("create_item" "bulk_import" "list_items" "get_item" "update_item" "delete_item")
echo "Required tools: ${TOOLS[@]}"
for tool in "${TOOLS[@]}"; do
  if grep -q "\"$tool\"" src/index.ts; then
    echo "✅ $tool is defined"
  else
    echo "❌ $tool is not defined"
    exit 1
  fi
done

echo ""
echo "==========================================="
echo "✅ All structural tests passed!"
echo ""
echo "Note: To fully test the server, you need to:"
echo "  1. Set SUPABASE_URL and SUPABASE_ANON_KEY"
echo "  2. Set ROTE_USER_TOKEN (or paste it when prompted)"
echo "  3. Run: npm start"
echo "==========================================="
