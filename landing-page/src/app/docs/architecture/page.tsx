'use client'

import { useState } from 'react'
import { Command, Copy, Check, ChevronDown, ChevronRight, Shield, Zap, Terminal } from 'lucide-react'

const toolArchitecture = [
  {
    name: 'ActionChainManager',
    path: 'src/Services/ActionChainManager.swift',
    lines: 520,
    description: 'Central manager for all action tools with natural language parsing',
    responsibilities: [
      'Tool registration and definitions',
      'Parameter extraction from natural language',
      'Tool execution orchestration',
      'Execution history tracking',
    ],
  },
  {
    name: 'LLMService',
    path: 'src/Services/LLMService.swift',
    lines: 380,
    description: 'LLM provider services with Claude-style tool use support',
    responsibilities: [
      'OpenAI and Anthropic API integration',
      'chatWithTools() method',
      'Tool call parsing',
      'Stop reason handling',
    ],
  },
  {
    name: 'ChatViewModel',
    path: 'src/ViewModels/ChatViewModel.swift',
    lines: 180,
    description: 'Agent loop implementation for tool execution',
    responsibilities: [
      'Message handling',
      'Tool execution loop (max 5 iterations)',
      'Result feedback to LLM',
      'Execution logging',
    ],
  },
]

const availableTools = [
  {
    id: 'shell',
    name: 'Shell Command',
    description: 'Execute shell commands in Terminal',
    risk: 'high',
    parameters: ['command: string', 'workingDirectory?: string'],
    example: '"Run ls -la"',
  },
  {
    id: 'brightness',
    name: 'Brightness',
    description: 'Control display brightness',
    risk: 'low',
    parameters: ['level: number (0.0-1.0)'],
    example: '"Set brightness to 80%"',
  },
  {
    id: 'volume',
    name: 'Volume',
    description: 'Control system volume',
    risk: 'low',
    parameters: ['level: number (0.0-1.0)', 'muted?: boolean'],
    example: '"Mute the volume"',
  },
  {
    id: 'open_app',
    name: 'Open App',
    description: 'Open applications by name',
    risk: 'medium',
    parameters: ['name: string'],
    example: '"Open Safari"',
  },
  {
    id: 'screenshot',
    name: 'Screenshot',
    description: 'Capture screenshots',
    risk: 'low',
    parameters: ['type?: "full" | "region" | "window"', 'save?: boolean'],
    example: '"Take a screenshot"',
  },
  {
    id: 'clipboard',
    name: 'Clipboard',
    description: 'Read/write clipboard',
    risk: 'low',
    parameters: ['action: "read" | "write"', 'content?: string'],
    example: '"Copy this text"',
  },
  {
    id: 'notification',
    name: 'Notification',
    description: 'Show system notifications',
    risk: 'low',
    parameters: ['title: string', 'message: string'],
    example: '"Show notification"',
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Create and manage automations',
    risk: 'medium',
    parameters: ['action: "create" | "run" | "list" | "delete"', 'name?: string', 'schedule?: string'],
    example: '"Create automation"',
  },
]

const howItWorks = [
  {
    step: 1,
    title: 'User Input',
    description: 'User types a natural language request like "Open Safari and set brightness to 50%"',
  },
  {
    step: 2,
    title: 'LLM Analysis',
    description: 'The LLM analyzes the request and decides which tools to use based on tool definitions',
  },
  {
    step: 3,
    title: 'Tool Call',
    description: 'LLM outputs a structured tool call with parameters (like Claude Code)',
  },
  {
    step: 4,
    title: 'Execution',
    description: 'ActionChainManager executes the tool and returns the result',
  },
  {
    step: 5,
    title: 'Feedback Loop',
    description: 'Tool result is sent back to LLM for continued conversation or next action',
  },
]

const exampleConversation = `User: "Set my brightness to 80% and open Chrome"

LLM Response (tool_use):
{
  "tool_calls": [
    {
      "id": "call_001",
      "type": "function",
      "function": {
        "name": "brightness",
        "arguments": "{\"level\": 0.8}"
      }
    },
    {
      "id": "call_002", 
      "type": "function",
      "function": {
        "name": "open_app",
        "arguments": "{\"name\": \"Chrome\"}"
      }
    }
  ]
}

Tool Results:
- brightness: "Brightness set to 80%"
- open_app: "Opened Chrome"

LLM Final Response:
"Done! I've set your brightness to 80% and opened Chrome for you."`

export default function ArchitecturePage() {
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
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
          <Command className="w-10 h-10 text-purple-400" />
          Action Chain Architecture
        </h1>
        <p className="text-white/60">
          Professional Claude-style tool use for natural language action execution.
        </p>
      </div>

      {/* How It Works */}
      <div>
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <div className="space-y-4">
          {howItWorks.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="w-0.5 flex-1 bg-purple-500/30 my-2" />
                )}
              </div>
              <div className="flex-1 pb-6">
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-white/60">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Tools */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Tools</h2>
        <div className="space-y-3">
          {availableTools.map((tool) => (
            <div key={tool.id} className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    tool.risk === 'low' ? 'bg-green-400' :
                    tool.risk === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <div className="text-left">
                    <h3 className="font-semibold">{tool.name}</h3>
                    <p className="text-sm text-white/60">{tool.description}</p>
                  </div>
                </div>
                {expandedTool === tool.id ? (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/40" />
                )}
              </button>
              
              {expandedTool === tool.id && (
                <div className="p-4 border-t border-white/5 bg-black/20">
                  <div className="mb-3">
                    <p className="text-xs text-white/40 mb-2">Parameters:</p>
                    <div className="flex flex-wrap gap-2">
                      {tool.parameters.map((param, i) => (
                        <code key={i} className="px-2 py-1 rounded bg-white/10 text-sm">
                          {param}
                        </code>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-white/60">
                    Example: <span className="text-purple-400">{tool.example}</span>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Components */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Architecture</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {toolArchitecture.map((component, i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold">{component.name}</h3>
              </div>
              <p className="text-xs text-white/40 font-mono mb-3">{component.path}</p>
              <p className="text-sm text-white/60 mb-3">{component.description}</p>
              <ul className="space-y-1">
                {component.responsibilities.map((resp, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {resp}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Example Conversation */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Example Conversation</h2>
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-sm text-white/60 font-mono">conversation.md</span>
            <button
              onClick={() => copyCode(exampleConversation, 'example')}
              className="flex items-center gap-1 text-sm text-white/40 hover:text-white"
            >
              {copied === 'example' ? (
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
            <code className="text-white/80 whitespace-pre-wrap">{exampleConversation}</code>
          </pre>
        </div>
      </div>

      {/* Risk Levels */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          Risk Levels
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-sm">Low - Safe to execute</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-sm">Medium - May require confirmation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-sm">High - Shell commands</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-700" />
            <span className="text-sm">Critical - System changes</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Benefits</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <Zap className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="font-semibold mb-1">Natural Language</h4>
            <p className="text-sm text-white/60">
              No complex JSON parsing - just describe what you want in plain English.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <Shield className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="font-semibold mb-1">Risk Management</h4>
            <p className="text-sm text-white/60">
              Each tool has a risk level for user awareness and confirmation flows.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <Command className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="font-semibold mb-1">Extensible</h4>
            <p className="text-sm text-white/60">
              Add new tools by implementing ActionExecutor protocol and registering.
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <Terminal className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="font-semibold mb-1">Claude-Style</h4>
            <p className="text-sm text-white/60">
              Professional tool use pattern used by Claude Code and Anthropic.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
