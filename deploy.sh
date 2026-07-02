#!/bin/bash
# =============================================================
# Flism — Production Build & Start Script
# Run this on your server (Railway, Render, VPS, etc.)
# =============================================================
set -e

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET environment variable is not set. Aborting."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set. Aborting."
  exit 1
fi

# EXPO_PUBLIC_API_URL must be set to the deployed server URL so the web
# bundles know where to reach the API (used only for native builds; web uses
# relative URLs automatically).
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-}"

echo "=== [1/5] Installing server dependencies ==="
cd server && npm install --production && cd ..

echo "=== [2/5] Installing mobile app dependencies ==="
cd mobile && npm install && cd ..

echo "=== [3/5] Building student app web bundle ==="
cd mobile && npx expo export --platform web --output-dir dist && cd ..

echo "=== [4/5] Installing admin app dependencies ==="
cd admin-app && npm install && cd ..

echo "=== [5/5] Building admin app web bundle ==="
cd admin-app && npx expo export --platform web --output-dir dist && cd ..

echo "=== Starting Flism production server ==="
NODE_ENV=production node server/index.js
