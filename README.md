# Nexus-AI

> **Native macOS AI Assistant** - Thuki-inspired floating overlay with enterprise security

![macOS](https://img.shields.io/badge/macOS-13.0+-orange)
![Swift](https://img.shields.io/badge/Swift-5.9-blue)
![Rust](https://img.shields.io/badge/Rust-1.70-black)
![Tauri](https://img.shields.io/badge/Tauri-2.0-purple)

---

## 🎯 Project Goals

**Nexus-AI** is a native macOS AI assistant that provides:

1. **Floating Overlay Interface** - Thuki-inspired spotlight-style AI chat
2. **Multi-LLM Support** - Ollama, OpenAI, Anthropic, Google, and more
3. **Comet-AI Integration** - Control and interact with Comet-AI browser
4. **Enterprise Security** - Touch ID, Secure Enclave, AES-256-GCM encryption
5. **Background Service** - Works silently with system tray

---

## ✨ Features

### Core Features
- 🎨 **Floating Overlay** - Spotlight-style input that appears on double-tap Control
- 💬 **AI Chat** - Natural language conversations with streaming responses
- 📸 **Screen Capture** - Analyze screen content with `/screen` command
- 🔗 **Comet-AI Bridge** - Execute action chains and browser automation
- 💾 **Encrypted History** - Secure conversation storage with AES-256-GCM
- 🔐 **Hardcoded Risk Permissions** - Hardcoded security levels (Low, Medium, High) for all native commands (volume, open, play, web, shell)
- 🔒 **Biometric Auth** - Mandatory Touch ID verification for High-risk operations (e.g. shell execution) or unverified Low/Medium actions
- ⚠️ **Native Warning Popups** - Native macOS dialog warning pop-ups on dangerous instructions using `/warn` action
- 🎛️ **Command Automation Panel** - Beautiful customizable switches to automate Low/Medium risk actions without biometric prompts
- 🧠 **Local Memory (RAG)** - Pure Rust-based semantic retrieval-augmented memory (`memories.json`) returning facts automatically across sessions
- 🎭 **Tone Profiles** - Switcher supporting multiple formatting presets (`default`, `serious`, `funny`) directly from conversational action commands
- ☁️ **iCloud Sync** - Optional encrypted sync across devices
- 🖥️ **System Tray** - Background operation with quick access
- 🚀 **Hidden Mode** - Stays hidden in dock like Raycast (LSUIElement)
- ⚡ **Auto-Start** - Launches automatically at login, starts hidden

### LLM Providers
| Provider | Status | Models |
|----------|--------|--------|
| Ollama (Local) | ⏳ | All local models |
| OpenAI | ⏳ | GPT-4, GPT-4 Turbo, GPT-3.5 |
| Anthropic | ⏳ | Claude 3.5, Claude 3 |
| Google | ⏳ | Gemini Pro, Gemini Ultra |
| Groq | ⏳ | Llama, Mixtral |
| OpenRouter | ⏳ | 100+ models |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nexus-AI Architecture                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SwiftUI Frontend                         │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │ AskBar   │  │ Conversation │  │ Settings View   │   │   │
│  │  │ (Input)  │  │    View      │  │   (Config)     │   │   │
│  │  └──────────┘  └──────────────┘  └─────────────────┘   │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                     │
│                           │ Tauri IPC                          │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Rust Backend (Tauri)                     │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │activator │  │ llm_providers│  │  comet_bridge   │   │   │
│  │  │ (Hotkey) │  │   (AI)       │  │   (IPC)        │   │   │
│  │  └──────────┘  └──────────────┘  └─────────────────┘   │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │security  │  │   storage    │  │   permissions   │   │   │
│  │  │ (Crypto) │  │   (SQLite)   │  │   (TCC)        │   │   │
│  │  └──────────┘  └──────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Authentication (LocalAuthentication)          │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │ Touch ID │  │  Face ID    │  │ Passcode (FB)   │   │   │
│  │  └──────────┘  └──────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Key Storage (User Choice)                    │   │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │  Secure Enclave    │  │    Keychain Only        │   │   │
│  │  │  (Hardware-Backed) │  │    (Software)           │   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Encryption (CryptoKit)                       │   │
│  │                                                          │   │
│  │     AES-256-GCM ← SymmetricKey ← Secure Enclave        │   │
│  │                                                          │   │
│  │     All data encrypted at rest:                         │   │
│  │     • Conversations  • API keys  • Settings             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Data Sync (User Choice)                     │   │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │     Local Only      │  │    iCloud Keychain       │   │   │
│  │  │  (Most Secure)      │  │    (Cross-Device)       │   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

- macOS 13.0 (Ventura) or later
- Xcode 15.0+
- Rust 1.70+
- Apple Silicon or Intel Mac
- For Secure Enclave: MacBook Pro/Air with Touch ID, or Mac mini with T2 chip

---

## 🚀 Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/Nexus-AI.git
cd Nexus-AI

# Install dependencies
npm install

# Install XcodeGen (if not installed)
brew install xcodegen

# Generate Xcode project
npm run generate

# Build the project
npm run tauri build
```

### Development Mode

```bash
# Start development server
npm run tauri dev
```

---

## 🎮 Usage

### Activation
- **Double-tap Control (⌃)** to toggle the floating overlay
- Or click the system tray icon

### Commands
| Command | Description |
|---------|-------------|
| `/screen` | Capture screen and analyze |
| `/think` | Enable reasoning mode |
| `/summarize` | Summarize selected content |
| `/search` | Search the web |
| `/clear` | Clear conversation |
| `/settings` | Open settings |

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `⌃⌃` | Toggle overlay |
| `⌘W` | Close overlay |
| `⌘N` | New conversation |
| `⌘K` | Open settings |

---

## 🔧 Configuration

### LLM Providers

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "url": "http://localhost:11434",
      "model": "llama3"
    },
    "openai": {
      "enabled": false,
      "apiKey": "sk-...",
      "model": "gpt-4"
    },
    "anthropic": {
      "enabled": false,
      "apiKey": "sk-ant-...",
      "model": "claude-3-5-sonnet"
    }
  }
}
```

### Security Settings

```json
{
  "security": {
    "requireAuthOnLaunch": true,
    "authTimeout": 300,
    "storageBackend": "secure-enclave",
    "enableCloudSync": false,
    "alwaysAllowComet": false
  }
}
```

---

## 📁 Project Structure

```
Nexus-AI/
├── src/                          # SwiftUI Frontend
│   ├── App/
│   │   └── NexusApp.swift       # App entry point
│   ├── Views/
│   │   ├── AskBarView.swift     # Spotlight input
│   │   ├── ConversationView.swift # Chat UI
│   │   ├── ChatBubble.swift     # Message bubbles
│   │   ├── HistoryPanel.swift   # History list
│   │   ├── SettingsView.swift   # Configuration
│   │   ├── PermissionsView.swift # TCC permissions
│   │   └── OnboardingView.swift # First-run setup
│   ├── ViewModels/
│   │   └── ChatViewModel.swift  # Chat logic
│   ├── Models/
│   │   ├── Message.swift        # Message model
│   │   └── Conversation.swift   # Conversation model
│   ├── Security/
│   │   ├── BiometricAuth.swift  # Touch ID / Face ID
│   │   ├── SecureStorage.swift  # AES-256-GCM
│   │   ├── KeychainManager.swift # iCloud Keychain
│   │   └── PermissionManager.swift # TCC checks
│   └── Resources/
│       └── Assets.xcassets
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # NSPanel setup
│   │   ├── activator.rs         # Double-tap Control
│   │   ├── llm_providers.rs     # Multi-LLM support
│   │   ├── comet_bridge.rs       # Comet-AI IPC
│   │   ├── action_executor.rs    # Action chains
│   │   ├── security.rs          # Encryption
│   │   ├── storage.rs           # SQLite
│   │   ├── permissions.rs       # TCC
│   │   └── screenshot.rs       # Screen capture
│   ├── Cargo.toml
│   └── tauri.conf.json
├── landing-page/                  # GitHub Pages (Next.js)
│   ├── src/app/
│   │   ├── page.tsx            # Home page
│   │   ├── docs/               # Documentation
│   │   ├── components/         # Components page
│   │   └── license/            # License page
│   └── public/
├── docs/                         # Documentation
│   ├── README.md
│   ├── CONTRIBUTING.md
│   ├── SECURITY.md
│   └── ARCHITECTURE.md
├── .github/
│   └── workflows/
│       ├── release.yml
│       ├── test.yml
│       └── lint.yml
├── milestones/                   # Progress tracking
├── todos/                       # Task lists
├── Nexus-AI.entitlements
├── Info.plist
├── project.yml                  # XcodeGen
└── package.json
```

---

## 🌐 Landing Page

A Next.js-based landing page is available at `/landing-page/`.

**Pages:**
- `/` - Home page with features, security, and setup
- `/docs` - Documentation with sidebar navigation
- `/components` - Component list with line counts
- `/license` - License and attribution

**Build:**
```bash
cd landing-page
npm install
npm run build
```

Output is in `landing-page/out/` for GitHub Pages deployment.
```

---

## 🔑 Security Features

### Authentication
- Touch ID / Face ID authentication
- Device passcode fallback
- Configurable timeout (always allow, 5 min, always ask)

### Encryption
- AES-256-GCM for all stored data
- Keys stored in Secure Enclave (or Keychain fallback)
- Hardware-backed key protection

### Privacy
- Local-only storage option
- iCloud Keychain sync (optional, encrypted)
- No plaintext data on disk

### Permissions
- Accessibility (required for hotkey)
- Screen Recording (required for screenshots)
- Microphone (optional for voice input)

---

## 🤝 Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License.

**Acknowledgments:**
- [Thuki](https://github.com/quiet-node/thuki) by Logan Nguyen - Apache 2.0 Licensed

---

## 🙏 Acknowledgments

### Inspiration
- **Thuki** by Logan Nguyen (@quiet_node) - Apache 2.0 Licensed
  - Floating overlay concept
  - Double-tap Control activation
  - Command suggestions UI

### Frameworks
- [Tauri](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- [SwiftUI](https://developer.apple.com/xcode/swiftui/) - Apple's declarative UI framework
- [CryptoKit](https://developer.apple.com/documentation/cryptokit) - Apple's cryptographic framework
- [LocalAuthentication](https://developer.apple.com/documentation/localauthentication) - Biometric authentication

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Target Bundle Size | < 15 MB |
| Memory Usage (Idle) | < 30 MB |
| Startup Time | < 2s |
| LLM Response Time | Depends on provider |

---

## 🗺️ Roadmap

### v0.1.0 (Current)
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
- [ ] Full security implementation
- [ ] iCloud sync
- [ ] Production release

---

## 📞 Support

- **Issues:** https://github.com/yourusername/Nexus-AI/issues
- **Discussions:** https://github.com/yourusername/Nexus-AI/discussions

---

## 🏷️ Tags

`macos` `ai` `assistant` `tauri` `swiftui` `llm` `ollama` `openai` `claude` `gemini` `security` `touch-id` `encryption`

---

*Built with ❤️ for macOS users*
