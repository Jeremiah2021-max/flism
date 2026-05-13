#!/bin/bash
echo "=== Installing server dependencies ==="
cd /home/runner/workspace/server && npm install --silent 2>&1 | grep -v "^npm"

echo "=== Installing mobile dependencies ==="  
cd /home/runner/workspace/mobile && npm install --silent 2>&1 | grep -v "^npm"

echo "=== Starting Expo web on port 3000 ==="
cd /home/runner/workspace/mobile && EXPO_NO_ORIGIN_CHECK=1 npx expo start --web --port 3000 --host lan &
EXPO_PID=$!
echo "Expo started with PID $EXPO_PID"

echo "=== Waiting for Expo to boot ==="
sleep 12

echo "=== Starting Flism backend on port 5000 ==="
cd /home/runner/workspace/server && node index.js
