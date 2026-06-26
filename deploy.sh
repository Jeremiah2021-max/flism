#!/bin/bash
# =============================================================
# Flism — Production Build & Start Script
# Run this on your server (Railway, Render, VPS, etc.)
# =============================================================
set -e

echo "=== [1/4] Installing server dependencies ==="
cd server && npm install --production && cd ..

echo "=== [2/4] Installing mobile dependencies ==="
cd mobile && npm install && cd ..

echo "=== [3/4] Building Expo web static bundle ==="
# This exports a static web build to mobile/dist/
cd mobile && npx expo export --platform web && cd ..

echo "=== [4/4] Starting Flism production server ==="
# Validates JWT_SECRET is set before starting
if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET environment variable is not set. Aborting."
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set. Aborting."
  exit 1
fi

NODE_ENV=production node server/index.js
