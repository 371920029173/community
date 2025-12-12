'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
// import { SidebarAd } from '@/components/ads/AdBanner' // 已移除，仅保留主页广告
import { 
  Sparkles, 
  Star, 
  Heart, 
  Zap, 
  Moon, 
  Sun,
  Coffee,
  Music,
  BookOpen,
  Camera,
  Gamepad2,
  Palette
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FortuneResult {
  type: string
  message: string
  icon: any
  color: string
  description: string
}

const fortuneTypes = [
  { id: 'daily', name: '今日运势', icon: Sun, color: 'from-yellow-400 to-orange-500' },
  { id: 'love', name: '爱情运势', icon: Heart, color: 'from-pink-400 to-red-500' },
  { id: 'career', name: '事业运势', icon: BookOpen, color: 'from-blue-400 to-indigo-500' },
  { id: 'wealth', name: '财运分析', icon: Star, color: 'from-yellow-400 to-amber-500' },
  { id: 'health', name: '健康提醒', icon: Zap, color: 'from-green-400 to-emerald-500' },
  { id: 'creativity', name: '创意灵感', icon: Palette, color: 'from-purple-400 to-pink-500' }
]

const fortuneMessages = {
  daily: [
    { message: '今天是个好日子！', description: '适合尝试新事物，会有意外收获。' },
    { message: '保持积极心态', description: '困难只是暂时的，坚持就是胜利。' },
    { message: '贵人相助', description: '今天会遇到帮助你的贵人。' }
  ],
  love: [
    { message: '桃花运旺盛', description: '单身的朋友今天容易遇到心仪对象。' },
    { message: '感情升温', description: '已有伴侣的朋友感情会更加甜蜜。' },
    { message: '沟通很重要', description: '多和伴侣交流，增进感情。' }
  ],
  career: [
    { message: '工作顺利', description: '今天的工作效率很高，容易获得认可。' },
    { message: '学习新技能', description: '适合学习新知识，提升竞争力。' },
    { message: '团队合作', description: '与同事合作会事半功倍。' }
  ],
  wealth: [
    { message: '财运亨通', description: '今天可能有意外收入或投资机会。' },
    { message: '理性消费', description: '注意控制支出，避免冲动消费。' },
    { message: '理财规划', description: '适合制定理财计划，为未来做准备。' }
  ],
  health: [
    { message: '身体健康', description: '保持良好的作息习惯，身体会感谢你。' },
    { message: '运动健身', description: '适当的运动能提升身体素质和心情。' },
    { message: '注意休息', description: '工作再忙也要记得休息，身体是革命的本钱。' }
  ],
  creativity: [
    { message: '灵感爆发', description: '今天创意灵感特别丰富，适合创作。' },
    { message: '突破常规', description: '尝试新的思维方式，会有意想不到的收获。' },
    { message: '艺术天赋', description: '艺术相关的活动会给你带来快乐。' }
  ]
}

export default function FortunePage() {
  const [selectedType, setSelectedType] = useState<string>('')
  const [fortuneResult, setFortuneResult] = useState<FortuneResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateFortune = async () => {
    if (!selectedType) {
      toast.error('请选择占卜类型')
      return
    }

    setIsCalculating(true)
    
    // 模拟计算过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const messages = fortuneMessages[selectedType as keyof typeof fortuneMessages]
    const randomMessage = messages[Math.floor(Math.random() * messages.length)]
    const fortuneType = fortuneTypes.find(t => t.id === selectedType)
    
    if (fortuneType) {
      setFortuneResult({
        type: fortuneType.name,
        message: randomMessage.message,
        icon: fortuneType.icon,
        color: fortuneType.color,
        description: randomMessage.description
      })
    }
    
    setIsCalculating(false)
    toast.success('占卜完成！')
  }

  const resetFortune = () => {
    setSelectedType('')
    setFortuneResult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3">
            {/* 页面标题 */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                占卜系统
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                这是一个有趣的占卜功能，为您的文件分享之旅增添乐趣和随机性。
                通过占卜获得每日运势、爱情建议、事业指导等，让生活充满惊喜！
              </p>
            </div>

            {/* 占卜类型选择 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">选择占卜类型</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fortuneTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                      <type.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-medium text-gray-900">{type.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 占卜按钮 */}
            {selectedType && (
              <div className="text-center mb-8">
                <button
                  onClick={calculateFortune}
                  disabled={isCalculating}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {isCalculating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>正在占卜...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5" />
                      <span>开始占卜</span>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* 占卜结果 */}
            {fortuneResult && (
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-br ${fortuneResult.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <fortuneResult.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{fortuneResult.type}</h3>
                  <p className="text-3xl font-bold text-purple-600 mb-4">{fortuneResult.message}</p>
                  <p className="text-lg text-gray-600 mb-6">{fortuneResult.description}</p>
                  
                  <button
                    onClick={resetFortune}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    重新占卜
                  </button>
                </div>
              </div>
            )}

            {/* 功能说明 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">功能说明</h2>
              <div className="space-y-4 text-gray-600">
                <p>• <strong>今日运势</strong>：了解今天的整体运势，为一天做好准备</p>
                <p>• <strong>爱情运势</strong>：获得爱情方面的建议和指导</p>
                <p>• <strong>事业运势</strong>：了解工作学习方面的机遇和挑战</p>
                <p>• <strong>财运分析</strong>：获得理财和投资方面的建议</p>
                <p>• <strong>健康提醒</strong>：关注身体健康，获得生活建议</p>
                <p>• <strong>创意灵感</strong>：激发创意灵感，提升创造力</p>
              </div>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm mb-2">
                  💡 <strong>免责声明</strong>：
                </p>
                <ul className="text-yellow-800 text-sm space-y-1 list-disc list-inside">
                  <li>本占卜功能仅供娱乐参考，不构成任何形式的建议或指导</li>
                  <li>占卜结果基于随机算法生成，不具有任何科学依据或预测能力</li>
                  <li>请理性对待占卜结果，不要过度依赖或影响正常生活决策</li>
                  <li>真正的成功来自于自己的努力、坚持和正确的行动</li>
                  <li>本功能不涉及任何形式的迷信、超自然或神秘主义内容</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* 侧边栏 */}
          <div className="lg:col-span-1">
            {/* 广告已移除，仅保留主页广告 */}
          </div>
        </div>
      </main>
    </div>
  )
} 