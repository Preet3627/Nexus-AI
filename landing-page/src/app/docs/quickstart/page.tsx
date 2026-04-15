'use client'

import Link from 'next/link'
import { Zap, MessageSquare, Sparkles, ArrowRight, Keyboard, Shield } from 'lucide-react'

const quickSteps = [
  {
    icon: Sparkles,
    title: 'Activate Overlay',
    description: 'Press ⌃⌃ (double-tap Control) to open the floating chat.',
    tip: 'Customize the hotkey in Settings → Shortcuts',
  },
  {
    icon: MessageSquare,
    title: 'Ask Anything',
    description: 'Type your question and press Enter to send.',
    tip: 'Use ⌘⇧M for voice input',
  },
  {
    icon: Zap,
    title: 'Use Slash Commands',
    description: 'Type / to access quick actions like /screen, /think.',
    tip: 'Type /? to see all available commands',
  },
  {
    icon: Shield,
    title: 'Stay Secure',
    description: 'All conversations are encrypted with AES-256-GCM.',
    tip: 'Enable Touch ID in Settings → Security',
  },
]

export default function QuickstartPage() {
  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
        <p className="text-white/60">
          Get up and running with Nexus-AI in 5 minutes.
        </p>
      </div>

      {/* Quick Steps */}
      <div className="space-y-4">
        {quickSteps.map((step, i) => (
          <div key={i} className="glass rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <step.icon className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-white/60 mb-2">{step.description}</p>
                <p className="text-sm text-purple-400 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" />
                  {step.tip}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* First Conversation */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Your First Conversation</h2>
        <div className="glass rounded-xl p-6">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-sm">👤</span>
              </div>
              <div className="flex-1 p-3 rounded-xl rounded-tl-none bg-white/5">
                <p className="text-white/90">Summarize my day so far</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 p-3 rounded-xl rounded-tl-none bg-purple-500/20">
                <p className="text-white/90">
                  Based on your calendar and messages, here's your day:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-white/70">
                  <li>• 9:00 AM - Team standup</li>
                  <li>• 11:00 AM - Design review</li>
                  <li>• 2:00 PM - 1:1 with manager</li>
                  <li>• 4:00 PM - Sprint planning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pro Tips</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2">Use /think for complex questions</h4>
            <p className="text-sm text-white/60">
              /think enables deep reasoning mode for analytical tasks.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2">Capture screen context</h4>
            <p className="text-sm text-white/60">
              /screen lets AI see what's on your screen for contextual answers.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2">Set up automations</h4>
            <p className="text-sm text-white/60">
              Schedule recurring tasks like morning briefings with /automation.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2">Use Siri shortcuts</h4>
            <p className="text-sm text-white/60">
              "Hey Siri, ask Nexus to..." for hands-free control.
            </p>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Continue Learning</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/docs/commands"
            className="glass rounded-xl p-4 hover:bg-white/5 transition-colors"
          >
            <h4 className="font-semibold mb-1">Slash Commands</h4>
            <p className="text-sm text-white/60">All available commands</p>
          </Link>
          <Link
            href="/docs/shortcuts"
            className="glass rounded-xl p-4 hover:bg-white/5 transition-colors"
          >
            <h4 className="font-semibold mb-1">Keyboard Shortcuts</h4>
            <p className="text-sm text-white/60">Speed up your workflow</p>
          </Link>
          <Link
            href="/docs/security"
            className="glass rounded-xl p-4 hover:bg-white/5 transition-colors"
          >
            <h4 className="font-semibold mb-1">Security</h4>
            <p className="text-sm text-white/60">Privacy features</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
