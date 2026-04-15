---
layout: default
title: Native APIs - Nexus-AI
---

# Native APIs Supported by Nexus-AI

Nexus-AI leverages native macOS frameworks for optimal performance and security.

## 🔐 Authentication & Security

### LocalAuthentication (Touch ID / Face ID)

**Purpose:** Biometric authentication for secure access

**API Usage:**
```swift
import LocalAuthentication

// Check availability
let context = LAContext()
var error: NSError?
guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
    return
}

// Authenticate
let result = try await context.evaluatePolicy(
    .deviceOwnerAuthentication,
    localizedReason: "Access Nexus-AI"
)
```

**Lines of Code:** ~150
**Files:** `src/Security/BiometricAuth.swift`

---

### Security (Keychain Services)

**Purpose:** Secure credential storage with iCloud sync

**API Usage:**
```swift
import Security
import KeychainAccess

// Store with biometric protection
let keychain = Keychain(service: "com.nexusai.macos")
    .synchronizable(true)
    .accessibility(.whenUnlockedThisDeviceOnly)

try keychain
    .accessibility(.whenUnlockedThisDeviceOnly, authenticationPolicy: .biometryAny)
    .set(apiKey, key: "openai_api_key")
```

**Keychain Operations:**
| Operation | Function |
|-----------|----------|
| Store | `SecItemAdd` |
| Retrieve | `SecItemCopyMatching` |
| Update | `SecItemUpdate` |
| Delete | `SecItemDelete` |

**Lines of Code:** ~200
**Files:** `src/Security/KeychainManager.swift`

---

### CryptoKit (AES-256-GCM Encryption)

**Purpose:** Hardware-accelerated encryption for all stored data

**API Usage:**
```swift
import CryptoKit

// Encrypt
let sealedBox = try AES.GCM.seal(plaintext, using: key)
let ciphertext = sealedBox.combined!

// Decrypt
let sealedBox = try AES.GCM.SealedBox(combined: ciphertext)
let plaintext = try AES.GCM.open(sealedBox, using: key)
```

**Lines of Code:** ~100
**Files:** `src/Security/SecureStorage.swift`

---

## 📸 Screen & Display

### ScreenCaptureKit

**Purpose:** High-performance screen capture for analysis

**API Usage:**
```swift
import ScreenCaptureKit

// Capture screen
let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
let display = content.displays.first!
let filter = SCContentFilter(display: display, excludingWindows: [])
let config = SCStreamConfiguration()

let image = try await SCScreenshotManager.captureImage(
    filter: filter,
    configuration: config
)
```

**Capabilities:**
| Feature | Support |
|---------|---------|
| Full screen capture | ✅ |
| Window capture | ✅ |
| Region capture | ✅ |
| Multiple displays | ✅ |
| Retina @2x | ✅ |

**Lines of Code:** ~300
**Files:** `src-tauri/src/screenshot.rs`

---

### CGWindowList (Legacy Fallback)

**Purpose:** Fallback for older macOS versions

**API Usage:**
```swift
let image = CGWindowListCreateImage(
    .null,
    .optionOnScreenOnly,
    kCGNullWindowID,
    [.boundsIgnoreFraming, .nominalResolution]
)
```

---

## ⌨️ Accessibility & Input

### ApplicationServices (Accessibility API)

**Purpose:** Control other applications, global hotkey detection

**API Usage:**
```swift
import ApplicationServices

// Check accessibility permission
AXIsProcessTrusted()

// Request permission
let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
AXIsProcessTrustedWithOptions(options as CFDictionary)

// Get focused element
let focusedApp = AXUIElementCreateSystemWide()
var focusedWindow: CFTypeRef?
AXUIElementCopyAttributeValue(focusedApp, kAXFocusedWindowAttribute, &focusedWindow)
```

**Lines of Code:** ~250
**Files:** `src-tauri/src/accessibility.rs`

---

### CGEventTap (Global Hotkeys)

**Purpose:** Detect double-tap Control key activation

**API Usage:**
```rust
// Create event tap
let tap = CGEventTap::new(
    CGEventTapLocation::HID,
    Some(event_tap_callback),
    &mut state
).expect("Failed to create event tap");

// Enable tap
tap.set_enabled(true);

// Run loop
CFRunLoop::get_current().add_source(&tap, kCFRunLoopCommonModes);
```

**Lines of Code:** ~500
**Files:** `src-tauri/src/activator.rs`

---

## 🖥️ Window Management

### NSPanel (Floating Window)

**Purpose:** Overlay window that appears over fullscreen apps

**Configuration:**
```swift
// Panel settings for floating overlay
panel.set_level(PanelLevel::Floating.value())
panel.set_style_mask(StyleMask::empty().nonactivating_panel().into())
panel.set_collection_behavior(
    CollectionBehavior::new()
        .full_screen_auxiliary()
        .can_join_all_spaces()
        .into()
)
```

**Features:**
| Feature | Support |
|---------|---------|
| Appears over fullscreen | ✅ |
| Non-activating | ✅ |
| Multi-space | ✅ |
| Dark mode | ✅ |
| Vibrancy | ✅ |

**Lines of Code:** ~400
**Files:** `src-tauri/src/lib.rs`

---

### LSUIElement (Menu Bar App)

**Purpose:** Run as background menu bar application

**Configuration:**
```xml
<key>LSUIElement</key>
<true/>
```

---

## 📊 System Integration

### NSWorkspace (App Launching)

**Purpose:** Launch Comet-AI and other applications

**API Usage:**
```swift
// Launch Comet-AI
let cometURL = URL(fileURLWithPath: "/Applications/Comet-AI.app")
NSWorkspace.shared.openApplication(at: cometURL, configuration: { app in
    app.activates = false
})
```

---

### NSStatusItem (System Tray)

**Purpose:** Menu bar icon for background operation

**API Usage:**
```swift
let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
statusItem.button?.image = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "Nexus-AI")

let menu = NSMenu()
menu.addItem(NSMenuItem(title: "Open", action: #selector(openOverlay), keyEquivalent: "o"))
menu.addItem(NSMenuItem.separator())
menu.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))
statusItem.menu = menu
```

**Lines of Code:** ~150
**Files:** `src-tauri/src/tray.rs`

---

## 🔄 IPC & Communication

### Tauri IPC

**Purpose:** Bridge between SwiftUI frontend and Rust backend

**Commands:**
| Command | Description | Lines |
|---------|-------------|-------|
| `send_message` | Send chat message | ~50 |
| `capture_screen` | Capture screen | ~30 |
| `authenticate` | Biometric auth | ~20 |
| `store_encrypted` | Save encrypted data | ~25 |
| `comet_execute` | Execute Comet action | ~100 |

---

## 📦 Frameworks Used

| Framework | Purpose | Status |
|-----------|---------|--------|
| LocalAuthentication | Biometrics | ✅ |
| Security | Keychain | ✅ |
| CryptoKit | Encryption | ✅ |
| ScreenCaptureKit | Screenshots | ✅ |
| ApplicationServices | Accessibility | ✅ |
| NSPanel | Floating window | ✅ |
| NSWorkspace | App launching | ✅ |
| AVFoundation | Audio/Video | 🔜 |
| Metal | GPU acceleration | 🔜 |
| Vision | Image analysis | 🔜 |

---

## 📁 Component Statistics

| Component | Files | Lines |
|-----------|-------|-------|
| Security | 4 | ~600 |
| Native APIs | 5 | ~1200 |
| Window Management | 2 | ~500 |
| IPC | 3 | ~300 |
| **Total** | **14** | **~2600** |

---

*Native API Reference: [Apple Developer Documentation](https://developer.apple.com/documentation)*
