'use client'

import Link from 'next/link'
import { Download, CheckCircle2, Terminal, Github, ArrowRight, Cpu, HardDrive, Monitor } from 'lucide-react'

const requirements = [
  { icon: Monitor, label: 'macOS', value: 'Ventura 13.0+' },
  { icon: Cpu, label: 'Processor', value: 'Apple Silicon or Intel' },
  { icon: HardDrive, label: 'Storage', value: '100 MB free' },
]

const steps = [
  {
    step: 1,
    title: 'Download',
    description: 'Download the latest release from GitHub.',
    command: null,
  },
  {
    step: 2,
    title: 'Install',
    description: 'Open the downloaded .dmg file and drag Nexus-AI to Applications.',
    command: null,
  },
  {
    step: 3,
    title: 'Grant Permissions',
    description: 'Allow Accessibility and Screen Recording permissions for full functionality.',
    command: null,
  },
  {
    step: 4,
    title: 'Configure LLM',
    description: 'Choose your preferred AI provider in Settings → AI.',
    command: null,
  },
]

const buildFromSource = [
  {
    step: 1,
    title: 'Clone Repository',
    command: 'git clone https://github.com/preet3627/Nexus-AI.git',
  },
  {
    step: 2,
    title: 'Install Dependencies',
    command: 'cd Nexus-AI && npm install',
  },
  {
    step: 3,
    title: 'Generate Xcode Project',
    command: 'brew install xcodegen && npm run generate',
  },
  {
    step: 4,
    title: 'Build',
    command: 'npm run tauri build',
  },
]

export default function InstallationPage() {
  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4">Installation</h1>
        <p className="text-white/60">
          Get Nexus-AI up and running on your Mac in minutes.
        </p>
      </div>

      {/* Requirements */}
      <div>
        <h2 className="text-2xl font-bold mb-4">System Requirements</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {requirements.map((req, i) => (
            <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <req.icon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">{req.label}</p>
                <p className="font-semibold">{req.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Install */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Quick Install</h2>
        <div className="space-y-4">
          {steps.map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 flex-1 bg-purple-500/30 my-2" />
                )}
              </div>
              <div className="flex-1 pb-6">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-white/60">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download Link */}
      <div className="glass rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold mb-1">Download Latest Release</h3>
          <p className="text-sm text-white/60">macOS (Apple Silicon + Intel)</p>
        </div>
        <a
          href="https://github.com/preet3627/Nexus-AI/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <Download className="w-5 h-5" />
          Download
        </a>
      </div>

      {/* Build from Source */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Build from Source</h2>
        <p className="text-white/60 mb-4">
          For development or custom builds, compile from source.
        </p>
        <div className="space-y-3">
          {buildFromSource.map((item, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-purple-400">Step {item.step}: {item.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white/40" />
                <code className="text-sm text-white/80 font-mono flex-1">{item.command}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/docs/quickstart"
            className="glass rounded-xl p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Quick Start Guide</h3>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-sm text-white/60">Learn the basics in 5 minutes</p>
          </Link>
          <Link
            href="/docs/llm"
            className="glass rounded-xl p-6 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">LLM Configuration</h3>
              <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-sm text-white/60">Set up Ollama, OpenAI, or Anthropic</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
