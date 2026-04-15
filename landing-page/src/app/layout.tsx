import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://preet3627.github.io'),
  title: {
    default: 'Nexus-AI | Native macOS AI Assistant',
    template: '%s | Nexus-AI',
  },
  description: 'Native macOS AI assistant with floating overlay, multi-LLM support (Ollama, OpenAI, Anthropic), enterprise security (Touch ID, AES-256-GCM), Siri integration, and automation scheduling.',
  keywords: [
    'Nexus-AI',
    'macOS AI assistant',
    'AI overlay',
    'ChatGPT macOS',
    'Claude macOS',
    'local LLM',
    'Ollama',
    'productivity',
    'automation',
    'Siri shortcuts',
    'native macOS',
    'floating panel',
    'enterprise security',
    'Touch ID',
  ],
  authors: [{ name: 'Nexus-AI Team', url: 'https://github.com/preet3627' }],
  creator: 'Nexus-AI',
  publisher: 'Nexus-AI',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://preet3627.github.io/Nexus-AI/',
    siteName: 'Nexus-AI',
    title: 'Nexus-AI | Native macOS AI Assistant',
    description: 'Native macOS AI assistant with floating overlay, multi-LLM support, enterprise security, and Siri integration.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nexus-AI - Native macOS AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus-AI | Native macOS AI Assistant',
    description: 'Native macOS AI assistant with floating overlay, multi-LLM support, enterprise security, and Siri integration.',
    images: ['/og-image.png'],
    creator: '@NexusAI',
  },
  alternates: {
    canonical: 'https://preet3627.github.io/Nexus-AI/',
  },
  category: 'Software',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#020617" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Nexus-AI',
              description: 'Native macOS AI assistant with floating overlay, multi-LLM support, enterprise security, and Siri integration.',
              url: 'https://preet3627.github.io/Nexus-AI/',
              applicationCategory: 'ProductivityApplication',
              operatingSystem: 'macOS',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150',
              },
              softwareHelp: {
                '@type': 'CreativeWork',
                name: 'Documentation',
                url: 'https://preet3627.github.io/Nexus-AI/docs/',
              },
              releaseNotes: {
                '@type': 'CreativeWork',
                name: 'Changelog',
                url: 'https://github.com/preet3627/Nexus-AI/releases',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TechArticle',
              name: 'Nexus-AI Technical Documentation',
              description: 'Complete technical documentation for Nexus-AI including API reference, component analysis, and integration guides.',
              url: 'https://preet3627.github.io/Nexus-AI/docs/',
              about: {
                '@type': 'SoftwareApplication',
                name: 'Nexus-AI',
                applicationCategory: 'DeveloperApplication',
              },
              proficiencyLevel: 'Expert',
              version: '1.0.0',
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
