'use client'

import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { Mail, MessageSquare, HelpCircle, AlertCircle } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-blue-600" />
            联系我们
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <p className="text-gray-700 leading-relaxed mb-6">
                如果您有任何问题、建议或反馈，我们很乐意听到您的声音。请通过以下方式与我们联系：
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-blue-600" />
                邮箱联系
              </h2>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">联系我们：</p>
                    <a href="mailto:371920029173abcd@gmail.com" className="text-blue-600 hover:text-blue-700 underline">
                      371920029173abcd@gmail.com
                    </a>
                  </div>
                  <p className="text-gray-600 text-sm mt-2">一般咨询、隐私、法律、技术支持等均可通过上述邮箱联系。</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-green-600" />
                常见问题
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何注册账户？</h3>
                  <p className="text-gray-600 text-sm">
                    点击网站右上角的"注册"按钮，填写用户名、密码等信息即可完成注册。
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何上传文件？</h3>
                  <p className="text-gray-600 text-sm">
                    登录后，点击"上传文件"按钮，选择要上传的文件即可。支持多种文件格式。
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">存储空间如何计算？</h3>
                  <p className="text-gray-600 text-sm">
                    免费用户拥有20GB存储空间，管理员用户拥有100GB存储空间。
                    您可以在个人资料页面查看已使用的存储空间。
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何创建论坛？</h3>
                  <p className="text-gray-600 text-sm">
                    创建论坛需要消耗30个沙币。您可以通过点击广告或浏览内容获得沙币。
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link href="/help" className="text-blue-600 hover:text-blue-700 underline">
                  查看更多帮助信息 →
                </Link>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                反馈建议
              </h2>
              <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                <p className="text-gray-700 leading-relaxed mb-4">
                  我们非常重视您的意见和建议。如果您有任何想法或发现问题，请通过邮箱联系我们。
                  我们会认真考虑每一条反馈，并努力改进我们的服务。
                </p>
                <p className="text-gray-700 leading-relaxed">
                  对于紧急问题或安全漏洞，请立即通过邮箱联系我们，我们会在24小时内回复。
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">相关链接</h2>
              <div className="flex flex-wrap gap-4">
                <Link href="/about" className="text-blue-600 hover:text-blue-700 underline">
                  关于我们
                </Link>
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                  隐私政策
                </Link>
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                  服务条款
                </Link>
                <Link href="/help" className="text-blue-600 hover:text-blue-700 underline">
                  使用帮助
                </Link>
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

