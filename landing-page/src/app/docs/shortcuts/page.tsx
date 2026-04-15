'use client'

import { useState } from 'react'
import { Keyboard, Search, Copy, Check, Command, Hash } from 'lucide-react'

const keyboardShortcuts = [
  {
    category: 'Global',
    shortcuts: [
      { keys: ['⌃', '⌃'], description: 'Toggle overlay', notes: 'Double-tap Control key' },
      { keys: ['⌘', 'K'], description: 'Search', notes: 'Opens search modal' },
      { keys: ['⌘', '?'], description: 'Show shortcuts', notes: 'Display all shortcuts' },
      { keys: ['⌘', ','], description: 'Preferences', notes: 'Open settings panel' },
      { keys: ['⌘', 'Q'], description: 'Quit', notes: 'Exit the application' },
    ],
  },
  {
    category: 'Chat',
    shortcuts: [
      { keys: ['⌘', '↵'], description: 'Send message', notes: 'Submit current input' },
      { keys: ['⌘', 'N'], description: 'New conversation', notes: 'Start fresh chat' },
      { keys: ['⌘', '⇧', 'N'], description: 'New thread', notes: 'Create new thread' },
      { keys: ['Esc'], description: 'Cancel input', notes: 'Clear current text' },
      { keys: ['⌘', 'Z'], description: 'Undo', notes: 'Undo last action' },
      { keys: ['⌘', '⇧', 'Z'], description: 'Redo', notes: 'Redo undone action' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'W'], description: 'Close overlay', notes: 'Hide without quitting' },
      { keys: ['⌘', '['], description: 'Go back', notes: 'Previous view' },
      { keys: ['⌘', ']'], description: 'Go forward', notes: 'Next view' },
      { keys: ['⌘', '↑'], description: 'Top', notes: 'Scroll to top' },
      { keys: ['⌘', '↓'], description: 'Bottom', notes: 'Scroll to bottom' },
    ],
  },
  {
    category: 'Editing',
    shortcuts: [
      { keys: ['⌘', 'A'], description: 'Select all', notes: 'Select entire input' },
      { keys: ['⌘', 'C'], description: 'Copy', notes: 'Copy selection' },
      { keys: ['⌘', 'V'], description: 'Paste', notes: 'Paste from clipboard' },
      { keys: ['⌘', 'X'], description: 'Cut', notes: 'Cut selection' },
      { keys: ['⌘', 'D'], description: 'Duplicate', notes: 'Duplicate message' },
    ],
  },
  {
    category: 'Special',
    shortcuts: [
      { keys: ['/'], description: 'Commands', notes: 'Type "/" for slash commands' },
      { keys: ['⌘', '⇧', 'M'], description: 'Voice input', notes: 'Dictation mode' },
      { keys: ['⌘', '⇧', 'S'], description: 'Screenshot', notes: 'Capture screen' },
      { keys: ['⌘', '⇧', 'C'], description: 'Clipboard', notes: 'Send clipboard to chat' },
    ],
  },
]

const slashCommands = [
  {
    command: '/screen',
    description: 'Capture and analyze screen',
    example: '/screen',
  },
  {
    command: '/think',
    description: 'Enable deep reasoning mode',
    example: '/think How does neural network work?',
  },
  {
    command: '/summarize',
    description: 'Summarize the conversation',
    example: '/summarize',
  },
  {
    command: '/search',
    description: 'Search the web',
    example: '/search latest AI news',
  },
  {
    command: '/translate',
    description: 'Translate text',
    example: '/translate to Spanish Hello world',
  },
  {
    command: '/code',
    description: 'Generate code',
    example: '/code Python function to sort list',
  },
  {
    command: '/image',
    description: 'Generate image',
    example: '/image A beautiful sunset',
  },
  {
    command: '/automation',
    description: 'Create automation',
    example: '/automation daily at 9am',
  },
  {
    command: '/export',
    description: 'Export conversation',
    example: '/export as PDF',
  },
  {
    command: '/theme',
    description: 'Change theme',
    example: '/theme dark',
  },
]

export default function ShortcutsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const copyShortcut = (keys: string[], id: string) => {
    navigator.clipboard.writeText(keys.join(''))
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const filteredShortcuts = searchQuery
    ? keyboardShortcuts.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter((s) =>
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((c) => c.shortcuts.length > 0)
    : keyboardShortcuts

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Keyboard className="w-10 h-10 text-purple-400" />
          Keyboard Shortcuts
        </h1>
        <p className="text-white/60">
          Master Nexus-AI with these keyboard shortcuts and slash commands.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Keyboard Shortcuts */}
      {filteredShortcuts.map((category, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold mb-4 text-purple-400">{category.category}</h2>
          <div className="space-y-2">
            {category.shortcuts.map((shortcut, j) => {
              const id = `${i}-${j}`
              return (
                <div
                  key={j}
                  className="flex items-center justify-between p-3 rounded-lg glass hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 rounded bg-white/10 text-sm font-mono min-w-[2rem] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="font-medium">{shortcut.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/40">{shortcut.notes}</span>
                    <button
                      onClick={() => copyShortcut(shortcut.keys, id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-opacity"
                    >
                      {copied === id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-white/40" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Slash Commands */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Slash Commands</h2>
        <p className="text-white/60 mb-6">
          Type <code className="px-2 py-1 rounded bg-white/10 text-purple-400">/</code> in the chat
          input to access these commands.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {slashCommands.map((cmd, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <code className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-mono">
                  {cmd.command}
                </code>
              </div>
              <p className="text-sm text-white/60 mb-2">{cmd.description}</p>
              <p className="text-xs text-white/40 font-mono">
                Usage: <span className="text-purple-400">{cmd.example}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">Key Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">⌘</kbd>
            <span className="text-white/60">Command (⌘)</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">⌃</kbd>
            <span className="text-white/60">Control</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">⇧</kbd>
            <span className="text-white/60">Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">⌥</kbd>
            <span className="text-white/60">Option (⌥)</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">� Tab</kbd>
            <span className="text-white/60">Tab</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">↵</kbd>
            <span className="text-white/60">Return/Enter</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">⌫</kbd>
            <span className="text-white/60">Delete</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 font-mono">Esc</kbd>
            <span className="text-white/60">Escape</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4">Pro Tips</h3>
        <ul className="space-y-3 text-sm text-white/70">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
            <span>Double-tap <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">⌃</kbd> to toggle the overlay from anywhere in macOS.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
            <span>Combine <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">⌘</kbd> + <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">K</kbd> to search across all conversations.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
            <span>Use <code className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">/think</code> before complex questions for deeper reasoning.</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
            <span>Customize shortcuts in Settings → Keyboard → Shortcuts.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
