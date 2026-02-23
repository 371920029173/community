'use client'

import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { FileText, Users, Shield, Heart, Sparkles, MessageSquare, Cloud, Share2 } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">关于我们</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">平台简介</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                文件分享平台是一个现代化的资源分享与社区交流平台。我们致力于为用户提供安全、便捷的文件存储、分享和管理服务，
                同时打造一个活跃的社区环境，让用户能够交流想法、分享资源、创建论坛。
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们的使命是"资源与你同频，信息予你无限"，希望通过技术的力量，让信息流动更加顺畅，让知识分享更加便捷。
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Weavelink 不追求大而全的臃肿功能，而是把「云盘 + 分享链接 + 私信 + 论坛」四类核心能力做在同一产品里，
                避免用户在多平台之间来回切换。无论是临时传一个文件给同事，还是长期在论坛里维护一个话题，都可以在同一个账号下完成。
              </p>
              <p className="text-gray-700 leading-relaxed">
                平台面向个人与小团队设计，上传与存储规则清晰（如单文件 50MB、免费用户云盘空间等），
                并配有完整的隐私政策、服务条款与使用帮助，方便用户了解自己的权利与使用方式。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">技术架构与数据安全</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用 Next.js 构建前端、Supabase 作为后端与数据库，部署在 Cloudflare Pages 上。
                用户密码与敏感信息经加密处理，文件元数据与权限通过数据库行级策略进行控制，以减少未授权访问风险。
              </p>
              <p className="text-gray-700 leading-relaxed">
                我们不会将您的个人数据出售给第三方。广告或统计类合作均遵循隐私政策中的披露条款。
                若您对数据存储地、保留期限或删除方式有疑问，可查阅隐私政策或通过联系我们页面获取说明。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">核心功能</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Cloud className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">云盘管理</h3>
                    <p className="text-gray-600 text-sm">智能云盘管理，为您提供高效的文件存储和组织服务</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Share2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">文件分享</h3>
                    <p className="text-gray-600 text-sm">安全便捷的文件分享功能，支持多种文件格式</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">私信系统</h3>
                    <p className="text-gray-600 text-sm">与朋友和同事进行私密交流，分享文件和想法</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">论坛社区</h3>
                    <p className="text-gray-600 text-sm">创建和管理自己的论坛，与志同道合的人交流</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">占卜功能</h3>
                    <p className="text-gray-600 text-sm">有趣的占卜功能，为您的文件分享之旅增添乐趣</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">安全可靠</h3>
                    <p className="text-gray-600 text-sm">企业级安全防护，确保您的文件和个人信息安全</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">适合谁用</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                本平台适合需要轻量级文件分享与社区功能的个人用户、兴趣小组、班级或小团队。
                若您需要把资料备份到云端、生成分享链接发给他人、在私信里传文件，或在一个主题下持续讨论与沉淀内容，
                Weavelink 提供的云盘、分享、私信与论坛功能可以覆盖这些场景，而无需分别使用多个不相关的产品。
              </p>
              <p className="text-gray-700 leading-relaxed">
                我们不面向未成年人单独提供注册引导；若您未满相应年龄，请在使用前征得监护人同意，并遵守当地法律。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">我们的价值观</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">用户至上</h3>
                    <p className="text-gray-600 text-sm">我们始终将用户体验放在首位，不断优化产品功能和服务质量</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">安全第一</h3>
                    <p className="text-gray-600 text-sm">我们采用先进的安全技术，保护用户的隐私和数据安全</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">开放共享</h3>
                    <p className="text-gray-600 text-sm">我们鼓励知识分享和社区交流，让信息流动更加顺畅</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">联系我们</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您有任何问题、建议或反馈，欢迎通过以下方式联系我们：
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>邮箱：</strong><a href="mailto:371920029173abcd@gmail.com" className="text-blue-600 hover:text-blue-700 underline">371920029173abcd@gmail.com</a>
                </p>
                <p className="text-gray-700">
                  <strong>网站：</strong>
                <a href="https://weavelink.pages.dev" className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer">
                  weavelink.pages.dev
                </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">相关链接</h2>
              <div className="flex flex-wrap gap-4">
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                  隐私政策
                </Link>
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                  服务条款
                </Link>
                <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
                  联系我们
                </Link>
                <Link href="/help" className="text-blue-600 hover:text-blue-700 underline">
                  使用帮助
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

