# Nexus-AI - Milestones

## Project Overview
**Nexus-AI** - Native macOS AI assistant with Thuki-inspired floating overlay, multi-LLM support, and enterprise security.

**Started:** 2026-04-15  
**Status:** Planning Phase  
**Tech Stack:** SwiftUI + Tauri v2 (Rust) + LocalAuthentication + CryptoKit

---

## Milestone 1: Foundation ✅
**Date:** 2026-04-15  
**Status:** Completed  
**Tasks:** 3/6

### Completed
- ✅ Project directory structure created
- ✅ todos/ folder created
- ✅ milestones/ folder created

### Pending
- ⏳ Initialize Tauri v2 project
- ⏳ Configure tauri.conf.json
- ⏳ Set up XcodeGen

---

## Milestone 2: Rust Backend
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 6

### Tasks
- [ ] Double-tap Control activation (activator.rs)
- [ ] NSPanel setup (lib.rs)
- [ ] System tray integration
- [ ] LLM providers module
- [ ] Comet-AI IPC bridge
- [ ] Action chain executor

---

## Milestone 3: Security
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 5

### Tasks
- [ ] BiometricAuth.swift (Touch ID / Face ID)
- [ ] KeychainManager.swift (iCloud sync)
- [ ] SecureStorage.swift (AES-256-GCM)
- [ ] SecureEnclave integration
- [ ] PermissionManager.swift (TCC)

---

## Milestone 4: SwiftUI Frontend
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 8

### Tasks
- [ ] NexusApp.swift
- [ ] AskBarView.swift
- [ ] ConversationView.swift
- [ ] ChatBubble.swift
- [ ] HistoryPanel.swift
- [ ] SettingsView.swift
- [ ] PermissionsView.swift
- [ ] OnboardingView.swift

---

## Milestone 5: LLM Providers
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 6

### Tasks
- [ ] Ollama (local)
- [ ] OpenAI (GPT-4)
- [ ] Anthropic (Claude)
- [ ] Google (Gemini)
- [ ] Groq
- [ ] OpenRouter

---

## Milestone 6: Documentation
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 8

### Tasks
- [ ] README.md
- [ ] CONTRIBUTING.md
- [ ] SECURITY.md
- [ ] ARCHITECTURE.md
- [ ] GitHub Actions release.yml
- [ ] GitHub Actions test.yml
- [ ] GitHub Actions lint.yml
- [ ] Complete docs folder

---

## Milestone 7: Comet-AI Cleanup
**Date:** TBD  
**Status:** Not Started  
**Tasks:** 4

### Tasks
- [ ] Remove ThukiV2Panel.tsx
- [ ] Remove ThukiAssistant.tsx
- [ ] Remove thuki/ folder
- [ ] Update AGENTS.md

---

## Milestone 8: v1.0.0 Release
**Date:** TBD  
**Status:** Not Started  
**Tasks:** TBD

### Goals
- [ ] All phases complete
- [ ] Tests passing
- [ ] Documentation complete
- [ ] GitHub release created
- [ ] Homebrew formula (optional)

---

## Release History

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | TBD | Initial release |
| 1.0.0 | TBD | First stable release |

---

*Last Updated: 2026-04-15*
