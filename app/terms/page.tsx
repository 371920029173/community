'use client'

import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { FileText, AlertCircle, Shield, Ban } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <FileText className="w-10 h-10 text-blue-600" />
            服务条款
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              最后更新时间：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. 接受条款</h2>
              <p className="text-gray-700 leading-relaxed">
                通过访问和使用本网站，您同意遵守本服务条款。如果您不同意这些条款，请不要使用我们的服务。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. 服务描述</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们提供以下服务：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>文件存储和管理</li>
                <li>文件分享和下载</li>
                <li>私信交流</li>
                <li>论坛社区</li>
                <li>其他相关功能</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. 用户账户</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                使用我们的服务需要创建账户。您同意：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>提供准确、完整和最新的信息</li>
                <li>维护账户信息的安全性</li>
                <li>对账户下的所有活动负责</li>
                <li>立即通知我们任何未经授权的使用</li>
                <li>不与他人共享账户信息</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Ban className="w-6 h-6 text-red-600" />
                4. 禁止行为
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您不得使用我们的服务从事以下活动：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>上传、分享或传播非法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽或其他令人反感的内容</li>
                <li>侵犯他人的知识产权、隐私权或其他权利</li>
                <li>传播病毒、恶意软件或其他有害代码</li>
                <li>进行欺诈、虚假陈述或其他非法活动</li>
                <li>干扰或破坏服务的正常运行</li>
                <li>未经授权访问其他用户的账户或数据</li>
                <li>使用自动化工具（如爬虫、机器人）访问服务</li>
                <li>进行任何可能损害我们或第三方利益的活动</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. 内容所有权</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                您保留对上传内容的所有权。通过上传内容，您授予我们：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>存储、处理和显示内容的权利</li>
                <li>在提供服务所需范围内使用内容的权利</li>
                <li>删除违反本条款的内容的权利</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                您保证拥有上传内容的所有必要权利，且内容不侵犯任何第三方的权利。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. 服务可用性</h2>
              <p className="text-gray-700 leading-relaxed">
                我们努力确保服务的可用性，但不保证服务将始终可用、不间断或无错误。
                我们保留随时修改、暂停或终止服务的权利，无需提前通知。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. 存储限制</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们为不同用户提供不同的存储空间限制：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>免费用户：20GB 存储空间</li>
                <li>管理员用户：100GB 存储空间</li>
                <li>我们保留修改存储限制的权利</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                8. 免责声明
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                在法律允许的最大范围内：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>我们不对服务的准确性、完整性或适用性作任何保证</li>
                <li>我们不保证服务将满足您的需求或期望</li>
                <li>我们对因使用或无法使用服务而产生的任何损害不承担责任</li>
                <li>我们对用户上传的内容不承担责任</li>
                <li>我们对第三方网站或服务不承担责任</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. 账户终止</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                我们保留随时终止或暂停您的账户的权利，如果：
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>您违反本服务条款</li>
                <li>您从事非法或有害活动</li>
                <li>您长期不使用账户</li>
                <li>法律要求我们这样做</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                账户终止后，我们可能会删除您的账户和相关数据。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. 条款修改</h2>
              <p className="text-gray-700 leading-relaxed">
                我们保留随时修改本服务条款的权利。重大变更将通过网站公告通知您。
                继续使用服务即表示您接受修改后的条款。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. 适用法律</h2>
              <p className="text-gray-700 leading-relaxed">
                本服务条款受中华人民共和国法律管辖。任何争议应通过友好协商解决，
                协商不成的，提交有管辖权的人民法院解决。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. 联系我们</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您对本服务条款有任何疑问，请通过以下方式联系我们：
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>邮箱：</strong>legal@example.com
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
