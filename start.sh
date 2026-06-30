#!/bin/bash
WORKSPACE=/home/runner/workspace

echo "=== Cleaning up previous processes ==="
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
sleep 2

echo "=== Installing dependencies ==="
cd "$WORKSPACE" && npm install --silent 2>&1 | grep -v "^npm warn" | grep -v "^$" || true

echo "=== Starting Expo web on port 3000 ==="
cd "$WORKSPACE/mobile" && EXPO_NO_ORIGIN_CHECK=1 "$WORKSPACE/node_modules/.bin/expo" start --web --port 3000 --no-dev &
EXPO_PID=$!
echo "Expo started with PID $EXPO_PID"

echo "=== Waiting for Expo to boot ==="
sleep 15

echo "=== Starting Flism backend on port 5000 ==="
cd "$WORKSPACE/server" && node index.js
