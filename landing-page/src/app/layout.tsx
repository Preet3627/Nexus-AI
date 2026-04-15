import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexus-AI - Native macOS AI Assistant',
  description: 'Open source macOS AI assistant with floating overlay, multi-LLM support, and enterprise security. Built with SwiftUI + Tauri.',
  keywords: ['macos', 'ai', 'assistant', 'tauri', 'swiftui', 'llm', 'open source'],
  authors: [{ name: 'Nexus-AI Team' }],
  openGraph: {
    title: 'Nexus-AI - Native macOS AI Assistant',
    description: 'Open source macOS AI assistant with floating overlay, multi-LLM support, and enterprise security.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
