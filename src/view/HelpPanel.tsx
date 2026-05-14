import { motion } from "framer-motion";

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const siriShortcuts = [
  {
    title: "Ask Nexus",
    phrase: '"Hey Siri, ask Nexus to [message]"',
    action: "Sends the message to Nexus and Siri speaks the reply",
  },
  {
    title: "Play Song",
    phrase: '"Hey Siri, ask Nexus to play Hum Pyaar Karne Wale"',
    action:
      "Uses your preferred provider and can automate YouTube via Comet-AI",
  },
  {
    title: "Open Nexus",
    phrase: '"Hey Siri, open Nexus AI"',
    action: "Launches Nexus AI",
  },
  {
    title: "Web Search",
    phrase: '"Hey Siri, look up [query] using Nexus AI"',
    action: "Opens a web search from Nexus AI",
  },
  {
    title: "Research Link",
    phrase: '"Hey Siri, research [url] with Nexus AI"',
    action: "Opens the URL for research",
  },
];

const siriIntents = [
  {
    name: "AskNexusIntent",
    description: "Ask Nexus a question and have Siri read the response",
    example: '"Hey Siri, ask Nexus to summarize my emails"',
    category: "Core",
  },
  {
    name: "PlaySongWithNexusIntent",
    description: "Play a song with Nexus using the selected provider",
    example: '"Hey Siri, ask Nexus to play Hum Pyaar Karne Wale"',
    category: "Music",
  },
  {
    name: "OpenNexusIntent",
    description: "Launch the Nexus AI app",
    example: '"Hey Siri, open Nexus AI"',
    category: "Navigation",
  },
  {
    name: "SearchWebIntent",
    description: "Open a web search",
    example: '"Hey Siri, look up release notes using Nexus AI"',
    category: "Search",
  },
  {
    name: "ResearchWithCometIntent",
    description: "Open a URL for research",
    example: '"Hey Siri, research https://developer.apple.com with Nexus AI"',
    category: "Research",
  },
  {
    name: "ExtractFileIntent",
    description: "Prepare a local file extraction request",
    example: '"Hey Siri, read /Users/me/Notes.txt using Nexus AI"',
    category: "Files",
  },
  {
    name: "SetOutputVolumeIntent",
    description: "Adjust macOS output volume",
    example: '"Hey Siri, set Mac volume with Nexus AI"',
    category: "System",
  },
];

const quickCommands = [
  { cmd: "/web [query]", desc: "Search the web" },
  { cmd: "/open [url/path]", desc: "Open URL or file" },
  {
    cmd: "/play [song] | [provider]",
    desc: "Play a song on YouTube, Spotify, or Apple Music",
  },
  { cmd: "/shell [command]", desc: "Run shell command" },
  { cmd: "/volume [0-100]", desc: "Set system volume" },
  { cmd: "/provider [name]", desc: "Switch AI provider" },
  { cmd: "/apikey [provider] [key]", desc: "Set API key" },
  { cmd: "/autolaunch [on/off]", desc: "Toggle auto-launch" },
  { cmd: "/touchid", desc: "Verify Touch ID" },
  { cmd: "/menuicon [show/hide]", desc: "Toggle menu icon" },
  { cmd: "/screen", desc: "Capture screen" },
];

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-[#1a1a2e] rounded-3xl shadow-2xl w-[560px] max-h-[85vh] overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#1a1a2e] to-[#16213e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Help & Siri Controls
              </h2>
              <p className="text-xs text-white/50">Learn how to use Nexus AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4 text-white/70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-purple-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
              <h3 className="text-lg font-bold text-white">Siri Shortcuts</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {siriShortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-4 h-4 text-purple-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    </svg>
                    <h4 className="font-semibold text-white text-sm">
                      {shortcut.title}
                    </h4>
                  </div>
                  <p className="text-xs text-purple-400 font-mono mb-1">
                    {shortcut.phrase}
                  </p>
                  <p className="text-xs text-white/60">{shortcut.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-yellow-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Siri Intents</h3>
            </div>
            <div className="space-y-3">
              {siriIntents.map((intent, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-yellow-400 text-sm">
                        {intent.name}
                      </h4>
                      <p className="text-xs text-white/60">
                        {intent.description}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/50">
                      {intent.category}
                    </span>
                  </div>
                  <p className="text-xs text-purple-400 font-mono">
                    Example: {intent.example}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-orange-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <h3 className="text-lg font-bold text-white">Quick Commands</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickCommands.map((cmd, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
                >
                  <code className="text-xs text-orange-400 font-mono whitespace-nowrap">
                    {cmd.cmd}
                  </code>
                  <span className="text-xs text-white/50 truncate">
                    {cmd.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-green-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
              </svg>
              <h3 className="text-lg font-bold text-white">
                Keyboard Shortcuts
              </h3>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-sm text-white/70">Open Nexus AI</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    Ctrl
                  </kbd>
                  <span className="text-white/40">+</span>
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    Ctrl
                  </kbd>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-sm text-white/70">New Conversation</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    Cmd
                  </kbd>
                  <span className="text-white/40">+</span>
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    N
                  </kbd>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <span className="text-sm text-white/70">Settings</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    Cmd
                  </kbd>
                  <span className="text-white/40">+</span>
                  <kbd className="px-2 py-1 rounded-lg bg-white/10 text-xs text-white font-mono">
                    ,
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <p className="text-sm text-white/80 mb-2">
              <span className="font-semibold text-blue-400">Pro Tip:</span>{" "}
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
                Ctrl
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">
                Ctrl
              </kbd>{" "}
              twice quickly to open Nexus AI from anywhere.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
