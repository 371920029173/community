'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Target } from 'lucide-react'
import toast from 'react-hot-toast'

const BULLET_MULTIPLIERS: Record<number, number> = { 1: 1, 2: 1.05, 3: 1.2, 4: 1.6, 5: 3 }
const STAKE = 5

const HIDDEN_ACHIEVEMENTS = new Set(['away_from_gambling', 'unlucky', 'strong_luck'])

function playAchievementSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(523, ctx.currentTime)
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (_) {}
}

function getStatsKey(uid: string) {
  return `roulette_stats_${uid}`
}

type RouletteStats = {
  consecutive_round1_cashout: number
  consecutive_death_low: number
  consecutive_survive_5: number
  total_cashouts: number
}

const defaultStats: RouletteStats = {
  consecutive_round1_cashout: 0,
  consecutive_death_low: 0,
  consecutive_survive_5: 0,
  total_cashouts: 0,
}

function loadStats(uid: string): RouletteStats {
  if (typeof window === 'undefined') return defaultStats
  try {
    const s = localStorage.getItem(getStatsKey(uid))
    if (s) return { ...defaultStats, ...JSON.parse(s) }
  } catch (_) {}
  return defaultStats
}

function saveStats(uid: string, stats: RouletteStats) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStatsKey(uid), JSON.stringify(stats))
  } catch (_) {}
}

const ACHIEVEMENT_NAMES: Record<string, string> = {
  first_cashout: '首次收手',
  first_death: '首次中弹',
  survive_3_rounds: '存活3轮',
  high_roller: '单局10铒币+',
  cautious: '累计收手5次',
}

async function claimAchievement(session: { access_token: string }, id: string, withSound: boolean) {
  const res = await fetch('/api/games/currency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ action: 'achievement_claim', achievementId: id })
  })
  const json = await res.json()
  if (json.success) {
    if (withSound) playAchievementSound()
    else if (json.amount > 0 && ACHIEVEMENT_NAMES[id]) {
      toast.success(`成就：${ACHIEVEMENT_NAMES[id]} +${json.amount} 铒币`)
    }
  }
  return json
}

export default function RoulettePage() {
  const { user } = useAuth()
  const [gameState, setGameState] = useState<'idle' | 'select' | 'playing' | 'choose' | 'dead' | 'win'>('idle')
  const [round, setRound] = useState(0)
  const [bullets, setBullets] = useState(1)
  const [multiplier, setMultiplier] = useState(1)
  const [starting, setStarting] = useState(false)
  const [firing, setFiring] = useState(false)
  const statsRef = useRef<RouletteStats>(defaultStats)

  useEffect(() => {
    if (user?.id) statsRef.current = loadStats(user.id)
  }, [user?.id])

  const startGame = useCallback(async () => {
    if (!user) {
      toast.error('请先登录')
      return
    }
    setStarting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('请先登录')
        return
      }
      const res = await fetch('/api/games/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'roulette_play' })
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || '铒币不足')
        return
      }
      setRound(1)
      setMultiplier(1)
      setGameState('select')
    } catch (e) {
      toast.error('启动失败')
    } finally {
      setStarting(false)
    }
  }, [user])

  const confirmBullets = useCallback((n: number) => {
    setBullets(n)
    setGameState('playing')
  }, [])

  const fire = useCallback(() => {
    if (gameState !== 'playing' || firing) return
    setFiring(true)
    const chamber = Math.floor(Math.random() * 6)
    const isDead = chamber < bullets
    setTimeout(async () => {
      const uid = user?.id
      if (isDead) {
        const s = statsRef.current
        if (bullets <= 3) {
          s.consecutive_death_low++
          s.consecutive_round1_cashout = 0
          s.consecutive_survive_5 = 0
        } else {
          s.consecutive_death_low = 0
        }
        if (uid) saveStats(uid, s)
        setGameState('dead')
        toast.error('砰！人财两空')
        if (uid) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            if (s.consecutive_death_low >= 5) {
              const j = await claimAchievement(session, 'unlucky', true)
              if (j.success) toast.success('隐藏成就：资深倒霉蛋！+10 铒币')
            }
            await claimAchievement(session, 'first_death', false)
          }
        }
      } else {
        const newMult = multiplier * BULLET_MULTIPLIERS[bullets]
        setMultiplier(newMult)
        if (round >= 5) {
          const s = statsRef.current
          s.consecutive_survive_5++
          s.consecutive_round1_cashout = 0
          s.consecutive_death_low = 0
          if (uid) saveStats(uid, s)
          setGameState('win')
          const reward = Math.floor(STAKE * newMult)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const winRes = await fetch('/api/games/currency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ action: 'roulette_win', amount: reward })
            })
            const winJson = await winRes.json()
            if (winJson.success) toast.success(`活过 5 轮！获得 ${reward} 铒币`)
            if (s.consecutive_survive_5 >= 5) {
              const j = await claimAchievement(session, 'strong_luck', true)
              if (j.success) toast.success('隐藏成就：强运！+20 铒币')
            }
            await claimAchievement(session, 'survive_3_rounds', false)
          }
        } else {
          const s = statsRef.current
          s.consecutive_death_low = 0
          if (uid) saveStats(uid, s)
          setGameState('choose')
        }
      }
      setFiring(false)
    }, 800)
  }, [gameState, round, bullets, multiplier, firing, user?.id])

  const cashOut = useCallback(async () => {
    const reward = Math.floor(STAKE * multiplier)
    const uid = user?.id
    const s = statsRef.current
    if (round === 1) {
      s.consecutive_round1_cashout++
      s.consecutive_death_low = 0
      s.consecutive_survive_5 = 0
    } else {
      s.consecutive_round1_cashout = 0
    }
    s.total_cashouts++
    if (uid) saveStats(uid, s)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/games/currency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'roulette_win', amount: reward })
    })
    const j = await res.json()
    if (j.success) {
      toast.success(`收手获得 ${reward} 铒币`)
      setGameState('idle')
      if (s.consecutive_round1_cashout >= 10) {
        const ach = await claimAchievement(session, 'away_from_gambling', true)
        if (ach.success) toast.success('隐藏成就：远离赌博！+10 铒币')
      }
      await claimAchievement(session, 'first_cashout', false)
      if (reward >= 10) await claimAchievement(session, 'high_roller', false)
      if (s.total_cashouts >= 5) await claimAchievement(session, 'cautious', false)
      if (round >= 3) await claimAchievement(session, 'survive_3_rounds', false)
    }
  }, [multiplier, round, user?.id])

  const continueGame = useCallback(() => {
    setRound((r) => r + 1)
    setGameState('select')
  }, [])

  const reward = Math.floor(STAKE * multiplier)

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-red-500/20 border border-red-500/40">
              <Target className="w-6 h-6 text-red-400" />
            </span>
            俄罗斯轮盘
          </h1>
          {gameState === 'idle' && (
            <button
              onClick={startGame}
              disabled={starting || !user}
              className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-lg"
            >
              {!user ? '请先登录' : starting ? '启动中…' : `开始游戏 (${STAKE} 铒币)`}
            </button>
          )}
        </div>

        <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-600 mb-6 text-sm text-slate-300">
          <p className="font-medium text-white mb-2">规则</p>
          <ul className="list-disc list-inside space-y-1">
            <li>每局消耗 {STAKE} 铒币，6 发弹巢</li>
            <li>每轮选择装弹数 1～5，死亡则人财两空</li>
            <li>倍率：1弹+0%、2弹+5%、3弹+20%、4弹+60%、5弹+200%</li>
            <li>存活后可继续或收手，活过 5 轮自动结算，奖励向下取整</li>
          </ul>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-600 bg-slate-800 min-h-[320px] flex flex-col items-center justify-center p-8">
          {firing && (
            <div className="absolute inset-0 bg-red-500/20 animate-pulse z-10 pointer-events-none" />
          )}
          {gameState === 'idle' && (
            <p className="text-slate-400 animate-fade-in">点击上方按钮开始</p>
          )}

          {gameState === 'select' && (
            <div className="text-center animate-fade-in">
              <p className="text-slate-400 text-sm mb-4">第 {round} 轮 · 选择装弹数</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n, i) => (
                  <button
                    key={n}
                    onClick={() => confirmBullets(n)}
                    className="w-14 h-14 rounded-xl bg-slate-700 hover:bg-red-600 hover:scale-110 border border-slate-500 hover:border-red-500 text-white font-bold transition-all duration-200"
                  >
                    {n}弹
                  </button>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-2">1弹+0% 2弹+5% 3弹+20% 4弹+60% 5弹+200%</p>
            </div>
          )}

          {(gameState === 'playing' || gameState === 'choose') && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <p className="text-slate-400 text-sm">第 {round} 轮 · {bullets} 弹 · 倍率 {multiplier.toFixed(2)}x</p>
                <p className="text-2xl font-bold text-amber-400 mt-2 animate-pulse">若收手可得 {reward} 铒币</p>
              </div>
              <div className={`w-32 h-32 rounded-full bg-slate-700 border-4 flex items-center justify-center mb-6 mx-auto transition-all duration-300 ${firing ? 'border-red-500 scale-110' : 'border-slate-500'}`}>
                <span className="text-4xl">{bullets}/6</span>
              </div>
              {gameState === 'playing' && (
                <button
                  onClick={fire}
                  disabled={firing}
                  className={`px-8 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-all duration-200 ${firing ? 'scale-95' : 'hover:scale-105'}`}
                >
                  {firing ? '...' : '开枪'}
                </button>
              )}
              {gameState === 'choose' && (
                <div className="flex gap-4 animate-fade-in">
                  <button
                    onClick={cashOut}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-500 hover:scale-105 text-slate-900 font-semibold rounded-xl transition-all duration-200"
                  >
                    收手 ({reward} 铒币)
                  </button>
                  <button
                    onClick={continueGame}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 hover:scale-105 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    继续
                  </button>
                </div>
              )}
            </div>
          )}

          {gameState === 'dead' && (
            <div className="text-center animate-fade-in">
              <p className="text-2xl font-bold text-red-400 mb-2 animate-bounce">游戏结束</p>
              <p className="text-slate-400 mb-4">第 {round} 轮中弹，人财两空</p>
              <button onClick={startGame} className="px-6 py-2 bg-red-600 hover:bg-red-500 hover:scale-105 text-white font-semibold rounded-lg transition-all duration-200">
                再来一局
              </button>
            </div>
          )}

          {gameState === 'win' && (
            <div className="text-center animate-fade-in">
              <p className="text-2xl font-bold text-green-400 mb-2 animate-bounce">恭喜通关！</p>
              <p className="text-amber-400 text-xl mb-4 animate-pulse">获得 {reward} 铒币</p>
              <button onClick={startGame} className="px-6 py-2 bg-red-600 hover:bg-red-500 hover:scale-105 text-white font-semibold rounded-lg transition-all duration-200">
                再来一局
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
