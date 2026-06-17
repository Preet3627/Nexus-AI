#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/swift-native"
DERIVED_DIR="$BUILD_DIR/DerivedData"
STAGE_DIR="$BUILD_DIR/dmg-root"
APP_NAME="Nexus-AI.app"
DMG_NAME="Nexus-AI-Native.dmg"
APP_PATH="$DERIVED_DIR/Build/Products/Release/$APP_NAME"
DMG_PATH="$BUILD_DIR/$DMG_NAME"

rm -rf "$STAGE_DIR"
mkdir -p "$BUILD_DIR" "$STAGE_DIR"

"$ROOT_DIR/scripts/build-swift-app.sh"

if [[ ! -d "$APP_PATH" ]]; then
  echo "Expected app bundle not found at $APP_PATH" >&2
  exit 1
fi

cp -R "$APP_PATH" "$STAGE_DIR/$APP_NAME"
ln -s /Applications "$STAGE_DIR/Applications"
rm -f "$DMG_PATH"

hdiutil create \
  -volname "Nexus-AI Native" \
  -srcfolder "$STAGE_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

echo "DMG created at $DMG_PATH"

# Copy DMG to project root for easy access
cp "$DMG_PATH" "$ROOT_DIR/$DMG_NAME"
echo "Also copied to $ROOT_DIR/$DMG_NAME"
