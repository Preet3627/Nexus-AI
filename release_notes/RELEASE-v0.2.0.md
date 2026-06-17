# Release Notes - Nexus-AI v0.2.0

We are thrilled to release **Nexus-AI v0.2.0**, introducing **Comet-AI Browser Automation**, **Enterprise-grade Security**, **Conversational Personalization**, and **Local Private Memory Retrieval**.

---

## What's New in v0.2.0

### 🔗 Comet-AI Bridge
Full integration with Comet-AI browser for automation. Play music on YouTube with auto-click, execute JavaScript, manage tabs, capture page content — all through a local HTTP bridge on port 9922.
- **Reliable Connection**: Retry logic with exponential backoff handles lazy-loading services.
- **Auto-Discovery**: Finds Comet-AI.app automatically even if not in /Applications/.

### 🛡️ Hardcoded Risk Permissions & Touch ID
Moved the risk assessment model from the AI into local compiled code.
- **High Risk Commands**: Shell execution and unrecognized operations require Touch ID.
- **Low/Medium Risk Commands**: Volume, music, web search, app opening default to user preferences.

### ⚠️ Native Warning Interruption Popups
Thuki now uses `/warn` to pop up a fully native macOS warning modal for dangerous instructions, interrupting execution until you explicitly approve or cancel.

### 🎛️ Command Automation Panel
A polished "Command Automation" controller in the **Settings Panel** lets you toggle individual low/medium risk actions between **Auto-execute** and **Verify with Touch ID**.

### 🧠 Private Long-Term Memory (Local RAG)
Pure-Rust semantic retrieval engine stores facts about your workflow in a local, encrypted `memories.json`. Every prompt searches memory and injects relevant context into the system prompt — no data leaves your computer.

### 🎭 Tone Profiles Switcher
Adapt Thuki's personality: `default`, `serious`, or `funny`. Command "be serious" or "switch to funny profile" to immediately change response formatting.

---

## Upgrades & Core Enhancements
1. **Comet-AI Bridge**: Browser automation API with retry + auto-discovery.
2. **Simplified AI Payload Schema**: Removed `risk` from LLM output JSON.
3. **Full SQLite Settings Persistence**: Automation preferences survive restarts.
4. **Tauri v2.11.0**: Updated framework.
5. **Streamlined Onboarding**: Skip intro, overlay shows directly.
