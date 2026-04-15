import Link from 'next/link'

export default function LicensePage() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">License</h1>
        
        <div className="space-y-8">
          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">Apache License 2.0</h2>
            <p className="text-white/60 mb-4">
              Nexus-AI is licensed under the Apache License, Version 2.0.
              You may obtain a copy of the License at:
            </p>
            <code className="block p-4 bg-black/30 rounded-lg text-sm">
              https://www.apache.org/licenses/LICENSE-2.0
            </code>
          </div>

          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Third-Party Licenses</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  Thuki
                </h3>
                <p className="text-white/60 mb-2">
                  Nexus-AI was inspired by and borrows concepts from Thuki, created by Logan Nguyen.
                </p>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/80 mb-2">
                    <strong>Thuki</strong> by <strong>Logan Nguyen</strong> (@quiet_node)
                  </p>
                  <p className="text-sm text-white/60 mb-2">
                    Licensed under the Apache License, Version 2.0
                  </p>
                  <a 
                    href="https://github.com/quiet-node/thuki" 
                    className="text-purple-400 hover:underline text-sm"
                  >
                    https://github.com/quiet-node/thuki
                  </a>
                </div>
                <div className="mt-4 p-4 bg-black/20 rounded-lg">
                  <p className="text-sm text-white/80 mb-2">
                    <strong>Apache License 2.0 - Section 4</strong>
                  </p>
                  <p className="text-xs text-white/60 mb-2">
                    Contributions to Thuki were made pursuant to the Apache License 2.0 (Section 7(b)).
                    Any modifications to Thuki-derived code retain the Apache 2.0 license.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Attribution</h2>
            <p className="text-white/60 mb-4">
              We gratefully acknowledge the following projects and their contributors:
            </p>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <a href="https://tauri.app" className="hover:text-purple-400">Tauri</a> - MIT License
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <a href="https://swift.org" className="hover:text-purple-400">Swift</a> - Apache 2.0 License
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <a href="https://github.com/apple/swift-nio" className="hover:text-purple-400">SwiftNIO</a> - Apache 2.0 License
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <a href="https://github.com/rust-lang/rust" className="hover:text-purple-400">Rust</a> - MIT OR Apache-2.0
              </li>
            </ul>
          </div>

          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">NO WARRANTY</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Unless required by applicable law or agreed to in writing, software
              distributed under the License is distributed on an "AS IS" BASIS,
              WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
              See the License for the specific language governing permissions and
              limitations under the License.
            </p>
          </div>

          <div className="glass rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">COPYRIGHT NOTICE</h2>
            <div className="p-4 bg-white/5 rounded-lg font-mono text-sm">
              <p className="text-white/80 mb-2">Copyright 2026 Nexus-AI Contributors</p>
              <p className="text-white/60 mb-4">
                Licensed under the Apache License, Version 2.0 (the "License");
                you may not use this file except in compliance with the License.
              </p>
              <p className="text-white/60 mb-2">
                Portions of this software are derived from:
              </p>
              <p className="text-white/60">
                Thuki by Logan Nguyen - Copyright 2024 - Licensed under Apache 2.0
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass hover:bg-white/10 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
