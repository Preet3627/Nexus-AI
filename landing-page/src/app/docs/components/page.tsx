'use client'

import { useState } from 'react'
import { FileCode, Copy, Check, ChevronDown, ChevronRight, Hash } from 'lucide-react'

const componentDocs = [
  {
    name: 'NexusApp.swift',
    path: 'src/App/NexusApp.swift',
    lines: 145,
    description: 'Main application entry point. Initializes the app, configures global settings, and manages app lifecycle.',
    responsibilities: [
      'App initialization and configuration',
      'Global state management',
      'Menu bar controller setup',
      'Overlay window management',
    ],
    code: `@main
struct NexusApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
        .commands {
            CommandMenu("Nexus") {
                Button("Toggle Overlay") {
                    OverlayManager.shared.toggle()
                }
                .keyboardShortcut("k", modifiers: [.command, .control])
            }
        }
    }
}`,
  },
  {
    name: 'MenuBarController.swift',
    path: 'src/App/MenuBarController.swift',
    lines: 198,
    description: 'Manages the menu bar icon and dropdown menu for quick access without dock presence.',
    responsibilities: [
      'Menu bar icon rendering (NSStatusBar)',
      'Status menu configuration',
      'Quick actions menu',
      'Preferences access',
    ],
    code: `class MenuBarController: NSObject {
    private var statusItem: NSStatusItem?
    private var menu: NSMenu?
    
    func setup() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem?.button?.image = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "Nexus")
        
        menu = NSMenu()
        menu?.addItem(NSMenuItem(title: "Open Nexus", action: #selector(openOverlay), keyEquivalent: ""))
        menu?.addItem(NSMenuItem.separator())
        menu?.addItem(NSMenuItem(title: "Preferences...", action: #selector(openSettings), keyEquivalent: ","))
        menu?.addItem(NSMenuItem.separator())
        menu?.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))
        
        statusItem?.menu = menu
    }
}`,
  },
  {
    name: 'OverlayWindow.swift',
    path: 'src/Views/OverlayWindow.swift',
    lines: 267,
    description: 'Custom floating panel window that appears on hotkey activation. Uses NSPanel for system-level floating behavior.',
    responsibilities: [
      'Window positioning and animation',
      'Floating panel behavior (NSWindow.Level.floating)',
      'Shadow and blur effects (NSVisualEffectView)',
      'Keyboard event handling',
    ],
    code: `class OverlayWindow: NSPanel {
    init() {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 600, height: 500),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        
        level = .floating
        isOpaque = false
        backgroundColor = .clear
        hasShadow = true
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        // Vibrancy effect
        let visualEffect = NSVisualEffectView()
        visualEffect.blendingMode = .behindWindow
        visualEffect.material = .hudWindow
        visualEffect.state = .active
        contentView = visualEffect
    }
}`,
  },
  {
    name: 'ConversationView.swift',
    path: 'src/Views/ConversationView.swift',
    lines: 312,
    description: 'Main chat interface displaying conversation history with auto-scroll and pagination.',
    responsibilities: [
      'Message list rendering (LazyVStack)',
      'Auto-scroll to bottom on new messages',
      'Load more pagination',
      'Message timestamp display',
    ],
    code: `struct ConversationView: View {
    @EnvironmentObject var viewModel: ConversationViewModel
    @State private var scrollProxy: ScrollViewProxy?
    
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.messages) { message in
                        ChatBubble(message: message)
                            .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) { _ in
                withAnimation {
                    proxy.scrollTo(viewModel.messages.last?.id)
                }
            }
        }
    }
}`,
  },
  {
    name: 'ChatBubble.swift',
    path: 'src/Views/ChatBubble.swift',
    lines: 189,
    description: 'Individual message bubble component with user/AI differentiation and markdown support.',
    responsibilities: [
      'User/AI message differentiation styling',
      'Markdown rendering with custom parser',
      'Code block syntax highlighting',
      'Copy message action',
    ],
    code: `struct ChatBubble: View {
    let message: Message
    @State private var copied = false
    
    var body: some View {
        HStack {
            if message.role == .user { Spacer() }
            
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                MarkdownText(message.content)
                    .padding(12)
                    .background(bubbleBackground)
                    .cornerRadius(16)
                
                if message.role == .assistant {
                    HStack(spacing: 8) {
                        Button(action: copyMessage) {
                            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                                .font(.caption)
                        }
                    }
                    .opacity(copied ? 1 : 0)
                }
            }
            
            if message.role == .assistant { Spacer() }
        }
    }
}`,
  },
  {
    name: 'AskBarView.swift',
    path: 'src/Views/AskBarView.swift',
    lines: 156,
    description: 'Input field for asking questions with slash command detection and auto-complete.',
    responsibilities: [
      'Text input with @State',
      'Slash command detection (/screen, /think)',
      'Auto-complete suggestions dropdown',
      'Voice input trigger (⌘⇧M)',
    ],
    code: `struct AskBarView: View {
    @Binding var text: String
    @State private var showSuggestions = false
    @State private var suggestions: [Command] = []
    
    var body: some View {
        HStack(spacing: 12) {
            TextField("Ask Nexus anything...", text: $text)
                .textFieldStyle(.plain)
                .onChange(of: text) { newValue in
                    if newValue.hasPrefix("/") {
                        suggestions = Command.all.filter {
                            $0.name.hasPrefix(newValue.lowercased())
                        }
                        showSuggestions = !suggestions.isEmpty
                    } else {
                        showSuggestions = false
                    }
                }
            
            Button(action: sendMessage) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title2)
            }
            .disabled(text.isEmpty)
        }
        .padding(12)
        .background(Color.white.opacity(0.05))
        .cornerRadius(12)
    }
}`,
  },
  {
    name: 'SettingsView.swift',
    path: 'src/Views/SettingsView.swift',
    lines: 423,
    description: 'Comprehensive settings panel for app configuration with sections for LLM, security, and appearance.',
    responsibilities: [
      'LLM provider selection (Ollama/OpenAI/Anthropic)',
      'API key management with secure storage',
      'Theme customization (glass presets)',
      'Shortcut configuration',
    ],
    code: `struct SettingsView: View {
    @StateObject private var settings = SettingsManager()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            LLMSettingsTab()
                .tabItem { Label("AI", systemImage: "brain") }
                .tag(0)
            
            SecuritySettingsTab()
                .tabItem { Label("Security", systemImage: "lock.shield") }
                .tag(1)
            
            AppearanceSettingsTab()
                .tabItem { Label("Appearance", systemImage: "paintbrush") }
                .tag(2)
            
            ShortcutsTab()
                .tabItem { Label("Shortcuts", systemImage: "keyboard") }
                .tag(3)
        }
    }
}`,
  },
  {
    name: 'BiometricAuthService.swift',
    path: 'src/Services/BiometricAuthService.swift',
    lines: 178,
    description: 'Touch ID/Face ID authentication service using LocalAuthentication framework.',
    responsibilities: [
      'Biometric availability check (LAContext.canEvaluatePolicy)',
      'Authentication prompts with reason string',
      'Fallback to device passcode',
      'Secure Enclave access verification',
    ],
    code: `class BiometricAuthService {
    static let shared = BiometricAuthService()
    
    func canUseBiometrics() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    func authenticate(reason: String) async -> Result<Bool, Error> {
        let context = LAContext()
        context.localizedCancelTitle = "Cancel"
        
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return .success(success)
        } catch {
            // Fallback to passcode
            return await authenticateWithPasscode(reason: reason)
        }
    }
}`,
  },
  {
    name: 'KeychainService.swift',
    path: 'src/Services/KeychainService.swift',
    lines: 234,
    description: 'Secure storage for API keys and sensitive data using macOS Keychain Services.',
    responsibilities: [
      'Keychain CRUD operations (SecItemAdd/SecItemCopyMatching)',
      'Access control policies (kSecAttrAccessibleWhenUnlocked)',
      'Data encryption before storage',
      'Service isolation for multiple keys',
    ],
    code: `class KeychainService {
    static let shared = KeychainService()
    private let service = "com.nexus-ai.app"
    
    func save(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else { return }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
        ]
        
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unableToSave
        }
    }
}`,
  },
  {
    name: 'LLMManager.swift',
    path: 'src/Services/LLMManager.swift',
    lines: 289,
    description: 'Manages connections to various LLM providers with unified interface.',
    responsibilities: [
      'Provider abstraction (Protocol-based)',
      'Request/response handling with async/await',
      'Token usage tracking and limits',
      'Fallback mechanisms on failure',
    ],
    code: `protocol LLMProvider {
    func complete(prompt: String, options: CompletionOptions) async throws -> LLMResponse
}

class LLMManager: ObservableObject {
    @Published var currentProvider: LLMProvider?
    
    func setProvider(_ provider: LLMProvider) {
        currentProvider = provider
    }
    
    func complete(prompt: String) async throws -> LLMResponse {
        guard let provider = currentProvider else {
            throw LLMError.noProviderSelected
        }
        return try await provider.complete(prompt: prompt, options: .default)
    }
}`,
  },
  {
    name: 'AutomationScheduler.swift',
    path: 'src-tauri/src/automation_scheduler.rs',
    lines: 342,
    description: 'Rust backend for scheduling automated tasks with cron expression support.',
    responsibilities: [
      'Cron expression parsing (node-cron)',
      'Task queue management with priority',
      'Retry logic with exponential backoff',
      'Persistence layer (JSON file)',
    ],
    code: `use node_cron::ScheduledTask;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub cron: String,
    pub action: AutomationAction,
    pub enabled: bool,
    pub last_run: Option<DateTime<Utc>>,
}

impl AutomationScheduler {
    pub fn add_automation(&mut self, automation: Automation) -> Result<(), SchedulerError> {
        let task = self.scheduler.schedule(&automation.cron, move || {
            self.execute_automation(automation.clone());
        })?;
        self.tasks.insert(automation.id.clone(), task);
        self.persist()?;
        Ok(())
    }
}`,
  },
  {
    name: 'AutoLaunchService.swift',
    path: 'src-tauri/src/auto_launch.rs',
    lines: 156,
    description: 'Handles auto-startup configuration for macOS LaunchAgent.',
    responsibilities: [
      'Platform-specific startup entries',
      'LaunchAgent plist creation',
      'Hidden mode configuration (LSUIElement)',
      'Startup delay settings',
    ],
    code: `use plist::Value;

pub struct AutoLaunchService;

impl AutoLaunchService {
    pub fn enable(&self, app_path: &str) -> Result<(), AutoLaunchError> {
        let plist = self.create_plist(app_path)?;
        let path = self.launch_agent_path()?;
        std::fs::write(&path, plist)?;
        Ok(())
    }
    
    fn create_plist(&self, app_path: &str) -> Result<String, AutoLaunchError> {
        let mut plist = Value::Dictionary::new();
        plist.insert("Label".to_string(), Value::String("com.nexus-ai.agent".to_string()));
        plist.insert("ProgramArguments".to_string(), vec![
            Value::String(app_path.to_string()),
            Value::String("--hidden".to_string()),
        ]);
        plist.insert("RunAtLoad".to_string(), Value::Boolean(true));
        Ok(plist.to_string())
    }
}`,
  },
]

export default function ComponentsPage() {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4">Components</h1>
        <p className="text-white/60">
          Complete documentation of all {componentDocs.length} components with line counts, 
          descriptions, and code analysis.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{componentDocs.length}</div>
          <div className="text-sm text-white/60">Components</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-pink-400">
            {componentDocs.reduce((sum, c) => sum + c.lines, 0).toLocaleString()}
          </div>
          <div className="text-sm text-white/60">Total Lines</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">4</div>
          <div className="text-sm text-white/60">Languages</div>
        </div>
      </div>

      {/* Components List */}
      <div className="space-y-4">
        {componentDocs.map((component) => (
          <div key={component.name} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedComponent(
                expandedComponent === component.name ? null : component.name
              )}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{component.name}</h3>
                  <p className="text-sm text-white/60 font-mono">{component.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-white/40">
                  <Hash className="w-4 h-4" />
                  {component.lines}
                </span>
                {expandedComponent === component.name ? (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/40" />
                )}
              </div>
            </button>

            {expandedComponent === component.name && (
              <div className="border-t border-white/5">
                <div className="p-4 border-b border-white/5">
                  <p className="text-white/80">{component.description}</p>
                </div>

                <div className="p-4 border-b border-white/5">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3">Responsibilities</h4>
                  <ul className="space-y-2">
                    {component.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-purple-400">Code Sample</h4>
                    <button
                      onClick={() => copyCode(component.code, component.name)}
                      className="flex items-center gap-1 text-sm text-white/40 hover:text-white"
                    >
                      {copied === component.name ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-black/30 rounded-lg overflow-x-auto text-sm font-mono">
                    <code className="text-white/80">{component.code}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Structure */}
      <div>
        <h2 className="text-2xl font-bold mb-4">File Structure</h2>
        <div className="glass rounded-xl p-6">
          <div className="font-mono text-sm">
            <div className="text-white/60">Nexus-AI/</div>
            <div className="pl-4">
              <div className="text-purple-400">src/</div>
              <div className="pl-4">
                <div className="text-blue-400">App/</div>
                <div className="pl-4 text-white/80">NexusApp.swift</div>
                <div className="pl-4 text-white/80">MenuBarController.swift</div>
                <div className="pl-4 text-white/80">SiriIntegration.swift</div>
                <div className="text-pink-400">Views/</div>
                <div className="pl-4 text-white/80">ConversationView.swift</div>
                <div className="pl-4 text-white/80">ChatBubble.swift</div>
                <div className="pl-4 text-white/80">AskBarView.swift</div>
                <div className="pl-4 text-white/80">SettingsView.swift</div>
                <div className="pl-4 text-white/80">Theme.swift</div>
                <div className="text-orange-400">Services/</div>
                <div className="pl-4 text-white/80">BiometricAuthService.swift</div>
                <div className="pl-4 text-white/80">KeychainService.swift</div>
                <div className="pl-4 text-white/80">LLMManager.swift</div>
                <div className="pl-4 text-white/80">SystemControlService.swift</div>
              </div>
              <div className="text-green-400">src-tauri/src/</div>
              <div className="pl-4 text-white/80">main.rs</div>
              <div className="pl-4 text-white/80">overlay.rs</div>
              <div className="pl-4 text-white/80">screenshot.rs</div>
              <div className="pl-4 text-white/80">auto_launch.rs</div>
              <div className="pl-4 text-white/80">automation_scheduler.rs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
