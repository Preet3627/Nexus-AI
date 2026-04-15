'use client'

import { Command, Search, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const slashCommands = [
  { command: '/screen', description: 'Capture and analyze screen content', usage: '/screen' },
  { command: '/think', description: 'Enable deep reasoning mode', usage: '/think [question]' },
  { command: '/summarize', description: 'Summarize conversation or text', usage: '/summarize' },
  { command: '/search', description: 'Search the web', usage: '/search [query]' },
  { command: '/translate', description: 'Translate text', usage: '/translate [to lang] [text]' },
  { command: '/code', description: 'Generate code', usage: '/code [language] [description]' },
  { command: '/image', description: 'Generate image', usage: '/image [description]' },
  { command: '/automation', description: 'Create or manage automations', usage: '/automation [action]' },
  { command: '/export', description: 'Export conversation', usage: '/export [format]' },
  { command: '/theme', description: 'Change theme', usage: '/theme [name]' },
  { command: '/help', description: 'Show all commands', usage: '/help' },
  { command: '/clear', description: 'Clear conversation', usage: '/clear' },
]

export default function CommandsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Command className="w-10 h-10 text-purple-400" />
          Action Chains
        </h1>
        <p className="text-white/60">
          Slash commands for quick actions. Type <code className="px-2 py-1 rounded bg-white/10 text-purple-400">/</code> to see suggestions.
        </p>
      </div>

      {/* Quick Demo */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold">Try it</h3>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
          <span className="text-white/40">/</span>
          <span className="text-white/60">Type a command...</span>
          <div className="ml-auto flex gap-1">
            <kbd className="px-2 py-1 rounded bg-white/10 text-xs">Tab</kbd>
            <span className="text-xs text-white/40">to complete</span>
          </div>
        </div>
      </div>

      {/* Commands List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Commands</h2>
        <div className="space-y-3">
          {slashCommands.map((cmd, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <code className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 font-mono">
                  {cmd.command}
                </code>
                <span className="text-white/70">{cmd.description}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <code className="text-sm text-white/40 font-mono">{cmd.usage}</code>
                <button
                  onClick={() => copyCommand(cmd.usage, cmd.command)}
                  className="p-1.5 rounded hover:bg-white/10"
                >
                  {copied === cmd.command ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/40" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Examples</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 text-purple-400">Screen Analysis</h4>
            <p className="text-sm text-white/60 mb-2">Capture your screen and ask questions about it.</p>
            <code className="block p-2 rounded bg-black/30 text-sm">
              /screen what's shown in this window?
            </code>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 text-purple-400">Deep Reasoning</h4>
            <p className="text-sm text-white/60 mb-2">Enable chain-of-thought reasoning for complex problems.</p>
            <code className="block p-2 rounded bg-black/30 text-sm">
              /think explain how neural networks learn
            </code>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 text-purple-400">Code Generation</h4>
            <p className="text-sm text-white/60 mb-2">Generate code in any language.</p>
            <code className="block p-2 rounded bg-black/30 text-sm">
              /code python quicksort function
            </code>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 text-purple-400">Translation</h4>
            <p className="text-sm text-white/60 mb-2">Translate text to any language.</p>
            <code className="block p-2 rounded bg-black/30 text-sm">
              /translate to french Hello, how are you?
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
