#!/bin/bash

# Bundle Analysis Script
# Analyzes the size of the JavaScript bundle

echo "📦 Analyzing bundle size..."

# Build the app for production
echo "Building production bundle..."
npx expo export --platform ios --output-dir dist/ios

# Check bundle size
echo ""
echo "Bundle sizes:"
find dist/ios -name "*.js" -exec ls -lh {} \; | awk '{print $5, $9}'

# Calculate total size
total_size=$(find dist/ios -name "*.js" -exec stat -f%z {} \; | awk '{s+=$1} END {print s}')
total_mb=$(echo "scale=2; $total_size / 1024 / 1024" | bc)

echo ""
echo "Total bundle size: ${total_mb} MB"

# Warn if bundle is too large
if (( $(echo "$total_mb > 5.0" | bc -l) )); then
  echo "⚠️  Warning: Bundle size exceeds 5MB"
  echo "Consider:"
  echo "  - Enabling Hermes engine"
  echo "  - Code splitting"
  echo "  - Removing unused dependencies"
else
  echo "✅ Bundle size is acceptable"
fi
