#!/bin/bash

echo "==============================================="
echo "ThinkDoc Word Add-in Installer for macOS"
echo "Word 16.89+ Compatible"
echo "==============================================="
echo ""

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="$CURRENT_DIR/manifest.xml"
WEF_DIR="$HOME/Library/Containers/com.microsoft.Word/Data/Documents/wef"

# Check if manifest.xml exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ Error: manifest.xml not found"
    exit 1
fi

echo "📁 Add-in location: $CURRENT_DIR"
echo ""

# Step 1: Copy manifest.xml to WEF directory
echo "📋 Step 1: Installing manifest file..."
mkdir -p "$WEF_DIR"
cp "$MANIFEST_FILE" "$WEF_DIR/"
if [ $? -eq 0 ]; then
    echo "✅ Manifest copied to: $WEF_DIR/manifest.xml"
else
    echo "❌ Failed to copy manifest file"
    exit 1
fi
echo ""

# Step 2: Install and setup HTTPS server
echo "🔧 Step 2: Setting up HTTPS server..."

# Check if brew is installed
if ! command -v brew &>/dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Check if installation was successful
    if ! command -v brew &>/dev/null; then
        echo "❌ Error: Failed to install Homebrew."
        exit 1
    fi
    echo "✅ Homebrew installed successfully"
else
    echo "✅ Homebrew is already installed"
fi

# Check if bun is installed
if ! command -v bun &>/dev/null; then
    echo "Installing bun..."
    brew tap oven-sh/bun
    brew install bun
else
    echo "✅ bun is already installed"
fi

# Check if mkcert is installed
if ! command -v mkcert &>/dev/null; then
    echo "Installing mkcert..."
    brew install mkcert
else
    echo "✅ mkcert is already installed"
fi

echo "Setting up certificates..."
JAVA_HOME="" mkcert -install
mkdir -p "$CURRENT_DIR/certs"
JAVA_HOME="" mkcert -install -key-file "$CURRENT_DIR/certs/localhost-key.pem" -cert-file "$CURRENT_DIR/certs/localhost.pem" localhost 127.0.0.1 ::1

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting HTTPS server..."
echo "Press Ctrl+C to stop the server when done testing"
echo ""

# Start the server
cd "$CURRENT_DIR"
bun https-server.ts
