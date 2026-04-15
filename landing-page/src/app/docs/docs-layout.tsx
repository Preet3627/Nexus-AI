'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  Book,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Download,
  Command,
  Layers,
  Keyboard,
  Globe,
  Cpu,
  FileCode,
  Database,
  Mic,
} from 'lucide-react'

const docsNavigation = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs', icon: Book },
      { title: 'Installation', href: '/docs/installation', icon: Download },
      { title: 'Quick Start', href: '/docs/quickstart', icon: Zap },
    ],
  },
  {
    title: 'Core Features',
    items: [
      { title: 'Action Chains', href: '/docs/commands', icon: Command },
      { title: 'Architecture', href: '/docs/architecture', icon: FileCode },
      { title: 'Multi-LLM Support', href: '/docs/llm', icon: Layers },
      { title: 'Security', href: '/docs/security', icon: Shield },
      { title: 'Siri Integration', href: '/docs/siri', icon: Mic },
    ],
  },
  {
    title: 'Reference',
    items: [
      { title: 'Components', href: '/docs/components', icon: FileCode },
      { title: 'Keyboard Shortcuts', href: '/docs/shortcuts', icon: Keyboard },
    ],
  },
]

const keyboardShortcuts = [
  { keys: ['⌃', '⌃'], description: 'Toggle overlay' },
  { keys: ['⌘', 'K'], description: 'Search docs' },
  { keys: ['Esc'], description: 'Close' },
]

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const allDocsContent = docsNavigation.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.title,
    }))
  )

  const filteredDocs = searchQuery
    ? allDocsContent.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.section.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold hidden sm:inline">Nexus-AI</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <Search className="w-4 h-4 text-white/60" />
              <span className="hidden sm:inline text-white/60">Search docs...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/10 text-xs text-white/40">⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl mx-4 glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
                autoFocus
              />
              <kbd className="px-2 py-1 rounded bg-white/10 text-xs text-white/40">ESC</kbd>
            </div>
            {filteredDocs.length > 0 && (
              <div className="max-h-96 overflow-y-auto p-2">
                {filteredDocs.map((doc) => (
                  <Link
                    key={doc.href}
                    href={doc.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                  >
                    <doc.icon className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-white">{doc.title}</p>
                      <p className="text-xs text-white/40">{doc.section}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {searchQuery && filteredDocs.length === 0 && (
              <div className="p-8 text-center text-white/40">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-14 left-0 bottom-0 w-64 z-40 glass border-r border-white/5
          transform transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <nav className="p-4 overflow-y-auto h-full">
          {docsNavigation.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                        ${isActive
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm">{item.title}</span>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>

      {/* Keyboard Shortcuts Footer */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 glass border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-2">
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10">?</kbd>
              <span>Shortcuts</span>
            </span>
            {keyboardShortcuts.slice(0, 3).map((shortcut, i) => (
              <span key={i} className="hidden md:flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd key={j} className="px-1.5 py-0.5 rounded bg-white/10">{key}</kbd>
                ))}
                <span className="text-white/30 mx-1">{shortcut.description}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
