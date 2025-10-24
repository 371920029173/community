/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'mmnulqhurqohukuobusj.supabase.co'],
  },
  // 修复 Next.js 15 模板变量问题
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // 添加编译器选项
  compiler: {
    // 移除 console.log 在生产环境中
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig 