'use client'

import { Shield, Lock, Fingerprint, Eye, Key, Database } from 'lucide-react'

const securityLayers = [
  {
    icon: Fingerprint,
    title: 'Biometric Authentication',
    description: 'Touch ID / Face ID protection using LocalAuthentication framework',
    details: ['Secure app access', 'Settings protection', 'API key management'],
  },
  {
    icon: Key,
    title: 'Secure Enclave',
    description: 'Hardware-backed key storage on Apple Silicon',
    details: ['RSA/ECC key generation', 'Cryptographic operations', 'Tamper detection'],
  },
  {
    icon: Lock,
    title: 'AES-256-GCM Encryption',
    description: 'Military-grade encryption using CryptoKit',
    details: ['Data at rest', 'Conversation history', 'Settings storage'],
  },
  {
    icon: Database,
    title: 'Keychain Services',
    description: 'macOS Keychain integration for secure credential storage',
    details: ['API keys', 'Tokens', 'Service isolation'],
  },
]

export default function SecurityPage() {
  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Shield className="w-10 h-10 text-purple-400" />
          Enterprise Security
        </h1>
        <p className="text-white/60">
          Your data stays on your device. Hardware-backed encryption ensures privacy.
        </p>
      </div>

      {/* Security Architecture */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Security Architecture</h2>
        <div className="glass rounded-2xl p-8">
          <div className="space-y-4 font-mono text-sm">
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <div className="text-purple-400 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Layer 1: Authentication
              </div>
              <div className="text-white/60">LocalAuthentication → Touch ID / Face ID</div>
            </div>
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500/50 to-pink-500/50" />
            </div>
            <div className="p-4 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <div className="text-pink-400 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Layer 2: Key Storage
              </div>
              <div className="text-white/60">Secure Enclave / Keychain Services</div>
            </div>
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-pink-500/50 to-orange-500/50" />
            </div>
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <div className="text-orange-400 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Layer 3: Encryption
              </div>
              <div className="text-white/60">CryptoKit → AES-256-GCM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Layers */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Security Layers</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {securityLayers.map((layer, i) => (
            <div key={i} className="glass rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <layer.icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-semibold">{layer.title}</h3>
              </div>
              <p className="text-sm text-white/60 mb-3">{layer.description}</p>
              <ul className="space-y-1">
                {layer.details.map((detail, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Features */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Privacy Features</h2>
        <div className="glass rounded-xl p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-400" />
                What's Private
              </h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• Conversation history (local only)</li>
                <li>• API keys (Keychain encrypted)</li>
                <li>• Settings and preferences</li>
                <li>• Automation configurations</li>
                <li>• Screen captures (never uploaded)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                When Using Ollama
              </h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• 100% of data stays on your Mac</li>
                <li>• No internet connection needed</li>
                <li>• No API costs</li>
                <li>• Complete offline capability</li>
                <li>• No telemetry or tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Implementation</h2>
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-2 border-b border-white/5">
            <span className="text-sm text-white/60 font-mono">BiometricAuthService.swift</span>
          </div>
          <pre className="p-4 overflow-x-auto text-sm font-mono bg-black/30">
            <code className="text-white/80">{`func authenticate(reason: String) async -> Bool {
    let context = LAContext()
    context.localizedCancelTitle = "Cancel"
    
    do {
        let success = try await context.evaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics,
            localizedReason: reason
        )
        return success
    } catch {
        // Fallback to passcode
        return await authenticateWithPasscode(reason: reason)
    }
}

// Encrypt with AES-256-GCM
func encrypt(data: Data, key: SymmetricKey) throws -> Data {
    let sealed = try AES.GCM.seal(data, using: key)
    return sealed.combined!
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
