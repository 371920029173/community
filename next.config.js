/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'mmnulqhurqohukuobusj.supabase.co'],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('node:buffer', 'node:async_hooks')
    }
    return config
  },
}

module.exports = nextConfig 