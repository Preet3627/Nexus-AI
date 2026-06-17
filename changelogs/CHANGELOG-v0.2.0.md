# Changelog - v0.2.0

All notable changes to the **Nexus-AI** application are documented below.

## [0.2.0] - 2026-06-17

### Added
* **Comet-AI Bridge Integration**: New Nexus Bridge API server on port 9922 enabling browser automation, tab management, JavaScript execution, page capture, and content extraction via Comet-AI.
* **Retry & Auto-Discovery**: Connection retry logic with exponential backoff (up to 6 attempts) for lazy-loading services, plus auto-detection of Comet-AI in development folders (not just /Applications/).
* **Hardcoded Risk Permission Model**: Replaced AI-directed risk levels with robust, client-hardcoded permission definitions (Low, Medium, High).
* **Biometric Touch ID Enforcement**: Enforced mandatory Touch ID verification for all High-risk operations (e.g. system shell executions) and unrecognized commands.
* **Command Automation Controls**: Added a visual dashboard in the Settings Panel enabling users to switch Low/Medium risk commands between "auto-execute" and "verify with Touch ID" modes.
* **Native macOS Warning Popups**: Programmed a native macOS alert pop-up (`osascript`) allowing the AI to safely interrupt actions and prompt the user with system risks on potentially destructive instructions.
* **Local Private RAG Memory**: Integrated an entirely local keyword semantic memory store (`memories.json`) built in pure Rust. It parses questions and overlays matching facts to the LLM system prompt dynamically across sessions.
* **Tone & Formatting Profiles**: Added profile structures (`default`, `serious`, `funny`) switchable via conversation commands to adjust response formatting and tones immediately.

### Changed
* **Simplified AI Payload Schema**: Removed `risk` from LLM output JSON formats to speed up parsing and completely mitigate hallucinated safety permissions.
* **Settings Persistence**: Expanded both SQLite storage and TypeScript states to save and load user automation preferences on startup.
* **Onboarding Flow**: Skip intro animation, show overlay directly on startup.
* **Tauri v2.11.0**: Updated to latest Tauri framework version.

### Fixed
* **Comet-AI "service unavailable" error**: Nexus now retries the connection with backoff and auto-discovers Comet-AI in dev directories (e.g. `~/Developer/Projects/Comet-AI/`).
