#!/bin/bash
# install-launch-agent.sh - Install Nexus-AI LaunchAgent for auto-start
# Place in ~/Library/LaunchAgents/

BUNDLE_ID="ai.nexus.Nexus-AI"
AGENT_NAME="Nexus-AI Launch Agent"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$BUNDLE_ID.plist"

echo "Installing Nexus-AI Launch Agent..."

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Detect app path
if [ -d "/Applications/Nexus-AI.app" ]; then
    APP_PATH="/Applications/Nexus-AI.app/Contents/MacOS/Nexus-AI"
elif [ -d "$HOME/Applications/Nexus-AI.app" ]; then
    APP_PATH="$HOME/Applications/Nexus-AI.app/Contents/MacOS/Nexus-AI"
else
    echo "Error: Nexus-AI.app not found in /Applications or ~/Applications"
    echo "Please install the app first."
    exit 1
fi

# Create the LaunchAgent plist
cat > "$PLIST_PATH" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>BUNDLE_ID_PLACEHOLDER</string>
    <key>ProgramArguments</key>
    <array>
        <string>APP_PATH_PLACEHOLDER</string>
        <string>--hidden</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>LaunchOnlyOnce</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/Nexus-AI.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/Nexus-AI.err</string>
    <key>LSUIElement</key>
    <true/>
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF

# Replace placeholders
sed -i '' "s|BUNDLE_ID_PLACEHOLDER|$BUNDLE_ID|g" "$PLIST_PATH"
sed -i '' "s|APP_PATH_PLACEHOLDER|$APP_PATH|g" "$PLIST_PATH"

# Load the LaunchAgent
launchctl load "$PLIST_PATH"

if [ $? -eq 0 ]; then
    echo "✓ Nexus-AI Launch Agent installed successfully"
    echo "  Location: $PLIST_PATH"
    echo "  App will start hidden at login"
    echo ""
    echo "To uninstall, run:"
    echo "  launchctl unload $PLIST_PATH"
    echo "  rm $PLIST_PATH"
else
    echo "✗ Failed to install Launch Agent"
    exit 1
fi
