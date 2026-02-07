'use client'

import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'
import { HelpCircle, Upload, FolderOpen, MessageSquare, Users, Sparkles, Search, FileText } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow-lg">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <HelpCircle className="w-10 h-10 text-blue-600" />
            使用帮助
          </h1>

          <div className="mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-amber-800 font-medium">隐私提示</p>
            <p className="text-amber-700 text-sm mt-1">
              我们不会主动收集您的隐私，请注意个人隐私安全。建议您浏览
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline mx-1">隐私政策</Link>
              与
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline ml-1">服务条款</Link>
              等相关条文。
            </p>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6 text-green-600" />
                文件上传与管理
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何上传文件？</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                    <li>登录您的账户</li>
                    <li>点击导航栏中的"上传文件"按钮</li>
                    <li>选择要上传的文件（支持拖拽上传）</li>
                    <li>等待上传完成</li>
                    <li>文件将自动保存到您的云盘</li>
                  </ol>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何管理文件？</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    在"我的云盘"页面，您可以：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>查看所有已上传的文件</li>
                    <li>搜索和筛选文件</li>
                    <li>重命名文件</li>
                    <li>删除不需要的文件</li>
                    <li>查看文件大小和上传时间</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">存储空间限制</h3>
                  <p className="text-gray-700 text-sm">
                    免费用户拥有20GB存储空间，管理员用户拥有100GB存储空间。
                    您可以在个人资料页面查看已使用的存储空间。
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                私信功能
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何发送私信？</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                    <li>点击导航栏中的"私信"按钮</li>
                    <li>在搜索框中输入用户名搜索用户</li>
                    <li>点击用户开始对话</li>
                    <li>输入消息或上传文件</li>
                    <li>点击发送按钮</li>
                  </ol>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何在私信中分享文件？</h3>
                  <p className="text-gray-700 text-sm">
                    在私信输入框中，点击附件图标选择文件，然后发送即可。
                    文件将自动上传并分享给对方。
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-600" />
                论坛功能
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何创建论坛？</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                    <li>确保您有足够的沙币（创建论坛需要30个沙币）</li>
                    <li>进入"论坛大厅"页面</li>
                    <li>点击"创建我的论坛+"按钮</li>
                    <li>填写论坛标题、描述和当前讨论内容</li>
                    <li>点击"创建"按钮</li>
                  </ol>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何获得沙币？</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>点击网站上的广告（每天每个位置限1次，每次5个沙币）</li>
                    <li>进行高质量浏览（根据 AdSense 要求）</li>
                    <li>有效点击广告可获得5个沙币</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">论坛管理</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    论坛所有者可以：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>修改论坛的讨论内容和公告（消耗3个沙币）</li>
                    <li>隐藏或显示论坛</li>
                    <li>续费论坛（消耗25个沙币，延长30天）</li>
                    <li>删除论坛</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Search className="w-6 h-6 text-blue-600" />
                搜索功能
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">如何搜索文件？</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                  <li>进入"搜索文件"页面</li>
                  <li>在搜索框中输入文件名、描述或标签</li>
                  <li>可选择文件类型进行筛选</li>
                  <li>点击"搜索"按钮或按回车键</li>
                  <li>查看搜索结果</li>
                </ol>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-600" />
                占卜功能
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">如何使用占卜功能？</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 text-sm">
                  <li>进入"占卜系统"页面</li>
                  <li>选择占卜类型（今日运势、爱情运势、事业运势等）</li>
                  <li>点击"开始占卜"按钮</li>
                  <li>查看占卜结果</li>
                </ol>
                <p className="text-gray-700 text-sm mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <strong>注意：</strong>占卜结果仅供娱乐参考，不构成任何形式的建议或指导。
                  请理性对待，不要过度依赖。
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">常见问题</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">忘记密码怎么办？</h3>
                  <p className="text-gray-700 text-sm">
                    目前暂不支持密码重置功能。请妥善保管您的账户信息。
                    如需帮助，请联系客服。
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">文件上传失败怎么办？</h3>
                  <p className="text-gray-700 text-sm">
                    请检查：文件大小是否超过限制、网络连接是否正常、存储空间是否充足。
                    如问题持续，请联系技术支持。
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">如何举报不当内容？</h3>
                  <p className="text-gray-700 text-sm">
                    如发现不当内容，请通过私信联系管理员或发送邮件至 371920029173abcd@gmail.com。
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">需要更多帮助？</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                如果您的问题在这里找不到答案，请通过以下方式联系我们：
              </p>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>邮箱：</strong>
                  <a href="mailto:371920029173abcd@gmail.com" className="text-blue-600 hover:text-blue-700 underline ml-2">
                    371920029173abcd@gmail.com
                  </a>
                </p>
                <p className="text-gray-700">
                  <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
                    访问联系我们页面 →
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

