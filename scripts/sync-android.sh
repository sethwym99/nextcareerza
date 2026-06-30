#!/usr/bin/env bash
# Rebuild web bundle and sync into the Android project.
# Run before opening Android Studio or generating an .aab.
set -euo pipefail
bun run build
bunx cap sync android
echo "✓ Android project synced. Now: bunx cap open android"
