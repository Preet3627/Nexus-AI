'use client'

import Link from 'next/link'
import { 
  BookOpen, 
  Shield, 
  Zap, 
  Monitor, 
  Code2,
  Settings,
  HardDrive,
  Lock,
  Fingerprint,
  Eye,
  Globe,
  Cpu,
  Database,
  Keyboard,
} from 'lucide-react'

const sections = [
  {
    name: 'Getting Started',
    icon: BookOpen,
    pages: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'Configuration', href: '/docs/configuration' },
    ],
  },
  {
    name: 'Features',
    icon: Zap,
    pages: [
      { title: 'Floating Overlay', href: '/docs/features/overlay' },
      { title: 'Multi-LLM Support', href: '/docs/features/llm' },
      { title: 'Screen Capture', href: '/docs/features/screen-capture' },
      { title: 'Comet-AI Integration', href: '/docs/features/comet' },
    ],
  },
  {
    name: 'Native APIs',
    icon: Code2,
    pages: [
      { title: 'LocalAuthentication', href: '/docs/native-api/biometrics' },
      { title: 'Keychain Services', href: '/docs/native-api/keychain' },
      { title: 'ScreenCaptureKit', href: '/docs/native-api/screen-capture' },
      { title: 'Secure Enclave', href: '/docs/native-api/secure-enclave' },
    ],
  },
  {
    name: 'Security',
    icon: Shield,
    pages: [
      { title: 'Encryption', href: '/docs/security/encryption' },
      { title: 'Authentication', href: '/docs/security/authentication' },
      { title: 'Data Storage', href: '/docs/security/storage' },
    ],
  },
  {
    name: 'Optimization',
    icon: Cpu,
    pages: [
      { title: 'GPU Acceleration', href: '/docs/optimization/gpu' },
      { title: 'Memory', href: '/docs/optimization/memory' },
      { title: 'Startup', href: '/docs/optimization/startup' },
    ],
  },
]

export default function DocsLayout() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">Nexus-AI</span>
              <span className="text-white/40">/</span>
              <span className="text-white/60">Docs</span>
            </Link>
            <a
              href="https://github.com/yourusername/Nexus-AI"
              className="text-sm text-white/60 hover:text-white"
            >
              GitHub →
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-8 sticky top-24">
              {sections.map((section) => (
                <div key={section.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <section.icon className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold">{section.name}</h3>
                  </div>
                  <ul className="space-y-2 ml-6">
                    {section.pages.map((page) => (
                      <li key={page.href}>
                        <Link 
                          href={page.href}
                          className="text-sm text-white/60 hover:text-white transition-colors"
                        >
                          {page.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="prose prose-invert max-w-none">
              <h1>Nexus-AI Documentation</h1>
              
              <p className="text-xl text-white/80">
                Native macOS AI assistant with floating overlay, multi-LLM support, and enterprise security.
              </p>

              <div className="not-prose my-12">
                <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Link href="/docs/installation" className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
                    <BookOpen className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="font-semibold mb-1">Installation</h3>
                    <p className="text-sm text-white/60">Get started with Nexus-AI</p>
                  </Link>
                  <Link href="/docs/features/overlay" className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
                    <Monitor className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="font-semibold mb-1">Floating Overlay</h3>
                    <p className="text-sm text-white/60">Double-tap Control to activate</p>
                  </Link>
                  <Link href="/docs/security/encryption" className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
                    <Shield className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="font-semibold mb-1">Security</h3>
                    <p className="text-sm text-white/60">Enterprise-grade protection</p>
                  </Link>
                  <Link href="/docs/native-api/biometrics" className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
                    <Fingerprint className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="font-semibold mb-1">Native APIs</h3>
                    <p className="text-sm text-white/60">Built on Apple frameworks</p>
                  </Link>
                </div>
              </div>

              <h2>System Requirements</h2>
              <ul>
                <li>macOS 13.0 (Ventura) or later</li>
                <li>Apple Silicon or Intel Mac</li>
                <li>For Secure Enclave: MacBook Pro/Air with Touch ID, or Mac mini with T2 chip</li>
              </ul>

              <h2>Key Features</h2>
              <ul>
                <li><strong>Floating Overlay</strong> - Spotlight-style input on double-tap Control</li>
                <li><strong>Multi-LLM</strong> - Ollama, OpenAI, Anthropic, Google Gemini, and more</li>
                <li><strong>Enterprise Security</strong> - Touch ID, Secure Enclave, AES-256-GCM</li>
                <li><strong>Screen Capture</strong> - Analyze anything on your screen</li>
                <li><strong>GPU Acceleration</strong> - Metal optimization for Apple Silicon</li>
                <li><strong>Background Service</strong> - System tray with quick access</li>
              </ul>

              <h2>License</h2>
              <p>
                Nexus-AI is licensed under the Apache License 2.0. See the{' '}
                <Link href="/license">License page</Link> for details.
              </p>

              <h2>Acknowledgments</h2>
              <p>
                Nexus-AI was inspired by{' '}
                <a href="https://github.com/quiet-node/thuki" target="_blank" rel="noopener noreferrer">
                  Thuki
                </a>{' '}
                by Logan Nguyen, licensed under Apache 2.0.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
