'use client'

import Link from 'next/link'
import { FileText, Shield, Heart } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 关于 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">关于我们</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              文件分享平台致力于为用户提供安全、快速、智能的文件存储和分享服务。
              我们重视用户隐私和数据安全。
            </p>
            <p className="text-gray-300 text-sm">
              联系我们：<a href="mailto:371920029173abcd@gmail.com" className="text-blue-300 hover:text-white transition-colors">371920029173abcd@gmail.com</a>
            </p>
          </div>

          {/* 法律信息 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">法律信息</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/about" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <Heart className="w-4 h-4" />
                  关于我们
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <Shield className="w-4 h-4" />
                  隐私政策
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  服务条款
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <Heart className="w-4 h-4" />
                  联系我们
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  使用帮助
                </Link>
              </li>
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">快速链接</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  联系我们
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  使用帮助
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  关于我们
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              版权所有 © {currentYear} 文件分享平台
            </p>
            <p className="text-gray-400 text-xs">
              本网站使用 Supabase 和 Cloudflare 提供服务
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

