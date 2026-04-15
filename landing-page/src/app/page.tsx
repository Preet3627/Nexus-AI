'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Shield,
  Zap,
  Monitor,
  Lock,
  Fingerprint,
  Command,
  Layers,
  Github,
  MonitorSmartphone,
  Cpu,
  HardDrive,
  Eye,
  Keyboard,
  MessageSquare,
  Settings,
  Bell,
  Globe,
  Code2,
  Layers3,
  Download,
  Tag,
  ArrowDownToLine,
  FileText,
  CheckCircle2,
} from 'lucide-react'

  interface ReleaseData {
  tag: string
  name: string
  body: string
  html_url: string
  published_at: string
  assets: Array<{
    name: string
    download_count: number
    browser_download_url: string
    size: number
  }>
}

const features = [
  {
    icon: Monitor,
    title: 'Floating Overlay',
    description: 'Spotlight-style chat that appears on double-tap Control. Inspired by Thuki.',
  },
  {
    icon: Layers,
    title: 'Multi-LLM Support',
    description: 'Use Ollama locally or connect to OpenAI, Anthropic, Google Gemini, and more.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Touch ID, Secure Enclave, AES-256-GCM encryption. Your data stays yours.',
  },
  {
    icon: Eye,
    title: 'Screen Capture',
    description: 'Capture and analyze screen content. Ask AI about anything on your screen.',
  },
  {
    icon: Zap,
    title: 'GPU Accelerated',
    description: 'Metal and CUDA optimization for fast AI inference on Apple Silicon.',
  },
  {
    icon: Command,
    title: 'Action Chains',
    description: '/screen, /think, /summarize. Simple commands for powerful actions.',
  },
]

const techSpecs = [
  { icon: Cpu, label: 'macOS 13.0+', value: 'Ventura Required' },
  { icon: HardDrive, label: 'Bundle Size', value: '< 15 MB' },
  { icon: Zap, label: 'Startup Time', value: '< 2 seconds' },
  { icon: Monitor, label: 'Memory (Idle)', value: '< 30 MB' },
]

const nativeApis = [
  { name: 'LocalAuthentication', description: 'Touch ID / Face ID' },
  { name: 'ScreenCaptureKit', description: 'Screen capture' },
  { name: 'CryptoKit', description: 'AES-256-GCM encryption' },
  { name: 'NSPanel', description: 'Floating overlay window' },
  { name: 'CGEventTap', description: 'Global hotkey detection' },
  { name: 'Secure Enclave', description: 'Hardware key storage' },
]

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [release, setRelease] = useState<ReleaseData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://api.github.com/repos/preet3627/Nexus-AI/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI-Landing-Page',
      },
      cache: 'force-cache',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setRelease({
            tag: data.tag_name,
            name: data.name,
            body: data.body,
            html_url: data.html_url,
            published_at: data.published_at,
            assets: data.assets?.map((asset: any) => ({
              name: asset.name,
              download_count: asset.download_count,
              browser_download_url: asset.browser_download_url,
              size: asset.size,
            })) || [],
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const parseChangelog = (body: string) => {
    if (!body) return []
    const sections: { title: string; items: string[] }[] = []
    const lines = body.split('\n')
    let currentSection = { title: 'Changes', items: [] as string[] }
    
    lines.forEach((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('## ')) {
        if (currentSection.items.length > 0) {
          sections.push(currentSection)
        }
        currentSection = { title: trimmed.replace('## ', ''), items: [] }
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        currentSection.items.push(trimmed.slice(2))
      } else if (trimmed.startsWith('### ')) {
        currentSection.title = trimmed.replace('### ', '')
      }
    })
    
    if (currentSection.items.length > 0) {
      sections.push(currentSection)
    }
    
    return sections.length > 0 ? sections : [{ title: 'Changes', items: body.split('\n').filter(l => l.trim()).slice(0, 5) }]
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Nexus-AI</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#security" className="text-sm text-white/60 hover:text-white transition-colors">
                Security
              </Link>
              <Link href="#native" className="text-sm text-white/60 hover:text-white transition-colors">
                Native APIs
              </Link>
              <Link href="#downloads" className="text-sm text-white/60 hover:text-white transition-colors">
                Downloads
              </Link>
              <Link href="#setup" className="text-sm text-white/60 hover:text-white transition-colors">
                Setup
              </Link>
              <a
                href="https://github.com/yourusername/Nexus-AI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="text-sm">GitHub</span>
              </a>
            </div>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Layers3 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass mb-8 animate-fade-in">
            {loading ? (
              <span className="text-sm text-white/60">Loading...</span>
            ) : release ? (
              <>
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-mono text-purple-400">{release.tag}</span>
                </span>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-sm text-white/60">{formatDate(release.published_at)}</span>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-sm text-white/60">Apache 2.0</span>
              </>
            ) : (
              <span className="text-sm text-white/60">Open Source - Apache 2.0</span>
            )}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">Native macOS AI</span>
            <br />
            <span className="text-white">Assistant</span>
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Floating overlay, multi-LLM support, enterprise security.
            <br />
            Built with SwiftUI + Tauri.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a
              href="#setup"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="https://github.com/yourusername/Nexus-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl glass hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </div>

          {/* Quick Demo */}
          <div className="mt-20 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="glass rounded-2xl p-6 glow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm text-white/60">Press ⌃⌃ to activate</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-white/40">Ask Nexus anything...</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-white/40">
                <Keyboard className="w-4 h-4" />
                <span>Type /screen, /think, /summarize for quick actions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Specs */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {techSpecs.map((spec, i) => (
              <div key={i} className="glass rounded-xl p-6 text-center">
                <spec.icon className="w-8 h-8 mx-auto mb-3 text-purple-400" />
                <div className="text-2xl font-bold text-white">{spec.value}</div>
                <div className="text-sm text-white/60">{spec.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Features</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Everything you need for AI-assisted productivity on macOS.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="glass rounded-xl p-6 hover:bg-white/5 transition-colors">
                <feature.icon className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Enterprise <span className="gradient-text">Security</span>
              </h2>
              <p className="text-white/60 mb-8">
                Your data stays on your device. Hardware-backed encryption ensures
                your conversations and settings remain private.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Biometric Authentication</h4>
                    <p className="text-sm text-white/60">
                      Touch ID / Face ID protection for accessing the app.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Secure Enclave</h4>
                    <p className="text-sm text-white/60">
                      Hardware-backed key storage on Apple Silicon.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">AES-256-GCM Encryption</h4>
                    <p className="text-sm text-white/60">
                      All conversations encrypted at rest with CryptoKit.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-6">Security Architecture</h3>
              <div className="space-y-4 font-mono text-sm">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-purple-400 mb-2">Layer 1: Authentication</div>
                  <div className="text-white/60">LocalAuthentication → Touch ID / Face ID</div>
                </div>
                <div className="flex justify-center">
                  <div className="w-0.5 h-6 bg-white/10" />
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-pink-400 mb-2">Layer 2: Key Storage</div>
                  <div className="text-white/60">Secure Enclave / Keychain</div>
                </div>
                <div className="flex justify-center">
                  <div className="w-0.5 h-6 bg-white/10" />
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-orange-400 mb-2">Layer 3: Encryption</div>
                  <div className="text-white/60">CryptoKit → AES-256-GCM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Native APIs */}
      <section id="native" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Native macOS APIs</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Built on Apple's frameworks for native performance and security.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nativeApis.map((api, i) => (
              <div key={i} className="glass rounded-xl p-5">
                <Code2 className="w-6 h-6 text-purple-400 mb-3" />
                <h4 className="font-mono text-sm font-semibold mb-1">{api.name}</h4>
                <p className="text-xs text-white/60">{api.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Get Started</h2>
            <p className="text-white/60">Build from source in minutes.</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass rounded-2xl p-8">
              <div className="space-y-6 font-mono text-sm">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400">1</span>
                    <span className="text-white/80">Clone the repository</span>
                  </div>
                  <div className="pl-9 text-white/40">
                    <code className="block p-3 bg-black/30 rounded-lg">
                      git clone https://github.com/yourusername/Nexus-AI.git
                      <br />
                      cd Nexus-AI
                    </code>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400">2</span>
                    <span className="text-white/80">Install dependencies</span>
                  </div>
                  <div className="pl-9 text-white/40">
                    <code className="block p-3 bg-black/30 rounded-lg">
                      npm install
                      <br />
                      brew install xcodegen
                    </code>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400">3</span>
                    <span className="text-white/80">Build</span>
                  </div>
                  <div className="pl-9 text-white/40">
                    <code className="block p-3 bg-black/30 rounded-lg">
                      npm run generate
                      <br />
                      npm run tauri build
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section id="downloads" className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Download</h2>
            <p className="text-white/60">Get the latest release and start using Nexus-AI.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 animate-pulse mx-auto mb-4" />
                <p className="text-white/60">Loading release info...</p>
              </div>
            ) : release ? (
              <div className="space-y-6">
                <div className="glass rounded-2xl p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Tag className="w-5 h-5 text-purple-400" />
                        <span className="text-2xl font-bold font-mono">{release.tag}</span>
                      </div>
                      <p className="text-white/60">{release.name || release.tag}</p>
                      <p className="text-sm text-white/40 mt-1">Released {formatDate(release.published_at)}</p>
                    </div>
                    <div className="flex gap-3">
                      <a
                        href={release.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <Github className="w-5 h-5" />
                        View on GitHub
                      </a>
                      <a
                        href={`https://github.com/preet3627/Nexus-AI/archive/refs/tags/${release.tag}.zip`}
                        className="px-6 py-3 rounded-xl glass hover:bg-white/10 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Source Code
                      </a>
                    </div>
                  </div>

                  {release.assets && release.assets.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ArrowDownToLine className="w-5 h-5 text-purple-400" />
                        Assets
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {release.assets.map((asset, i) => (
                          <a
                            key={i}
                            href={asset.browser_download_url}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Download className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                              <div>
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-sm text-white/40">{formatSize(asset.size)}</p>
                              </div>
                            </div>
                            {asset.download_count > 0 && (
                              <span className="text-xs text-white/40">{asset.download_count.toLocaleString()} downloads</span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {release.body && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Changelog
                      </h4>
                      <div className="bg-white/5 rounded-xl p-6 max-h-96 overflow-y-auto">
                        {parseChangelog(release.body).map((section, i) => (
                          <div key={i} className="mb-6 last:mb-0">
                            <h5 className="text-purple-400 font-medium mb-3">{section.title}</h5>
                            <ul className="space-y-2">
                              {section.items.slice(0, 10).map((item, j) => (
                                <li key={j} className="flex items-start gap-2 text-sm text-white/70">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <a
                    href="https://github.com/preet3627/Nexus-AI/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                  >
                    View all releases
                    <ArrowDownToLine className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-white/60 mb-4">No releases found</p>
                <a
                  href="https://github.com/preet3627/Nexus-AI/releases/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass hover:bg-white/10 transition-colors"
                >
                  <Github className="w-5 h-5" />
                  Create First Release
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LLM Providers */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Supported LLMs</h2>
            <p className="text-white/60">Use your preferred AI provider.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Ollama', 'OpenAI', 'Anthropic', 'Google', 'Groq', 'OpenRouter'].map((provider, i) => (
              <div key={i} className="glass rounded-xl p-4 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <span className="text-sm font-medium">{provider}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold">Nexus-AI</span>
                <p className="text-xs text-white/40">Apache 2.0 License</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/60">
              <a href="https://github.com/yourusername/Nexus-AI" className="hover:text-white transition-colors flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <Link href="/docs" className="hover:text-white transition-colors">
                Documentation
              </Link>
              <Link href="/license" className="hover:text-white transition-colors">
                License
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm text-white/40">
            <p className="mb-2">
              Inspired by{' '}
              <a href="https://github.com/quiet-node/thuki" className="text-purple-400 hover:underline">
                Thuki
              </a>{' '}
              by Logan Nguyen
            </p>
            <p>
              Built with SwiftUI, Tauri, and ❤️
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
