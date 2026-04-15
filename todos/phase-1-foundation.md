# TODO: Phase 1 - Foundation Setup

**Status:** In Progress  
**Started:** 2026-04-15  
**Target:** 2026-04-15

---

## Step 1.1: Initialize npm/Node Project ✅
**Status:** Done

```bash
cd /Users/sandipkumarpatel/Developer/Projects/Nexus-AI
npm init -y
```

## Step 1.2: Install Tauri CLI
**Status:** ⏳ Pending

```bash
npm install -D @tauri-apps/cli@latest
```

## Step 1.3: Initialize Tauri
**Status:** ⏳ Pending

```bash
npm run tauri init
```

### Configuration:
- **App name:** Nexus-AI
- **Window title:** Nexus-AI
- **Dev URL:** http://localhost:1420
- **Front-end dist:** ../dist
- **Before dev command:** npm run dev
- **Before build command:** npm run build

## Step 1.4: Create Cargo.toml
**Status:** ⏳ Pending

Add dependencies:
- tauri v2
- tauri-macos-private-api
- tokio (async)
- reqwest (HTTP)
- serde, serde_json
- rusqlite
- uuid
- dirs

## Step 1.5: Configure tauri.conf.json
**Status:** ⏳ Pending

Key settings:
- productName: Nexus-AI
- identifier: com.nexus-ai.app
- macOSPrivateApi: true
- NSPanel configuration
- System tray support

## Step 1.6: Create project.yml for XcodeGen
**Status:** ⏳ Pending

## Step 1.7: Create Entitlements
**Status:** ⏳ Pending

Required entitlements:
- com.apple.security.app-sandbox
- com.apple.security.screen-capture
- com.apple.security.automation.apple-events

## Step 1.8: Create Info.plist
**Status:** ⏳ Pending

Required keys:
- NSFaceIDUsageDescription
- NSScreenCaptureUsageDescription
- NSMicrophoneUsageDescription
- LSUIElement (for menu bar app)

---

## Files to Create

```
Nexus-AI/
├── package.json              # Create
├── project.yml               # Create (XcodeGen)
├── src-tauri/
│   ├── Cargo.toml           # Create
│   ├── tauri.conf.json      # Create
│   ├── build.rs             # Create
│   └── src/
│       ├── main.rs          # Create
│       └── lib.rs           # Create
├── Nexus-AI.entitlements    # Create
└── Info.plist               # Create
```

---

## Next Phase
→ Phase 2: Rust Backend

---

*Updated: 2026-04-15*
