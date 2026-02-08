'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { Gamepad2, Map, Crosshair, Activity, Zap, Coins, Music, Skull, Target } from 'lucide-react'
import toast from 'react-hot-toast'

const OPERATING_GAMES = [
  {
    id: 'roulette',
    title: '俄罗斯轮盘',
    desc: '每轮选择装弹数1～5，存活倍率叠加。收手或活过5轮得奖励，死亡则人财两空。',
    icon: Target,
    href: '/games/roulette',
    color: 'from-red-500 to-rose-600',
    tag: '运营',
  },
]

const TRIAL_GAMES = [
  {
    id: 'survival',
    title: '生存模式',
    desc: '敌人波次不断增强，你能撑到第几波？程序生成敌潮，每局不同。',
    icon: Zap,
    href: '/games/survival',
    color: 'from-amber-500 to-orange-600',
    tag: '试玩',
  },
  {
    id: 'dungeon',
    title: '地牢探险',
    desc: '程序生成地牢，永久死亡。每次进入都是全新地图，谨慎探索。',
    icon: Map,
    href: '/games/dungeon',
    color: 'from-purple-500 to-indigo-600',
    tag: '试玩',
  },
  {
    id: 'platformer',
    title: '精确平台',
    desc: '模块拼接的跑酷关卡，跳跃时机至关重要。一碰即死，挑战极限。',
    icon: Activity,
    href: '/games/platformer',
    color: 'from-emerald-500 to-teal-600',
    tag: '试玩',
  },
  {
    id: 'bullet-hell',
    title: '弹幕 Boss',
    desc: '躲避密集弹幕，寻找攻击间隙。多个 Boss，多种弹幕组合。',
    icon: Crosshair,
    href: '/games/bullet-hell',
    color: 'from-rose-500 to-pink-600',
    tag: '试玩',
  },
  {
    id: 'rhythm',
    title: '节奏之舞',
    desc: '冰与火之舞风格。球沿路径前进，在金黄圈处按空格击中节拍，错过即死。',
    icon: Music,
    href: '/games/rhythm',
    color: 'from-cyan-500 to-blue-600',
    tag: '试玩',
  },
  {
    id: 'iwanna',
    title: 'I Wanna',
    desc: '高难度平台。触刺即死，精准跳跃，到达星星过关。',
    icon: Skull,
    href: '/games/iwanna',
    color: 'from-amber-500 to-orange-600',
    tag: '试玩',
  },
]

export default function GamesHubPage() {
  const { user } = useAuth()
  const [sandCoins, setSandCoins] = useState(0)
  const [gameCoins, setGameCoins] = useState(0)
  const [exchanging, setExchanging] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const fetchCurrency = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch('/api/games/currency', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        const json = await res.json()
        if (json.success) {
          setSandCoins(json.sandCoins ?? 0)
          setGameCoins(json.gameCoins ?? 0)
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchCurrency()
  }, [user?.id])

  const handleExchange = async (amount: number) => {
    if (!user || amount < 1) return
    setExchanging(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        return
      }
      const res = await fetch('/api/games/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'exchange', amount })
      })
      const json = await res.json()
      if (json.success) {
        setSandCoins(json.sandCoins ?? 0)
        setGameCoins(json.gameCoins ?? 0)
        toast.success(json.message)
      } else {
        toast.error(json.error || '兑换失败')
      }
    } catch (e) {
      toast.error('兑换失败')
    } finally {
      setExchanging(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-800">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 shadow-lg shadow-violet-500/10">
              <Gamepad2 className="w-10 h-10 text-violet-300" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">小游戏中心</h1>
              <p className="text-slate-300 leading-relaxed max-w-xl">高难度、高参与感。5 沙币 = 1 铒币，每次游戏消耗 1 铒币，达成目标返还 2 铒币。<span className="text-amber-300">请合理控制游戏时间，适度娱乐。</span></p>
            </div>
          </div>
          {user && (
            <div className="flex-shrink-0 p-5 rounded-2xl bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 shadow-xl shadow-black/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-200 font-medium">{sandCoins} 沙币</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <span className="text-violet-300 font-semibold">{gameCoins} 铒币</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExchange(1)}
                  disabled={exchanging || sandCoins < 5}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg shadow-violet-500/20"
                >
                  5 沙币 → 1 铒币
                </button>
                <button
                  onClick={() => handleExchange(5)}
                  disabled={exchanging || sandCoins < 25}
                  className="px-4 py-2 text-sm font-medium bg-violet-600/60 hover:bg-violet-500/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-violet-500/30 transition-all"
                >
                  25 → 5 铒币
                </button>
              </div>
            </div>
          )}
        </div>
        {!user && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-900/30 to-orange-900/20 border border-amber-600/40 text-amber-200 text-sm backdrop-blur-sm">
            请先登录后使用铒币玩游戏。点击广告可获得沙币，5 沙币可兑换 1 铒币。
          </div>
        )}
        {OPERATING_GAMES.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">正在运营</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {OPERATING_GAMES.map((g) => (
                <Link
                  key={g.id}
                  href={g.href}
                  className="group relative block p-6 rounded-2xl bg-slate-800/90 backdrop-blur-sm border border-amber-500/30 hover:border-amber-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-amber-500/10" />
                  <div className="relative flex items-start gap-4">
                    <div className={`p-3.5 rounded-xl bg-gradient-to-br ${g.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <g.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold text-white group-hover:text-amber-200 transition-colors">
                          {g.title}
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {g.tag}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{g.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-slate-400 mb-4">试玩（技术测试中）</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {TRIAL_GAMES.map((g) => (
            <Link
              key={g.id}
              href={g.href}
              className="group relative block p-6 rounded-2xl bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 hover:border-violet-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-violet-500/10" />
              <div className="relative flex items-start gap-4">
                <div className={`p-3.5 rounded-xl bg-gradient-to-br ${g.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <g.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-white group-hover:text-violet-200 transition-colors">
                      {g.title}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-200 border border-slate-600/50">
                      {g.tag}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </section>

        <section className="mt-16 pt-8 border-t border-slate-600/50">
          <h3 className="text-sm font-medium text-slate-400 mb-3">灵感来源 / 特别鸣谢</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            节奏之舞受《冰与火之舞》(A Dance of Fire and Ice, 7th Beat Games) 启发；
            I Wanna 受《I Wanna Be The Guy》(Kayin) 等虐心平台游戏启发。本平台小游戏均为独立实现，与上述作品无隶属关系。
          </p>
        </section>
      </main>
    </div>
  )
}
