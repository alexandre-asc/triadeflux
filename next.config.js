/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'sharp'],
  },
}

module.exports = nextConfig
