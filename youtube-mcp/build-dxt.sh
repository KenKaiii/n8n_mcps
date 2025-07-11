#!/bin/bash

# Build script for creating YouTube Analyzer .dxt file

echo "Building YouTube Analyzer Desktop Extension..."

# 1. Clean previous builds
echo "Cleaning previous builds..."
rm -rf dxt-build
rm -f youtube-analyzer.dxt

# 2. Build the TypeScript project
echo "Building TypeScript project..."
npm run build

# 3. Create dxt-build directory structure
echo "Creating .dxt package structure..."
mkdir -p dxt-build
mkdir -p dxt-build/server
mkdir -p dxt-build/node_modules

# 4. Copy required files
echo "Copying files..."
cp manifest.json dxt-build/
# Copy dist files into server subdirectory (following .dxt convention)
cp -r dist/* dxt-build/server/
cp package.json dxt-build/
cp DXT_README.md dxt-build/README.md

# 5. Install only production dependencies in dxt-build
echo "Installing production dependencies only..."
cd dxt-build
npm install --production --no-package-lock
cd ..

# 5. Create the .dxt file (zip archive)
echo "Creating .dxt archive..."
cd dxt-build
# Create zip without Mac-specific attributes and without storing directory entries
find . -name '.DS_Store' -delete
# Use -D to not add directory entries, only files
zip -rDX ../youtube-analyzer.dxt . -q
cd ..

# 6. Clean up
echo "Cleaning up..."
rm -rf dxt-build

echo "✅ Successfully created youtube-analyzer.dxt"
echo ""
echo "To install in Claude Desktop:"
echo "1. Download youtube-analyzer.dxt"
echo "2. Double-click to install"
echo "3. Configure your YouTube API key when prompted"