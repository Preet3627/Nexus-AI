import type { Metadata } from 'next'
import DocsLayout from './docs-layout'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Complete documentation for Nexus-AI including installation, commands, keyboard shortcuts, component analysis, Siri integration, and security features.',
  alternates: {
    canonical: 'https://preet3627.github.io/Nexus-AI/docs/',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>
}
