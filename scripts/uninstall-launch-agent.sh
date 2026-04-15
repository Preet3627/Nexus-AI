#!/bin/bash
# uninstall-launch-agent.sh - Remove Nexus-AI LaunchAgent

BUNDLE_ID="ai.nexus.Nexus-AI"
PLIST_PATH="$HOME/Library/LaunchAgents/$BUNDLE_ID.plist"

echo "Uninstalling Nexus-AI Launch Agent..."

# Unload if loaded
if launchctl list | grep -q "$BUNDLE_ID"; then
    launchctl unload "$PLIST_PATH"
    echo "✓ Launch Agent unloaded"
fi

# Remove plist
if [ -f "$PLIST_PATH" ]; then
    rm "$PLIST_PATH"
    echo "✓ Launch Agent plist removed"
else
    echo "Launch Agent plist not found (may not have been installed)"
fi

echo ""
echo "Nexus-AI will no longer auto-start at login."
