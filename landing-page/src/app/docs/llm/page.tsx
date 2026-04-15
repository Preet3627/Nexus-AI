'use client'

import { Layers, Cpu, Shield, Globe, CheckCircle2 } from 'lucide-react'

const llmProviders = [
  {
    name: 'Ollama',
    logo: '🦙',
    description: 'Run LLMs locally on your Mac',
    features: ['100% Private', 'No internet required', 'Fast inference', 'Custom models'],
    models: ['llama3', 'mistral', 'codellama', 'phi3', 'mixtral'],
    status: 'Recommended',
  },
  {
    name: 'OpenAI',
    logo: '🤖',
    description: 'GPT-4 and GPT-3.5 Turbo',
    features: ['GPT-4', 'GPT-3.5 Turbo', 'Vision support', 'Function calling'],
    models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    status: 'Popular',
  },
  {
    name: 'Anthropic',
    logo: '🧠',
    description: 'Claude 3 Opus, Sonnet, Haiku',
    features: ['Claude 3 Opus', 'Long context', 'Safety focused', 'Fast responses'],
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    status: 'Popular',
  },
  {
    name: 'Google',
    logo: '🔵',
    description: 'Gemini Pro and Ultra',
    features: ['Gemini Pro', 'Gemini Ultra', 'Multi-modal', 'Google ecosystem'],
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
    status: 'New',
  },
]

export default function LLMPage() {
  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Layers className="w-10 h-10 text-purple-400" />
          Multi-LLM Support
        </h1>
        <p className="text-white/60">
          Use your preferred AI provider. Local Ollama for privacy, or cloud providers for power.
        </p>
      </div>

      {/* Provider Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {llmProviders.map((provider, i) => (
          <div key={i} className="glass rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{provider.logo}</span>
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-sm text-white/60">{provider.description}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs">
                {provider.status}
              </span>
            </div>
            
            <div className="mb-4">
              <p className="text-xs text-white/40 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {provider.features.map((feature, j) => (
                  <span key={j} className="px-2 py-1 rounded bg-white/5 text-xs text-white/70">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-white/40 mb-2">Available Models</p>
              <div className="flex flex-wrap gap-2">
                {provider.models.map((model, j) => (
                  <code key={j} className="px-2 py-1 rounded bg-black/30 text-sm font-mono text-purple-400">
                    {model}
                  </code>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ollama Setup */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Setting Up Ollama (Recommended)</h2>
        <div className="glass rounded-xl p-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Install Ollama</h4>
            <code className="block p-3 rounded-lg bg-black/30 text-sm">
              brew install ollama
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Download a Model</h4>
            <code className="block p-3 rounded-lg bg-black/30 text-sm">
              ollama pull llama3
            </code>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Configure Nexus-AI</h4>
            <p className="text-sm text-white/60">
              Go to Settings → AI → Provider → Select "Ollama (Local)"
            </p>
          </div>
        </div>
      </div>

      {/* API Key Setup */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Cloud Provider API Keys</h2>
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              OpenAI
            </h4>
            <p className="text-sm text-white/60 mb-2">
              Get your API key from platform.openai.com
            </p>
            <code className="block p-2 rounded bg-black/30 text-sm text-white/80">
              sk-••••••••••••••••
            </code>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Anthropic
            </h4>
            <p className="text-sm text-white/60 mb-2">
              Get your API key from console.anthropic.com
            </p>
            <code className="block p-2 rounded bg-black/30 text-sm text-white/80">
              sk-ant-••••••••••••••••
            </code>
          </div>
          <div className="glass rounded-xl p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Google Gemini
            </h4>
            <p className="text-sm text-white/60 mb-2">
              Get your API key from aistudio.google.com
            </p>
            <code className="block p-2 rounded bg-black/30 text-sm text-white/80">
              AIza••••••••••••••••
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
