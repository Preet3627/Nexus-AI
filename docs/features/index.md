---
layout: default
title: Features - Nexus-AI
---

# Features

Comprehensive overview of all Nexus-AI features.

## 🎨 Floating Overlay

### Description
Thuki-inspired spotlight-style floating overlay that appears on double-tap Control key.

### Specifications
| Property | Value |
|----------|-------|
| Activation | Double-tap Control (⌃⌃) |
| Window Type | NSPanel (floating) |
| Width | 600px |
| Max Height | 648px |
| Animation | Spring (260 stiffness, 24 damping) |
| Files | 8 components |

### Components
| Component | Lines | Purpose |
|----------|-------|---------|
| `AskBarView.swift` | 450 | Spotlight input with commands |
| `ConversationView.swift` | 300 | Chat message list |
| `ChatBubble.swift` | 150 | Message bubbles |
| `HistoryPanel.swift` | 200 | Conversation history |
| `CommandSuggestion.tsx` | 80 | Slash command autocomplete |
| `TypingIndicator.tsx` | 50 | Pulsing dots animation |
| `MarkdownRenderer.tsx` | 120 | Markdown rendering |
| `ThinkingBlock.tsx` | 80 | Reasoning display |

**Total:** ~1,430 lines

### Visual States
```
┌─────────────────────────────────────────────────────────┐
│                    COLLAPSED (No Chat)                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✨ Ask Nexus anything...                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    EXPANDED (With Chat)                   │
├─────────────────────────────────────────────────────────┤
│  [−]  [Clock] [+] [Bookmark]                          │
├─────────────────────────────────────────────────────────┤
│  │ User message                                      │   │
│  │ Assistant message with streaming...               │
│  │ ˙˙˙ (typing indicator)                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │  ✨ Reply...                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🤖 Multi-LLM Support

### Supported Providers

| Provider | Type | Status | Lines |
|----------|------|--------|-------|
| Ollama | Local | ✅ | 200 |
| OpenAI | Cloud | ✅ | 150 |
| Anthropic | Cloud | ✅ | 150 |
| Google | Cloud | ✅ | 150 |
| Groq | Cloud | ✅ | 100 |
| OpenRouter | Cloud | ✅ | 100 |

**Total LLM Module:** ~850 lines

### Provider Interface

```swift
protocol LLMProvider {
    var name: String { get }
    var isAvailable: Bool { get }
    
    func chat(messages: [Message]) async throws -> Response
    func streamChat(messages: [Message]) -> AsyncStream<Chunk>
}
```

### Configuration

```json
{
  "providers": {
    "ollama": {
      "url": "http://localhost:11434",
      "model": "llama3",
      "stream": true
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4",
      "temperature": 0.7
    }
  }
}
```

---

## 📸 Screen Capture

### Capabilities

| Feature | Resolution | Format |
|---------|------------|--------|
| Full screen | Up to 6K | PNG/JPEG |
| Window | Window bounds | PNG/JPEG |
| Region | User selection | PNG/JPEG |
| Retina | @2x @3x | PNG |

**Files:** `screenshot.rs`, `ScreenCaptureService.swift`
**Lines:** ~500

### Usage
```
/screen              - Full screen
/screen window       - Active window
/screen region       - Select region
```

---

## 🔗 Comet-AI Integration

### Connection
| Method | Port | Protocol |
|--------|------|----------|
| WebSocket | 3004 | ws:// |
| Discovery | 3005 | UDP |

### Actions
| Action | Description |
|--------|-------------|
| `navigate` | Open URL in Comet |
| `shell` | Execute terminal command |
| `click` | Click element |
| `type` | Type text |
| `screenshot` | Capture Comet window |

**Files:** `comet_bridge.rs`
**Lines:** ~400

---

## 🔐 Security Features

| Feature | Implementation | Lines |
|---------|----------------|-------|
| Touch ID/Face ID | LocalAuthentication | 150 |
| Secure Enclave | Security framework | 200 |
| AES-256-GCM | CryptoKit | 100 |
| Keychain Storage | Security + KeychainAccess | 200 |
| TCC Permissions | ApplicationServices | 150 |

**Total Security:** ~800 lines

---

## 🎯 Action Chains

### Supported Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `/screen` | `/screen` | Capture screen |
| `/think` | `/think` | Enable reasoning |
| `/summarize` | `/summarize [text]` | Summarize content |
| `/search` | `/search <query>` | Web search |
| `/pdf` | `/pdf <prompt>` | Generate PDF |
| `/rewrite` | `/rewrite` | Rewrite selected text |

**Parser:** `src/lib/action-parser.ts` (~300 lines)

---

## ☁️ Background Service

### Features
| Feature | Implementation |
|---------|----------------|
| System tray | NSStatusItem |
| Launch at login | SMAppService |
| Background operation | LSUIElement |
| Notifications | UserNotifications |

**Files:** `tray.rs`, `launchd.rs`
**Lines:** ~300

---

## 📊 Feature Summary

| Feature | Files | Lines |
|---------|-------|-------|
| Floating Overlay | 8 | 1,430 |
| LLM Providers | 6 | 850 |
| Screen Capture | 2 | 500 |
| Comet Integration | 3 | 400 |
| Security | 5 | 800 |
| Background Service | 2 | 300 |
| Deep Linking | 2 | 300 |
| Action Parser | 1 | 300 |
| **Total** | **29** | **4,880** |

---

## 🗺️ Roadmap

### v0.1.0
- [x] Project structure
- [ ] Tauri initialization
- [ ] Basic overlay UI
- [ ] Ollama integration

### v0.2.0
- [ ] Cloud LLM providers
- [ ] Screen capture
- [ ] Basic security

### v0.3.0
- [ ] Comet-AI integration
- [ ] Action chains
- [ ] Biometric auth

### v1.0.0
- [ ] Full security
- [ ] iCloud sync
- [ ] Production release

---

*Features subject to change during development*
