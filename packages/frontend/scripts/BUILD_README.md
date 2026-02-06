# ThinkDoc Word Add-in

## Build (Development)

```bash
pnpm build:dev
```

## Installation for macOS

### Prerequisites

- **macOS 10.12** (Sierra) or later
- **Microsoft Word for Mac 2016** or later (Office 365, Word 2019, or Word 2021)
- **Administrator privileges** on your Mac

### Step-by-Step Installation

1. **Download and Extract**
   - Download the `ThinkDoc-AddIn.zip` file
   - Double-click to extract it to your **Applications** folder or **Documents** folder
   - ⚠️ **Important**: Do NOT delete this folder after installation! Word needs these files to run the add-in.

2. **Open Microsoft Word**
   - Launch Microsoft Word for Mac
   - Create a new document or open an existing one

3. **Install the Add-in**
   - Go to **Insert** menu → **Add-ins** → **My Add-ins**
   - Click **Upload My Add-in** (folder icon with up arrow)
   - Navigate to the extracted folder and select `manifest.xml`
   - Click **Upload**

4. **Verify Installation**
   - Look for the **"ThinkDoc"** button in the **Home** tab ribbon
   - If you don't see it immediately, try restarting Word

### Alternative Installation Method (if above doesn't work)

1. **Using Office Add-ins Menu**
   - Go to **Insert** → **Office Add-ins**
   - Click **MY ADD-INS** tab
   - Click **Upload My Add-in**
   - Select the `manifest.xml` file

### macOS-Specific Installation Script

Create this script and save it as `install-macos.sh`:

```bash
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
# Remove existing manifest.xml if it exists
if [ -f "$WEF_DIR/manifest.xml" ]; then
    rm "$WEF_DIR/manifest.xml"
    echo "🗑️  Removed existing manifest file"
fi
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
echo "Installing bun..."
brew tap oven-sh/bun
brew install bun
brew install mkcert

echo "Setting up certificates..."
mkcert -install
mkdir -p "$CURRENT_DIR/certs"
mkcert -install -key-file "$CURRENT_DIR/certs/localhost-key.pem" -cert-file "$CURRENT_DIR/certs/localhost.pem" localhost 127.0.0.1 ::1

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting HTTPS server..."
echo "Press Ctrl+C to stop the server when done testing"
echo ""

# Start the server
cd "$CURRENT_DIR"
bun https-server.ts
```

Make it executable:

```bash
chmod +x install-macos.sh
```

### Troubleshooting for macOS

#### Issue: Add-in doesn't appear after installation

**Solutions:**

1. **Restart Word completely**
   ```bash
   # Force quit Word if needed
   pkill "Microsoft Word"
   ```
2. **Check Word version**: Ensure you have Word 2016 or later
3. **Clear Office cache**:
   ```bash
   rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
   ```

#### Issue: "Upload My Add-in" option is grayed out

**Solutions:**

1. **Sign in to Microsoft 365**: Go to **Word** → **Sign In**
2. **Enable add-ins**: Word → Preferences → Security & Privacy → Enable all add-ins
3. **Check Word license**: Ensure you have a valid Office license

#### Issue: Security warnings or blocked files

**Solutions:**

1. **Remove quarantine attributes**:
   ```bash
   cd /path/to/ThinkDoc-AddIn-Distribution
   xattr -r -d com.apple.quarantine .
   ```
2. **Allow in System Preferences**:
   - System Preferences → Security & Privacy → General
   - Click "Allow" if prompted about blocked files

#### Issue: Add-in loads but shows errors

**Solutions:**

1. **Check file permissions**:
   ```bash
   chmod -R 755 /path/to/ThinkDoc-AddIn-Distribution
   ```
2. **Verify all files are present**: Ensure no files were corrupted during extraction

### macOS Installation Verification Script

Create `verify-installation.sh`:

```bash
#!/bin/bash

echo "🔍 ThinkDoc Add-in Installation Verification"
echo "==========================================="
echo ""

# Check if Word is installed
if [ -d "/Applications/Microsoft Word.app" ]; then
    echo "✅ Microsoft Word found"
    WORD_VERSION=$(defaults read "/Applications/Microsoft Word.app/Contents/Info" CFBundleShortVersionString)
    echo "   Version: $WORD_VERSION"
else
    echo "❌ Microsoft Word not found in Applications folder"
    echo "   Please install Microsoft Word for Mac 2016 or later"
    exit 1
fi

# Check if manifest file exists
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$CURRENT_DIR/manifest.xml" ]; then
    echo "✅ Manifest file found"
else
    echo "❌ Manifest file missing"
    exit 1
fi

# Check required files
REQUIRED_FILES=("taskpane.html" "commands.html" "taskpane.js" "commands.js")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$CURRENT_DIR/$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
    fi
done

# Check assets folder
if [ -d "$CURRENT_DIR/assets" ]; then
    echo "✅ Assets folder found"
    ICON_COUNT=$(find "$CURRENT_DIR/assets" -name "*.png" | wc -l)
    echo "   Found $ICON_COUNT icon files"
else
    echo "❌ Assets folder missing"
fi

echo ""
echo "📝 Next steps:"
echo "1. Open Microsoft Word"
echo "2. Go to Insert → Add-ins → My Add-ins"
echo "3. Click 'Upload My Add-in'"
echo "4. Select: $CURRENT_DIR/manifest.xml"
echo ""
```

### Complete macOS Distribution Package

Your macOS distribution should include:

```
ThinkDoc-AddIn-macOS.zip
└── ThinkDoc-AddIn-Distribution/
    ├── manifest.xml
    ├── taskpane.html
    ├── commands.html
    ├── taskpane.js
    ├── commands.js
    ├── react.js
    ├── polyfill.js
    ├── assets/
    │   ├── ThinkDoc-16.png
    │   ├── ThinkDoc-32.png
    │   └── ThinkDoc-80.png
    ├── README-macOS.md
    ├── install-macos.sh
    ├── verify-installation.sh
    └── TROUBLESHOOTING-macOS.md
```

### Quick Installation Summary for macOS Users

```markdown
# Quick Install (macOS)

1. **Extract** zip to Applications or Documents folder
2. **Open Word** → Insert → Add-ins → My Add-ins
3. **Click** "Upload My Add-in"
4. **Select** manifest.xml from extracted folder
5. **Look for** ThinkDoc button in Home tab

⚠️ Keep the extracted folder - don't delete it!

🆘 Issues? Run `./install-macos.sh` for guided installation
```

This comprehensive guide should help macOS users successfully install your Word add-in with clear, platform-specific instructions and troubleshooting steps.
