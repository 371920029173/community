'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'

export default function FontPreviewPage() {
  const [selectedFont, setSelectedFont] = useState<'scheme1' | 'scheme2' | 'scheme3'>('scheme1')

  const fontSchemes = {
    scheme1: {
      name: '方案一：现代简约',
      fontFamily: "'Noto Sans SC', 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      description: '思源黑体 + Inter，清晰易读，适合正文和UI'
    },
    scheme2: {
      name: '方案二：科技感',
      fontFamily: "'Inter', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      description: 'Inter 优先，现代科技风格，适合数字化平台'
    },
    scheme3: {
      name: '方案三：传统与现代结合',
      fontFamily: "'Noto Serif SC', 'Inter', 'PingFang SC', 'Microsoft YaHei', serif",
      description: '思源宋体 + Inter，传统与现代的完美融合'
    }
  }

  const currentScheme = fontSchemes[selectedFont]

  // 更惊艳的名字建议
  const nameSuggestions = [
    { name: '星域', meaning: '资源如星辰般广阔，社区如星域般璀璨', style: '科技感、未来感' },
    { name: '流境', meaning: '资源流动的境界，信息汇聚的场域', style: '动态感、空间感' },
    { name: '光域', meaning: '资源如光汇聚，社区如光域般明亮', style: '明亮、科技感' },
    { name: '云境', meaning: '云端之境，资源与交流的完美融合', style: '现代、轻盈' },
    { name: '数境', meaning: '数字之境，资源与智慧的汇聚地', style: '数字化、现代' },
    { name: '汇境', meaning: '资源汇聚的境界，社区交流的场域', style: '汇聚感、空间感' },
    { name: '光汇', meaning: '资源如光汇聚，信息如光传递', style: '明亮、动态' },
    { name: '星汇', meaning: '资源如星汇聚，社区如星云般璀璨', style: '科技感、视觉冲击' },
    { name: '流域', meaning: '资源流动的领域，信息流动的空间', style: '动态、现代' },
    { name: '云域', meaning: '云端领域，资源与交流的无限空间', style: '现代、广阔' },
    { name: '光境', meaning: '光明的境界，资源与智慧的汇聚', style: '明亮、高端' },
    { name: '数域', meaning: '数字领域，资源与技术的融合', style: '科技感、现代' },
    { name: '汇星', meaning: '汇聚如星，资源与社区的璀璨', style: '视觉冲击、现代' },
    { name: '流光', meaning: '流动的光，资源与信息的传递', style: '动态、明亮' },
    { name: '云星', meaning: '云端之星，资源与社区的闪耀', style: '现代、科技感' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 字体方案选择 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">字体方案预览</h1>
          
          <div className="flex gap-4 mb-8">
            {(['scheme1', 'scheme2', 'scheme3'] as const).map((scheme) => (
              <button
                key={scheme}
                onClick={() => setSelectedFont(scheme)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  selectedFont === scheme
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {fontSchemes[scheme].name}
              </button>
            ))}
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{currentScheme.name}</h2>
            <p className="text-gray-600 mb-4">{currentScheme.description}</p>
            <code className="text-sm bg-gray-100 px-3 py-1 rounded">{currentScheme.fontFamily}</code>
          </div>
        </div>

        {/* 字体效果预览 */}
        <div className="space-y-8">
          {/* 主标题预览 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">主标题效果</h3>
            <div 
              className="text-5xl font-bold"
              style={{ 
                fontFamily: currentScheme.fontFamily,
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '20px'
              }}
            >
              资源同频
            </div>
            <div 
              className="text-xl text-gray-600"
              style={{ fontFamily: currentScheme.fontFamily }}
            >
              资源与你同频，信息予你无限
            </div>
          </div>

          {/* 正文预览 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">正文效果</h3>
            <div style={{ fontFamily: currentScheme.fontFamily }}>
              <p className="text-base text-gray-700 leading-relaxed mb-4">
                这是一个现代化的资源分享与社区交流平台。在这里，您可以上传、管理和分享您的文件资源，
                同时参与论坛讨论，与其他用户交流想法和经验。
              </p>
              <p className="text-base text-gray-700 leading-relaxed">
                平台采用先进的云存储技术，确保您的文件安全可靠。通过沙币系统，您可以创建和管理自己的论坛，
                打造专属的社区空间。无论是学习资料、工作文档，还是创意作品，都能在这里找到合适的分享方式。
              </p>
            </div>
          </div>

          {/* UI元素预览 */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 border border-white/30 shadow">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">UI元素效果</h3>
            <div style={{ fontFamily: currentScheme.fontFamily }}>
              <button className="btn-primary mb-4">主要按钮</button>
              <button className="btn-secondary mb-4">次要按钮</button>
              <input type="text" className="input-field mb-4" placeholder="输入框示例" readOnly />
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-2">卡片标题</h4>
                <p className="text-gray-600 text-sm">这是卡片内容的示例文本，展示了字体在卡片中的显示效果。</p>
              </div>
            </div>
          </div>
        </div>

        {/* 名字建议 */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">更惊艳的名字建议</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nameSuggestions.map((item, index) => (
              <div 
                key={index}
                className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow hover:shadow-lg transition-all"
                style={{ fontFamily: currentScheme.fontFamily }}
              >
                <div className="text-3xl font-bold mb-2" style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #475569 50%, #64748b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {item.name}
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.meaning}</p>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {item.style}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

