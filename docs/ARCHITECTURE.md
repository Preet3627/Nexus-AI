# Nexus-AI Architecture Documentation

> Technical architecture and implementation details

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nexus-AI System Overview                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    User Interface Layer                    │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │   SwiftUI   │  │   System    │  │   Keyboard       │  │ │
│  │  │    Views    │  │    Tray     │  │   Shortcuts      │  │ │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘  │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────────┐ │
│  │                    Tauri IPC Bridge                       │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│                              │                                  │
│  ┌───────────────────────────┴───────────────────────────────┐ │
│  │                    Rust Backend                            │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │ │
│  │  │ activator│  │   commands  │  │    comet_bridge  │   │ │
│  │  │ (hotkey) │  │   (IPC)     │  │     (API)       │   │ │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │ │
│  │  │  llm_    │  │   security  │  │     storage     │   │ │
│  │  │ providers│  │   (crypto)  │  │    (SQLite)     │   │ │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │                                  │
│                              ↓                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    External Services                       │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │ │
│  │  │   Comet-AI  │  │    Ollama   │  │  Cloud LLM     │  │ │
│  │  │  (Browser)  │  │   (Local)   │  │   Providers    │  │ │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Module Architecture

### Frontend (SwiftUI)

```
src/
├── App/
│   └── NexusApp.swift              # App entry, lifecycle
├── Views/
│   ├── AskBarView.swift            # Spotlight input
│   ├── ConversationView.swift       # Chat messages
│   ├── ChatBubble.swift            # Message bubbles
│   ├── HistoryPanel.swift           # Conversation list
│   ├── SettingsView.swift          # Configuration
│   ├── PermissionsView.swift       # TCC permissions
│   └── OnboardingView.swift        # First-run setup
├── ViewModels/
│   └── ChatViewModel.swift         # Chat state management
├── Models/
│   ├── Message.swift               # Message data
│   └── Conversation.swift          # Conversation data
├── Security/
│   ├── BiometricAuth.swift         # Touch ID/Face ID
│   ├── SecureStorage.swift         # AES encryption
│   ├── KeychainManager.swift       # Keychain access
│   └── PermissionManager.swift     # TCC permissions
└── Resources/
    └── Assets.xcassets             # App icons, images
```

### Backend (Rust)

```
src-tauri/src/
├── main.rs                         # Entry point, event loop
├── lib.rs                          # Tauri setup, NSPanel
├── activator.rs                    # Double-tap Control hotkey
├── commands.rs                     # IPC command handlers
├── llm_providers.rs                # Multi-LLM support
│   ├── mod.rs                      # Provider trait
│   ├── ollama.rs                   # Ollama implementation
│   ├── openai.rs                   # OpenAI implementation
│   ├── anthropic.rs                # Anthropic implementation
│   └── google.rs                   # Google implementation
├── comet_bridge.rs                 # Comet-AI IPC
│   ├── websocket.rs                # WebSocket client
│   ├── actions.rs                  # Action chain execution
│   └── clipboard.rs                # Clipboard sync
├── security.rs                     # Encryption utilities
├── storage.rs                      # SQLite database
├── permissions.rs                  # TCC permission checks
├── screenshot.rs                   # Screen capture
└── images.rs                       # Image processing
```

---

## 🔄 Data Flow

### Chat Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chat Message Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Input (SwiftUI)                                            │
│       │                                                          │
│       ↓                                                          │
│  ┌─────────────┐                                                │
│  │ AskBarView  │ ──→ Command Detection (/screen, /think, etc)  │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ↓                                                        │
│  Tauri IPC (invoke)                                              │
│         │                                                        │
│         ↓                                                        │
│  ┌─────────────┐                                                │
│  │  commands   │ ──→ Parse message, extract commands          │
│  └──────┬──────┘                                                │
│         │                                                        │
│    ┌────┴────┐                                                  │
│    │         │                                                  │
│  Command   LLM                                                 │
│    │         │                                                  │
│    ↓         ↓                                                  │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐│
│  │  /screen   │───→│  screenshot.rs → ScreenCaptureKit        ││
│  └─────────────┘    └─────────────────────────────────────────┘│
│                           │                                      │
│                    ┌──────┴──────┐                             │
│                    │             │                             │
│                    ↓             ↓                             │
│              ┌───────────┐ ┌───────────┐                       │
│              │  Image    │ │  LLM      │                       │
│              │  Analysis │ │  Request  │                       │
│              └─────┬─────┘ └─────┬─────┘                       │
│                    │             │                               │
│                    └──────┬──────┘                               │
│                           │                                      │
│                           ↓                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    LLM Providers                            │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │ │
│  │  │ Ollama  │  │ OpenAI  │  │Anthropic│  │ Google  │     │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │ │
│  │       └────────────┴────────────┴─────────────┘           │ │
│  │                       │                                  │ │
│  │                       ↓                                  │ │
│  │                 ┌───────────┐                             │ │
│  │                 │  Stream   │                             │ │
│  │                 │  Response │                             │ │
│  │                 └─────┬─────┘                             │ │
│  └───────────────────────┼───────────────────────────────────┘ │
│                          │                                      │
│                          ↓                                      │
│  Tauri Event (emit)                                            │
│                          │                                      │
│                          ↓                                      │
│  SwiftUI View Update                                            │
│                          │                                      │
│                          ↓                                      │
│  ConversationView (streaming message update)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App Launch                                                      │
│       │                                                          │
│       ↓                                                          │
│  ┌─────────────────┐                                             │
│  │ Check Settings  │ ──→ "Require Authentication"               │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┴─────┐                                               │
│     │           │                                               │
│    OFF         ON                                              │
│     │           │                                               │
│     ↓           ↓                                               │
│  ┌──────┐  ┌─────────────────┐                                 │
│  │Allow │  │ Biometric Auth  │                                 │
│  │(⚠️)  │  └────────┬────────┘                                 │
│  └──────┘           │                                           │
│               ┌──────┴──────┐                                    │
│               │             │                                    │
│           Success        Failure                                  │
│               │             │                                    │
│               ↓             ↓                                    │
│           ┌──────┐    ┌─────────────┐                          │
│           │Allow │    │ Passcode FB │                          │
│           │Access│    └──────┬──────┘                          │
│           └──────┘           │                                  │
│                      ┌───────┴───────┐                          │
│                      │               │                          │
│                   Success         Cancel                        │
│                      │               │                          │
│                      ↓               ↓                          │
│                  ┌──────┐        ┌──────┐                       │
│                  │Allow │        │ Deny │                       │
│                  │Access│        │Access│                       │
│                  └──────┘        └──────┘                       │
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Data Encryption Flow                                             │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                      User Data                            │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────┐             │   │
│  │  │Messages │  │API Keys  │  │ Settings   │             │   │
│  │  └────┬────┘  └────┬─────┘  └─────┬──────┘             │   │
│  └───────┼───────────┼──────────────┼──────────────────────┘   │
│          │           │              │                           │
│          └───────────┴──────────────┘                           │
│                          │                                      │
│                          ↓                                      │
│               ┌─────────────────────┐                           │
│               │   AES-256-GCM       │                           │
│               │   Encryption        │                           │
│               └──────────┬──────────┘                           │
│                          │                                      │
│              ┌───────────┴───────────┐                          │
│              │                       │                          │
│              ↓                       ↓                          │
│     ┌────────────────┐    ┌────────────────┐                  │
│     │ Secure Enclave  │ OR │    Keychain    │                  │
│     │  (if available) │    │    (fallback)  │                  │
│     └────────┬────────┘    └────────┬───────┘                  │
│              │                      │                           │
│              └──────────┬───────────┘                           │
│                         │                                       │
│                         ↓                                       │
│              ┌─────────────────────┐                            │
│              │   Encrypted Data    │                            │
│              │   (On Disk)        │                            │
│              └─────────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Comet-AI Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                Comet-AI Integration Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nexus-AI                          Comet-AI                      │
│  ┌─────────────┐                  ┌─────────────┐              │
│  │ comet_bridge│                  │   Browser   │              │
│  └──────┬──────┘                  └──────┬──────┘              │
│         │                                │                       │
│         │    1. Launch/Connect           │                       │
│         │───────────────────────────────→│                       │
│         │                                │                       │
│         │    2. WebSocket (ws://localhost:3004)                │
│         │←──────────────────────────────→│                       │
│         │                                │                       │
│         │    3. Action Request           │                       │
│         │───────────────────────────────→│                       │
│         │    {                           │                       │
│         │      action: "navigate",      │                       │
│         │      params: { url: "..." }   │                       │
│         │    }                           │                       │
│         │                                │                       │
│         │    4. Action Result            │                       │
│         │←───────────────────────────────│                       │
│         │    {                           │                       │
│         │      success: true,            │                       │
│         │      result: "..."            │                       │
│         │    }                           │                       │
│         │                                │                       │
│         │    5. Clipboard Sync           │                       │
│         │←──────────────────────────────→│                       │
│         │                                │                       │
│         │    6. Screenshot Request       │                       │
│         │───────────────────────────────→│                       │
│         │                                │                       │
│         │    7. Screenshot Response       │                       │
│         │←───────────────────────────────│                       │
│         │    (Base64 encoded PNG)        │                       │
│         │                                │                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### SQLite Tables

```sql
-- Conversations table
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT  -- JSON blob
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    metadata TEXT,  -- JSON blob: thinking, images, etc.
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- LLM Provider configs (encrypted)
CREATE TABLE providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config TEXT NOT NULL,  -- Encrypted JSON
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

---

## 🌐 LLM Provider Interface

```rust
/// Trait for LLM providers
pub trait LLMProvider: Send + Sync {
    /// Provider name
    fn name(&self) -> &str;
    
    /// Check if provider is available/configured
    fn is_available(&self) -> bool;
    
    /// Generate a chat completion
    async fn chat(
        &self,
        messages: Vec<Message>,
        options: ChatOptions,
    ) -> Result<ChatResponse, LLMError>;
    
    /// Stream a chat completion
    async fn stream_chat(
        &self,
        messages: Vec<Message>,
        options: ChatOptions,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<ChatChunk, LLMError>> + Send>>, LLMError>;
}

/// Chat message
pub struct Message {
    pub role: Role,
    pub content: String,
    pub name: Option<String>,
}

/// Chat options
pub struct ChatOptions {
    pub model: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<usize>,
    pub top_p: Option<f32>,
    pub stream: bool,
}

/// Chat response
pub struct ChatResponse {
    pub content: String,
    pub model: String,
    pub usage: Usage,
    pub finish_reason: String,
}

/// Stream chunk
pub struct ChatChunk {
    pub delta: String,
    pub index: usize,
}
```

---

## ⌨️ Hotkey Implementation

### Double-Tap Control (Thuki-inspired)

```rust
// Constants
const ACTIVATION_WINDOW_MS: u64 = 400;   // Double-tap window
const ACTIVATION_COOLDOWN_MS: u64 = 600; // Prevent rapid toggles
const KC_LEFT_CONTROL: u16 = 59;         // Left Control keycode
const KC_RIGHT_CONTROL: u16 = 62;        // Right Control keycode

// State
struct ActivatorState {
    press_timestamps: Vec<Instant>,
    last_activation: Option<Instant>,
    enabled: bool,
}

// CGEventTap callback
extern "C" fn event_tap_callback(
    proxy: CGEventTapProxy,
    event_type: CGEventType,
    event: &mut CGEvent,
    state: *mut std::os::raw::c_void,
) -> Option<&mut CGEvent> {
    let state = unsafe { &mut *(state as *mut ActivatorState) };
    
    if event_type == KeyDown {
        let key_code = event.get_integer_value_field(KeyCodeField);
        
        if key_code == KC_LEFT_CONTROL || key_code == KC_RIGHT_CONTROL {
            let now = Instant::now();
            
            // Filter old timestamps
            state.press_timestamps.retain(|t| now.duration_since(*t).as_millis() < ACTIVATION_WINDOW_MS);
            
            // Add current press
            state.press_timestamps.push(now);
            
            // Check for double-tap
            if state.press_timestamps.len() >= 2 {
                // Check cooldown
                if let Some(last) = state.last_activation {
                    if now.duration_since(last).as_millis() < ACTIVATION_COOLDOWN_MS {
                        return Some(event);
                    }
                }
                
                // Double-tap detected!
                state.last_activation = Some(now);
                state.press_timestamps.clear();
                
                // Send activation event
                activate_overlay();
            }
        }
    }
    
    Some(event)
}
```

---

## 🖼️ Screenshot Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Screenshot Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /screen Command                                                │
│       │                                                          │
│       ↓                                                          │
│  Check Permission                                                │
│       │                                                          │
│  ┌────┴────┐                                                    │
│  │ Granted │ ──→ Proceed                                       │
│  └────┬────┘                                                    │
│       │                                                          │
│  Denied ──→ Show Permission UI ──→ Request Permission          │
│                         │                                       │
│                         ↓                                       │
│                   ┌─────────────────┐                          │
│                   │  System Prompt  │                          │
│                   └────────┬────────┘                          │
│                            │                                    │
│                     ┌──────┴──────┐                            │
│                     │             │                             │
│                  Granted        Denied                           │
│                     │             │                             │
│                     ↓             ↓                             │
│              ┌───────────┐  ┌──────────────┐                  │
│              │  Capture  │  │ Show Error   │                  │
│              │   Screen  │  │ & Settings   │                  │
│              └─────┬─────┘  └──────────────┘                  │
│                    │                                            │
│                    ↓                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   ScreenCaptureKit                         │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │ │
│  │  │ SCShareable │→ │ SCContent    │→ │  SCStream      │  │ │
│  │  │  Content    │  │   Filter     │  │  Configuration │  │ │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │ │
│  │                         │                               │ │
│  │                         ↓                               │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │              CGImage Output                       │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────┘ │
│                         │                                    │
│                         ↓                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Image Processing                         │ │
│  │  1. Resize if > 4096px                                   │ │
│  │  2. Convert to JPEG (quality 85)                         │ │
│  │  3. Encode to Base64                                     │ │
│  │  4. Send to LLM for analysis                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 IPC Commands

### Available Commands

```rust
// LLM Commands
#[tauri::command]
async fn send_message(state: State<'_, AppState>, message: String) -> Result<String, String>;

#[tauri::command]
async fn stream_message(state: State<'_, AppState>, message: String) -> Result<(), String>;

#[tauri::command]
async fn cancel_generation(state: State<'_, AppState>) -> Result<(), String>;

// Screen Commands
#[tauri::command]
async fn capture_screen() -> Result<CaptureResult, String>;

#[tauri::command]
async fn capture_region(region: ScreenRegion) -> Result<CaptureResult, String>;

// Security Commands
#[tauri::command]
async fn authenticate(reason: String) -> Result<bool, String>;

#[tauri::command]
async fn store_encrypted(key: String, value: String) -> Result<(), String>;

#[tauri::command]
async fn get_encrypted(key: String) -> Result<String, String>;

// Settings Commands
#[tauri::command]
async fn get_settings() -> Result<Settings, String>;

#[tauri::command]
async fn update_settings(settings: Settings) -> Result<(), String>;

// Permission Commands
#[tauri::command]
fn check_permissions() -> Result<PermissionStatus, String>;

#[tauri::command]
fn request_permission(permission: Permission) -> Result<(), String>;

// Comet-AI Commands
#[tauri::command]
async fn comet_execute(action: CometAction) -> Result<CometResult, String>;

#[tauri::command]
async fn comet_connect() -> Result<bool, String>;

#[tauri::command]
async fn comet_disconnect() -> Result<(), String>;
```

---

## 📦 Build Configuration

### XcodeGen (project.yml)

```yaml
name: Nexus-AI
options:
  bundleIdPrefix: com.nexus-ai
  deploymentTarget:
    macOS: "13.0"
  xcodeVersion: "15.0"
  generateEmptyDirectories: true

settings:
  base:
    PRODUCT_NAME: Nexus-AI
    MARKETING_VERSION: 0.1.0
    CURRENT_PROJECT_VERSION: 1
    SWIFT_VERSION: "5.9"
    MACOSX_DEPLOYMENT_TARGET: "13.0"
    CODE_SIGN_STYLE: Automatic
    ENABLE_HARDENED_RUNTIME: YES
    CODE_SIGN_IDENTITY: "-"

targets:
  Nexus-AI:
    type: application
    platform: macOS
    sources:
      - path: src
        excludes:
          - "**/*.md"
    settings:
      base:
        INFOPLIST_FILE: Info.plist
        CODE_SIGN_ENTITLEMENTS: Nexus-AI.entitlements
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        COMBINE_HIDPI_IMAGES: YES
        LD_RUNPATH_SEARCH_PATHS:
          - "@executable_path/../Frameworks"
    entitlements:
      path: Nexus-AI.entitlements
```

---

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| Cold Start | < 2 seconds |
| Hot Start | < 500ms |
| Memory (Idle) | < 30 MB |
| Memory (Active Chat) | < 100 MB |
| Bundle Size | < 15 MB |
| LLM Response Start | < 500ms (local) |
| Screen Capture | < 200ms |
| Encryption/Decryption | < 10ms per operation |

---

## 🧪 Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         ▲                                        │
│                        /E2E\                                     │
│                       /─────\                                    │
│                      /Integration\                               │
│                     /───────────\                               │
│                    /  Unit Tests  \                             │
│                   /────────────────\                            │
│                                                                  │
│  E2E:        Playwright tests for full user flows               │
│  Integration: Tauri IPC tests, LLM provider tests              │
│  Unit:       Individual function tests, security tests          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*Last Updated: 2026-04-15*
