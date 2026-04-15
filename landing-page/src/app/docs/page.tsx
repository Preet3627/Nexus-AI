'use client'

import Link from 'next/link'
import {
  Sparkles,
  Shield,
  Zap,
  Monitor,
  ArrowRight,
  CheckCircle2,
  Layers,
  Eye,
  Command,
  Lock,
  Fingerprint,
  Mic,
  Keyboard,
} from 'lucide-react'

const features = [
  {
    icon: Monitor,
    title: 'Floating Overlay',
    description: 'Spotlight-style chat that appears on double-tap Control. Inspired by Thuki.',
    details: [
      'Custom NSPanel with vibrancy effects',
      'Smooth 300ms fade-in animation',
      'Smart positioning at screen top',
      'Keyboard-driven interface',
    ],
  },
  {
    icon: Layers,
    title: 'Multi-LLM Support',
    description: 'Use Ollama locally or connect to OpenAI, Anthropic, Google Gemini, and more.',
    details: [
      'Ollama (local, private)',
      'OpenAI GPT-4 & GPT-3.5',
      'Anthropic Claude',
      'Google Gemini Pro',
    ],
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Touch ID, Secure Enclave, AES-256-GCM encryption. Your data stays yours.',
    details: [
      'LocalAuthentication framework',
      'Keychain Services for API keys',
      'CryptoKit AES-256-GCM',
      'Secure Enclave key storage',
    ],
  },
  {
    icon: Eye,
    title: 'Screen Capture',
    description: 'Capture and analyze screen content. Ask AI about anything on your screen.',
    details: [
      'ScreenCaptureKit API',
      'User-selected capture areas',
      'Base64 image encoding',
      'Privacy-preserving workflow',
    ],
  },
  {
    icon: Zap,
    title: 'GPU Accelerated',
    description: 'Metal and CUDA optimization for fast AI inference on Apple Silicon.',
    details: [
      'Apple Silicon Neural Engine',
      'Metal GPU compute',
      'Memory-efficient streaming',
      'Sub-second response times',
    ],
  },
  {
    icon: Command,
    title: 'Action Chains',
    description: '/screen, /think, /summarize. Simple commands for powerful actions.',
    details: [
      '/screen - Capture screen',
      '/think - Deep reasoning mode',
      '/summarize - Quick summary',
      '/search - Web search',
    ],
  },
]

export default function IntroductionPage() {
  return (
    <div className="space-y-12 pb-16">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          <span className="gradient-text">Nexus-AI</span> Documentation
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Native macOS AI assistant with floating overlay, multi-LLM support, and enterprise security.
        </p>
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Core Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="glass rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {feature.details.map((detail, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Links</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/docs/installation"
            className="glass rounded-xl p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-semibold mb-1">Quick Start</h3>
            <p className="text-sm text-white/60">Get up and running in 5 minutes</p>
          </Link>

          <Link
            href="/docs/commands"
            className="glass rounded-xl p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Command className="w-5 h-5 text-blue-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-semibold mb-1">Commands</h3>
            <p className="text-sm text-white/60">Slash commands for quick actions</p>
          </Link>

          <Link
            href="/docs/security"
            className="glass rounded-xl p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-semibold mb-1">Security</h3>
            <p className="text-sm text-white/60">Encryption and privacy details</p>
          </Link>
        </div>
      </div>

      {/* Tech Stack */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
        <div className="glass rounded-xl p-6">
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-purple-400">Frontend</h4>
              <ul className="space-y-1 text-sm text-white/70">
                <li>SwiftUI</li>
                <li>AppKit</li>
                <li>MarkdownKit</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-pink-400">Backend</h4>
              <ul className="space-y-1 text-sm text-white/70">
                <li>Rust (Tauri)</li>
                <li>node-cron</li>
                <li>WebSocket</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-orange-400">AI/ML</h4>
              <ul className="space-y-1 text-sm text-white/70">
                <li>Ollama</li>
                <li>OpenAI API</li>
                <li>Anthropic API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-green-400">Security</h4>
              <ul className="space-y-1 text-sm text-white/70">
                <li>CryptoKit</li>
                <li>Keychain</li>
                <li>LocalAuthentication</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* License */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Apache 2.0 License</h3>
            <p className="text-sm text-white/60 mb-3">
              Nexus-AI is open source and freely available. Inspired by{' '}
              <a
                href="https://github.com/quiet-node/thuki"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                Thuki
              </a>{' '}
              by Logan Nguyen.
            </p>
            <Link
              href="/license"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              View full license →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
