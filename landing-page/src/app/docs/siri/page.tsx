'use client'

import { useState } from 'react'
import { Mic, ChevronRight, Copy, Check, ExternalLink, CheckCircle2, Zap } from 'lucide-react'

const siriIntents = [
  {
    name: 'AskNexusIntent',
    description: 'Ask Nexus a question via Siri',
    parameters: [{ name: 'query', type: 'String', required: true }],
    example: '"Hey Siri, ask Nexus to summarize my emails"',
    category: 'Core',
  },
  {
    name: 'ToggleOverlayIntent',
    description: 'Show or hide the overlay window',
    parameters: [{ name: 'action', type: '"show" | "hide"', required: false }],
    example: '"Hey Siri, open Nexus AI"',
    category: 'Navigation',
  },
  {
    name: 'GetStatusIntent',
    description: 'Get current status or recent activity',
    parameters: [],
    example: '"Hey Siri, what\'s Nexus doing?"',
    category: 'Info',
  },
  {
    name: 'RunAutomationIntent',
    description: 'Execute a saved automation by name',
    parameters: [{ name: 'automationName', type: 'String', required: true }],
    example: '"Hey Siri, run my morning routine"',
    category: 'Automation',
  },
  {
    name: 'SearchIntent',
    description: 'Search through conversation history',
    parameters: [{ name: 'query', type: 'String', required: true }],
    example: '"Hey Siri, search Nexus for meeting notes"',
    category: 'Search',
  },
  {
    name: 'CaptureScreenIntent',
    description: 'Capture screen and analyze with AI',
    parameters: [],
    example: '"Hey Siri, analyze my screen with Nexus"',
    category: 'Screen',
  },
]

const siriShortcuts = [
  {
    title: 'Quick Ask',
    phrase: '"Ask Nexus"',
    action: 'Opens overlay with voice input ready',
    icon: Mic,
  },
  {
    title: 'Summarize',
    phrase: '"Summarize for Nexus"',
    action: 'Opens clipboard content in overlay for summarization',
    icon: Mic,
  },
  {
    title: 'Screen Analyze',
    phrase: '"Analyze screen for Nexus"',
    action: 'Captures screen and opens in overlay',
    icon: Mic,
  },
  {
    title: 'Morning Brief',
    phrase: '"Nexus morning brief"',
    action: 'Runs scheduled morning automation',
    icon: Mic,
  },
]

const implementationCode = `import AppIntents

struct AskNexusIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Nexus"
    static var description = IntentDescription("Ask Nexus AI a question")
    
    @Parameter(title: "Question")
    var query: String
    
    static var parameterSummary: some ParameterSummary {
        Summary("Ask \(\\.$query)")
    }
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Send to overlay window
        NotificationCenter.default.post(
            name: .askNexus,
            object: nil,
            userInfo: ["query": query]
        )
        
        return .result(dialog: "Opening Nexus with your question...")
    }
}

struct NexusShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskNexusIntent(),
            phrases: [
                "Ask \(\.$template) in \(.applicationName)",
                "Ask Nexus \(\.$template)"
            ],
            shortTitle: "Ask Nexus",
            systemImageName: "sparkles"
        )
    }
}`

const setupSteps = [
  {
    step: 1,
    title: 'Enable Siri Integration',
    description: 'In Nexus settings, navigate to "Siri & Shortcuts" and enable Siri integration.',
  },
  {
    step: 2,
    title: 'Add to Siri',
    description: 'Siri shortcuts are automatically registered when you first use them.',
  },
  {
    step: 3,
    title: 'Customize Phrases',
    description: 'Long-press a shortcut in the Shortcuts app to customize the trigger phrase.',
  },
  {
    step: 4,
    title: 'Test',
    description: 'Try "Hey Siri, ask Nexus [your question]" to verify everything works.',
  },
]

export default function SiriPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Mic className="w-10 h-10 text-purple-400" />
          Siri Integration
        </h1>
        <p className="text-white/60">
          Control Nexus-AI with your voice using Siri shortcuts and App Intents.
        </p>
      </div>

      {/* Quick Shortcuts */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Shortcuts</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {siriShortcuts.map((shortcut, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <shortcut.icon className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="font-semibold">{shortcut.title}</h3>
              </div>
              <p className="text-sm text-purple-400 font-mono mb-2">{shortcut.phrase}</p>
              <p className="text-sm text-white/60">{shortcut.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Available Intents */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Intents</h2>
        <div className="space-y-4">
          {siriIntents.map((intent, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-purple-400">{intent.name}</h3>
                  <p className="text-sm text-white/60">{intent.description}</p>
                </div>
                <span className="px-2 py-1 rounded bg-white/10 text-xs text-white/60">
                  {intent.category}
                </span>
              </div>
              
              {intent.parameters.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1">Parameters:</p>
                  <div className="flex flex-wrap gap-2">
                    {intent.parameters.map((param, j) => (
                      <code key={j} className="px-2 py-1 rounded bg-white/5 text-sm">
                        <span className="text-pink-400">{param.name}</span>
                        <span className="text-white/40">: </span>
                        <span className="text-green-400">{param.type}</span>
                        {param.required && (
                          <span className="text-orange-400 ml-1">*</span>
                        )}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/40">Example:</span>
                <code className="text-purple-400">{intent.example}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Implementation */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Implementation</h2>
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-sm text-white/60 font-mono">SiriIntegration.swift</span>
            <button
              onClick={() => copyCode(implementationCode, 'siri-code')}
              className="flex items-center gap-1 text-sm text-white/40 hover:text-white"
            >
              {copied === 'siri-code' ? (
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
          <pre className="p-4 overflow-x-auto text-sm font-mono bg-black/30">
            <code className="text-white/80">{implementationCode}</code>
          </pre>
        </div>
      </div>

      {/* Setup Steps */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Setup Guide</h2>
        <div className="space-y-4">
          {setupSteps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                {i < setupSteps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-purple-500/30 my-2" />
                )}
              </div>
              <div className="flex-1 pb-8">
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-white/60">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          Requirements
        </h3>
        <ul className="space-y-2 text-sm text-white/70">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            macOS 13.0 (Ventura) or later
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Siri enabled and signed into iCloud
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Nexus-AI running with Siri integration enabled
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Shortcuts app for customizing phrases
          </li>
        </ul>
      </div>

      {/* External Links */}
      <div className="flex flex-wrap gap-4">
        <a
          href="https://developer.apple.com/documentation/appintents"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-purple-400" />
          App Intents Documentation
        </a>
        <a
          href="https://support.apple.com/guide/shortcuts/welcome/welcome"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-purple-400" />
          Shortcuts User Guide
        </a>
      </div>
    </div>
  )
}
