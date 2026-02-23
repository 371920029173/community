'use client'

import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { Shield, Lock, Eye, FileText } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Shield className="w-10 h-10 text-blue-600" />
            隐私政策
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              最后更新时间：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. 信息收集</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们收集以下类型的信息：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>账户信息：</strong>用户名、邮箱地址、密码（加密存储）</li>
                <li><strong>个人资料：</strong>昵称、头像、个人简介等可选的个人信息</li>
                <li><strong>文件信息：</strong>您上传的文件名称、大小、类型等元数据</li>
                <li><strong>使用数据：</strong>访问记录、操作日志、设备信息等</li>
                <li><strong>设备信息：</strong>设备指纹、IP地址、浏览器类型等（用于安全防护）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. 信息使用</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用收集的信息用于以下目的：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>提供、维护和改进我们的服务</li>
                <li>处理您的请求和交易</li>
                <li>发送服务通知和更新</li>
                <li>防止欺诈和滥用行为</li>
                <li>遵守法律法规要求</li>
                <li>改善用户体验和个性化服务</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. 信息共享</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们不会出售、交易或出租您的个人信息给第三方。我们仅在以下情况下共享信息：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>获得您的明确同意</li>
                <li>遵守法律法规或监管要求</li>
                <li>保护我们的权利、财产或安全</li>
                <li>与服务提供商共享（如云存储服务），但仅限于提供服务所需</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. 数据安全</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们采用行业标准的安全措施保护您的信息：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>使用加密技术传输和存储敏感数据</li>
                <li>定期进行安全审计和漏洞扫描</li>
                <li>限制员工访问个人信息的权限</li>
                <li>采用安全的身份验证机制</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Cookie 和追踪技术</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们使用 Cookie 和类似技术来：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>记住您的登录状态和偏好设置</li>
                <li>分析网站使用情况</li>
                <li>提供个性化内容</li>
                <li>显示相关广告（通过 Google AdSense）</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                您可以通过浏览器设置管理 Cookie，但这可能影响某些功能的正常使用。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. 您的权利</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您有权：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>访问、更正或删除您的个人信息</li>
                <li>撤回对数据处理的同意</li>
                <li>要求数据可移植性</li>
                <li>反对某些数据处理活动</li>
                <li>提出投诉（向相关监管机构）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. 第三方服务</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们的服务可能包含指向第三方网站的链接。我们不对这些网站的隐私做法负责。
                我们使用以下第三方服务：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Supabase：</strong>用于数据存储和身份验证</li>
                <li><strong>Google AdSense：</strong>用于显示广告</li>
                <li><strong>Cloudflare：</strong>用于内容分发和安全防护</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. 儿童隐私</h2>
              <p className="text-gray-700 leading-relaxed">
                我们的服务不面向13岁以下的儿童。我们不会故意收集儿童的个人信息。
                如果您是儿童的父母或监护人，发现我们收集了儿童信息，请联系我们删除。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. 政策变更</h2>
              <p className="text-gray-700 leading-relaxed">
                我们可能会不时更新本隐私政策。重大变更将通过网站公告或电子邮件通知您。
                继续使用我们的服务即表示您接受更新后的政策。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. 联系我们</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您对本隐私政策有任何疑问，请通过以下方式联系我们：
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>邮箱：</strong><a href="mailto:371920029173abcd@gmail.com" className="text-blue-600 hover:text-blue-700 underline">371920029173abcd@gmail.com</a>
                </p>
                <p className="text-gray-700">
                  <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
                    访问联系我们页面
                  </Link>
                </p>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/" className="text-blue-600 hover:text-blue-700 underline">
                ← 返回首页
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
