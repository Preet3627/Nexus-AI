---
layout: default
title: Deep Linking - Nexus-AI
---

# Deep Linking

Nexus-AI supports custom URL schemes and universal links for seamless integration.

## 🔗 URL Schemes

### Custom Scheme: `nexus-ai://`

**Format:**
```
nexus-ai://<action>[?<params>]
```

### Supported Actions

#### 1. Open Chat
```
nexus-ai://chat?message=Hello%20Nexus
```
Opens Nexus-AI with pre-filled message.

#### 2. Open Settings
```
nexus-ai://settings
nexus-ai://settings?tab=llm
nexus-ai://settings?tab=security
```
Opens settings panel directly.

#### 3. Screen Capture
```
nexus-ai://capture
nexus-ai://capture?region=true
```
Triggers screen capture.

#### 4. Execute Action
```
nexus-ai://action?navigate=https://example.com
nexus-ai://action?shell=ls%20-la
```
Executes Comet-AI action.

#### 5. Quick Ask
```
nexus-ai://ask?text=Summarize%20this
```
Quick inline question.

---

## 🌐 Universal Links

### Domain: `nexus-ai.app`

**Format:**
```
https://nexus-ai.app/<action>/<params>
```

### Supported Paths

| Path | Description |
|------|-------------|
| `/chat` | Open chat interface |
| `/settings` | Open settings |
| `/capture` | Screen capture |
| `/providers` | LLM providers list |

---

## 🔧 Configuration

### Info.plist

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.nexus-ai.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>nexus-ai</string>
            <string>nexusai</string>
        </array>
    </dict>
</array>

<key>Associated Domains</key>
<array>
    <string>applinks:nexus-ai.app</string>
</array>
```

---

## 📱 Integration Examples

### From Terminal
```bash
# Open Nexus-AI with message
open "nexus-ai://chat?message=Hello"

# Quick capture
open "nexus-ai://capture"

# Open settings
open "nexus-ai://settings?tab=security"
```

### From AppleScript
```applescript
tell application "Nexus-AI"
    activate
    open settings tab "llm"
end tell
```

### From Shortcuts
```swift
// In Shortcuts app
OpenURL("nexus-ai://chat?message=[\"Magic Jar\"]")
```

---

## 🔐 Security

- Deep links only work when app is installed
- No sensitive data in URL parameters
- All URLs sanitized before processing
- Rate limiting on action endpoints

---

## 📝 Implementation

**Files:**
- `src-tauri/src/deeplink.rs` (~200 lines)
- `src/Views/DeeplinkHandler.tsx` (~100 lines)

**Lines of Code:** ~300 total

---

*Deep linking enabled for macOS 13.0+*
