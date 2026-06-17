#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build/swift-native"
DERIVED_DIR="$BUILD_DIR/DerivedData"
APP_NAME="Nexus-AI.app"
APP_PATH="$DERIVED_DIR/Build/Products/Release/$APP_NAME"
ENTITLEMENTS_PATH="$ROOT_DIR/Nexus-AI.entitlements"
APP_IDENTIFIER="com.nexusai.macos"

rm -rf "$DERIVED_DIR"
mkdir -p "$BUILD_DIR"

xcodebuild \
  -scheme Nexus-AI \
  -project "$ROOT_DIR/Nexus-AI.xcodeproj" \
  -configuration Release \
  -sdk macosx \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  -derivedDataPath "$DERIVED_DIR" \
  build

if [[ ! -d "$APP_PATH" ]]; then
  echo "Expected app bundle not found at $APP_PATH" >&2
  exit 1
fi

SIGNING_IDENTITY="$(
  security find-identity -v -p codesigning 2>/dev/null \
    | awk -F '"' '/Apple Development:|Developer ID Application:/{print $2; exit}'
)"

CODESIGN_ARGS=(
  --force
  --deep
  --options runtime
  --entitlements "$ENTITLEMENTS_PATH"
  --identifier "$APP_IDENTIFIER"
)

if [[ -n "$SIGNING_IDENTITY" ]]; then
  echo "Signing app with identity: $SIGNING_IDENTITY"
  codesign "${CODESIGN_ARGS[@]}" --sign "$SIGNING_IDENTITY" --timestamp "$APP_PATH"
else
  echo "No Apple code-signing identity found; applying ad-hoc bundle signature."
  codesign "${CODESIGN_ARGS[@]}" --sign - "$APP_PATH"
fi

codesign --verify --deep --strict "$APP_PATH"
echo "Built app at $APP_PATH"
