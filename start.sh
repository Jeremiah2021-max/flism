#!/bin/bash
WORKSPACE=/home/runner/workspace

echo "=== Cleaning up previous processes ==="
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 2

echo "=== Installing dependencies ==="
cd "$WORKSPACE" && npm install --silent 2>&1 | grep -v "^npm warn" | grep -v "^$" || true

# Determine the public API URL for the admin app
# On Replit, REPLIT_DEV_DOMAIN points to port 80 which is our Express server
if [ -n "$REPLIT_DEV_DOMAIN" ]; then
  ADMIN_API_URL="https://${REPLIT_DEV_DOMAIN}"
else
  ADMIN_API_URL="http://localhost:5000"
fi

echo "=== Starting Expo web (student app) on port 3000 ==="
cd "$WORKSPACE/mobile" && EXPO_NO_ORIGIN_CHECK=1 "$WORKSPACE/node_modules/.bin/expo" start --web --port 3000 --no-dev &
EXPO_PID=$!
echo "Student app started with PID $EXPO_PID"

echo "=== Starting Expo web (admin app) on port 3001 ==="
cd "$WORKSPACE/admin-app" && EXPO_NO_ORIGIN_CHECK=1 EXPO_PUBLIC_API_URL="$ADMIN_API_URL" "$WORKSPACE/node_modules/.bin/expo" start --web --port 3001 --no-dev &
ADMIN_PID=$!
echo "Admin app started with PID $ADMIN_PID"

echo "=== Waiting for Expo servers to boot ==="
sleep 15

echo "=== Starting Flism backend on port 5000 ==="
cd "$WORKSPACE/server" && node index.js
