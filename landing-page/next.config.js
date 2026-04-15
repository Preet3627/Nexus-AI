/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: '/Nexus-AI',
  assetPrefix: '/Nexus-AI',
}

module.exports = nextConfig
