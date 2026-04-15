'use client'

import Link from 'next/link'
import { 
  Code2, 
  Layers, 
  Shield, 
  Monitor, 
  Zap, 
  Globe,
  Database,
  FileCode,
  Settings,
  Box,
  Sparkles,
  GitBranch,
  Terminal,
} from 'lucide-react'

const categories = [
  {
    name: 'Frontend (SwiftUI)',
    icon: Monitor,
    color: 'purple',
    components: [
      { name: 'NexusApp.swift', lines: 100, description: 'App entry point' },
      { name: 'AskBarView.swift', lines: 450, description: 'Spotlight input' },
      { name: 'ConversationView.swift', lines: 300, description: 'Chat interface' },
      { name: 'ChatBubble.swift', lines: 150, description: 'Message bubbles' },
      { name: 'HistoryPanel.swift', lines: 200, description: 'Conversation history' },
      { name: 'SettingsView.swift', lines: 250, description: 'Configuration UI' },
      { name: 'PermissionsView.swift', lines: 180, description: 'TCC permissions' },
      { name: 'OnboardingView.swift', lines: 220, description: 'First-run setup' },
    ],
  },
  {
    name: 'Security Module',
    icon: Shield,
    color: 'pink',
    components: [
      { name: 'BiometricAuth.swift', lines: 150, description: 'Touch ID / Face ID' },
      { name: 'SecureStorage.swift', lines: 100, description: 'AES encryption' },
      { name: 'KeychainManager.swift', lines: 200, description: 'Keychain access' },
      { name: 'PermissionManager.swift', lines: 150, description: 'TCC checks' },
    ],
  },
  {
    name: 'Backend (Rust/Tauri)',
    icon: Terminal,
    color: 'orange',
    components: [
      { name: 'main.rs', lines: 50, description: 'Entry point' },
      { name: 'lib.rs', lines: 400, description: 'NSPanel setup' },
      { name: 'activator.rs', lines: 500, description: 'Double-tap Control' },
      { name: 'llm_providers.rs', lines: 600, description: 'Multi-LLM support' },
      { name: 'comet_bridge.rs', lines: 400, description: 'Comet-AI IPC' },
      { name: 'security.rs', lines: 200, description: 'Encryption utils' },
      { name: 'storage.rs', lines: 300, description: 'SQLite database' },
      { name: 'screenshot.rs', lines: 300, description: 'Screen capture' },
    ],
  },
  {
    name: 'Configuration',
    icon: Settings,
    color: 'green',
    components: [
      { name: 'Cargo.toml', lines: 80, description: 'Rust dependencies' },
      { name: 'tauri.conf.json', lines: 60, description: 'Tauri config' },
      { name: 'Info.plist', lines: 50, description: 'App metadata' },
      { name: 'project.yml', lines: 40, description: 'XcodeGen' },
    ],
  },
]

const totalStats = {
  totalComponents: categories.reduce((acc, cat) => acc + cat.components.length, 0),
  totalLines: categories.reduce((acc, cat) => acc + cat.components.reduce((a, c) => a + c.lines, 0), 0),
  swiftFiles: categories[0].components.length + categories[1].components.length,
  rustFiles: categories[2].components.length,
}

export default function ComponentsPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Components</h1>
          <p className="text-white/60">
            {totalStats.totalComponents} components across {totalStats.swiftFiles + totalStats.rustFiles} files
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="glass rounded-xl p-6 text-center">
            <Box className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{totalStats.totalComponents}</div>
            <div className="text-sm text-white/60">Components</div>
          </div>
          <div className="glass rounded-xl p-6 text-center">
            <Code2 className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{totalStats.totalLines.toLocaleString()}</div>
            <div className="text-sm text-white/60">Lines of Code</div>
          </div>
          <div className="glass rounded-xl p-6 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{totalStats.swiftFiles}</div>
            <div className="text-sm text-white/60">Swift Files</div>
          </div>
          <div className="glass rounded-xl p-6 text-center">
            <GitBranch className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="text-2xl font-bold">{totalStats.rustFiles}</div>
            <div className="text-sm text-white/60">Rust Files</div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-12">
          {categories.map((category) => (
            <div key={category.name} className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <category.icon className={`w-6 h-6 text-${category.color}-400`} />
                <h2 className="text-xl font-bold">{category.name}</h2>
                <span className="text-sm text-white/40">
                  {category.components.length} files
                </span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.components.map((component) => (
                  <div 
                    key={component.name}
                    className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-medium">
                        {component.name}
                      </span>
                      <span className="text-xs text-white/40">
                        {component.lines} lines
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      {component.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Architecture Diagram */}
        <div className="mt-12 glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">Architecture</h2>
          <div className="font-mono text-sm">
            <div className="flex items-center justify-center gap-8">
              <div className="p-4 bg-purple-500/20 rounded-xl text-center">
                <Monitor className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <div className="text-purple-400">SwiftUI Frontend</div>
                <div className="text-xs text-white/60">2,750 lines</div>
              </div>
              <div className="text-white/40">→</div>
              <div className="p-4 bg-pink-500/20 rounded-xl text-center">
                <Layers className="w-8 h-8 mx-auto mb-2 text-pink-400" />
                <div className="text-pink-400">Tauri IPC</div>
                <div className="text-xs text-white/60">Bridge</div>
              </div>
              <div className="text-white/40">→</div>
              <div className="p-4 bg-orange-500/20 rounded-xl text-center">
                <Terminal className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                <div className="text-orange-400">Rust Backend</div>
                <div className="text-xs text-white/60">2,750 lines</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass hover:bg-white/10 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
