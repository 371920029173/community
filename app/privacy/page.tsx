import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { Shield, Cookie, Lock, Eye, FileText } from 'lucide-react'

export const metadata = {
  title: '隐私政策 - 文件分享平台',
  description: '文件分享平台隐私政策，说明我们如何收集、使用和保护您的个人信息'
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">隐私政策</h1>
            </div>
            <p className="text-gray-600">最后更新：{new Date().toLocaleDateString('zh-CN')}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6" />
                1. 信息收集
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们收集以下类型的信息以提供和改进我们的服务：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>账户信息</strong>：用户名、邮箱地址、头像、昵称等</li>
                <li><strong>文件信息</strong>：您上传的文件、文件大小、文件类型等</li>
                <li><strong>使用数据</strong>：访问时间、页面浏览、功能使用情况等</li>
                <li><strong>设备信息</strong>：IP 地址、浏览器类型、操作系统等</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6" />
                2. 信息使用
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用收集的信息用于：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>提供、维护和改进我们的服务</li>
                <li>处理您的请求和交易</li>
                <li>发送重要通知和更新</li>
                <li>个性化您的体验</li>
                <li>分析和改进服务性能</li>
              </ul>
            </section>

            <section id="cookie" className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Cookie className="w-6 h-6" />
                3. Cookie 和跟踪技术
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用 Cookie 和类似技术来：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>会话管理</strong>：保持您的登录状态</li>
                <li><strong>偏好设置</strong>：记住您的语言和主题偏好</li>
                <li><strong>分析统计</strong>：了解网站使用情况（如果使用 Google Analytics 等第三方服务）</li>
                <li><strong>广告服务</strong>：如果您选择使用广告服务（如 Google AdSense），相关服务商可能使用 Cookie 来提供个性化广告</li>
              </ul>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Cookie 管理</strong>：您可以通过浏览器设置管理 Cookie。请注意，禁用 Cookie 可能影响某些功能的正常使用。
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6" />
                4. 第三方服务
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们可能使用以下第三方服务，这些服务可能收集您的信息：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Supabase</strong>：用于数据存储和用户认证（服务提供商：Supabase Inc.）</li>
                <li><strong>Cloudflare</strong>：用于内容分发和安全防护（服务提供商：Cloudflare Inc.）</li>
                <li><strong>Google AdSense</strong>（如使用）：用于广告展示（服务提供商：Google LLC）
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Google 可能使用 Cookie 和类似技术来提供个性化广告</li>
                    <li>您可以通过 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google 广告设置</a> 管理广告偏好</li>
                    <li>如需退出个性化广告，请访问 <a href="https://www.google.com/settings/ads/onweb" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">广告个性化设置</a></li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 信息共享</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们不会出售、交易或转让您的个人信息给第三方，除非：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>获得您的明确同意</li>
                <li>法律要求或应政府机构要求</li>
                <li>保护我们的权利和财产</li>
                <li>为提供服务而与服务提供商共享（这些提供商有义务保护您的信息）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 数据安全</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们采取合理的安全措施来保护您的信息，包括：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>使用加密技术传输和存储数据</li>
                <li>定期进行安全审计和更新</li>
                <li>限制对个人信息的访问权限</li>
                <li>使用可信的第三方服务提供商</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 您的权利</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您有权：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>访问、更正或删除您的个人信息</li>
                <li>撤回同意（如果适用）</li>
                <li>请求数据导出</li>
                <li>投诉或提出疑问</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                如需行使这些权利，请通过个人资料页面或联系管理员。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 儿童隐私</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们的服务面向 18 岁及以上的用户。我们不会故意收集 18 岁以下儿童的个人信息。
                如果您认为我们收集了儿童信息，请立即联系我们。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 政策变更</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们可能会不时更新本隐私政策。重大变更将在网站上显著位置通知。
                继续使用服务即表示您接受更新后的政策。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 联系我们</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您对本隐私政策有任何疑问或建议，请：
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>通过个人资料页面联系管理员</li>
                <li>在网站管理后台提交反馈</li>
              </ul>
            </section>

            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>重要提示</strong>：使用我们的服务即表示您同意本隐私政策。
                如果您不同意，请停止使用我们的服务。
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
                <FileText className="w-5 h-5 inline mr-2" />
                查看服务条款
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

