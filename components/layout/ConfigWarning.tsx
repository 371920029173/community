'use client'

import { AlertTriangle, Settings, Database } from 'lucide-react'

export default function ConfigWarning() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            系统配置提醒
          </h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>
              当前系统运行在演示模式下，某些功能可能无法正常使用。
            </p>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <Database className="w-4 h-4" />
                <span>数据库：未连接</span>
              </div>
              <div className="flex items-center space-x-1">
                <Settings className="w-4 h-4" />
                <span>配置：演示模式</span>
              </div>
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              要使用完整功能，请在Vercel中配置Supabase环境变量并运行数据库初始化脚本。
            </p>
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <strong>部署提示：</strong>在Vercel项目设置中添加环境变量后，系统将自动使用真实数据库。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 