'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { checkBulletHellGoal } from '@/lib/gameGoals'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const W = 640
const H = 480
const PLAYER_R = 8
const BULLET_R = 4

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

type Bullet = { x: number; y: number; vx: number; vy: number }

const BOSS_PATTERNS = [
  { bullets: 8, spread: Math.PI * 2, speed: 2.5 },
  { bullets: 12, spread: Math.PI, speed: 2 },
  { bullets: 16, spread: Math.PI * 1.5, speed: 2.2 },
  { bullets: 6, spread: Math.PI / 3, speed: 3 },
  { bullets: 20, spread: Math.PI * 2, speed: 1.8 },
]

export default function BulletHellPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [bossHp, setBossHp] = useState(100)
  const [bossMaxHp, setBossMaxHp] = useState(100)
  const [wave, setWave] = useState(1)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    seed: number
    px: number
    py: number
    bossX: number
    bossY: number
    bossHp: number
    bossMaxHp: number
    bullets: Bullet[]
    lastShot: number
    patternIndex: number
  } | null>(null)
  const mouseRef = useRef({ x: W / 2, y: H / 2 })

  const initGame = useCallback(() => {
    const seed = Date.now()
    gameRef.current = {
      seed,
      px: W / 2,
      py: H - 80,
      bossX: W / 2,
      bossY: 60,
      bossHp: 100,
      bossMaxHp: 100,
      bullets: [],
      lastShot: 0,
      patternIndex: 0,
    }
    setBossHp(100)
    setBossMaxHp(100)
    setWave(1)
    setGameState('playing')
  }, [])

  const startGame = useCallback(async (isRetry = false) => {
    if (!user) {
      toast.error('请先登录')
      return
    }
    if (isRetry) {
      rewardedRef.current = false
      initGame()
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
        body: JSON.stringify({ action: 'play' })
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || '铒币不足')
        return
      }
      rewardedRef.current = false
      initGame()
    } catch (e) {
      toast.error('启动失败')
    } finally {
      setStarting(false)
    }
  }, [user, initGame])

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return

    const g = gameRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      mouseRef.current.x = (e.clientX - rect.left) * scaleX
      mouseRef.current.y = (e.clientY - rect.top) * scaleY
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const spawnBullets = () => {
      const idx = Math.floor(seededRandom(g.seed + g.patternIndex * 10) * BOSS_PATTERNS.length)
      const pat = BOSS_PATTERNS[idx]
      const baseAngle = seededRandom(g.seed + g.patternIndex * 7) * Math.PI * 2
      for (let i = 0; i < pat.bullets; i++) {
        const angle = baseAngle + (i / pat.bullets) * pat.spread
        g.bullets.push({
          x: g.bossX,
          y: g.bossY,
          vx: Math.cos(angle) * pat.speed,
          vy: Math.sin(angle) * pat.speed,
        })
      }
      g.patternIndex++
    }

    const loop = () => {
      const now = Date.now()
      g.px += (mouseRef.current.x - g.px) * 0.2
      g.py += (mouseRef.current.y - g.py) * 0.2
      g.px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, g.px))
      g.py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, g.py))

      if (now - g.lastShot > 400 - wave * 20) {
        g.lastShot = now
        spawnBullets()
      }

      g.bullets.forEach((b) => {
        b.x += b.vx
        b.y += b.vy
        if (Math.hypot(b.x - g.px, b.y - g.py) < PLAYER_R + BULLET_R) {
          setGameState('dead')
        }
      })
      g.bullets = g.bullets.filter((b) => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20)

      if (g.bossHp <= 0) {
        const nextWave = wave + 1
        if (!rewardedRef.current && checkBulletHellGoal(nextWave)) {
          rewardedRef.current = true
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              fetch('/api/games/currency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ action: 'reward' })
              }).then((r) => r.json()).then((j) => {
                if (j.success) toast.success('达成目标！返还 2 铒币')
              })
            }
          })
        }
        const newHp = 100 + wave * 30
        g.bossHp = newHp
        g.bossMaxHp = newHp
        g.bullets = []
        setBossHp(newHp)
        setBossMaxHp(newHp)
        setWave(nextWave)
      }

      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W)
      bg.addColorStop(0, '#1e1b4b')
      bg.addColorStop(0.6, '#0f172a')
      bg.addColorStop(1, '#0c0a14')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      const bossG = ctx.createRadialGradient(g.bossX, g.bossY, 0, g.bossX, g.bossY, 35)
      bossG.addColorStop(0, '#a78bfa')
      bossG.addColorStop(0.4, '#7c3aed')
      bossG.addColorStop(1, '#5b21b6')
      ctx.fillStyle = bossG
      ctx.beginPath()
      ctx.arc(g.bossX, g.bossY, 25, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#333'
      ctx.fillRect(g.bossX - 30, g.bossY - 40, 60, 6)
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(g.bossX - 30, g.bossY - 40, 60 * (g.bossHp / g.bossMaxHp), 6)

      ctx.fillStyle = '#ef4444'
      g.bullets.forEach((b) => {
        ctx.beginPath()
        ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2)
        ctx.fill()
      })

      const playerG = ctx.createRadialGradient(g.px, g.py, 0, g.px, g.py, PLAYER_R * 2)
      playerG.addColorStop(0, '#4ade80')
      playerG.addColorStop(0.6, '#22c55e')
      playerG.addColorStop(1, '#15803d')
      ctx.fillStyle = playerG
      ctx.beginPath()
      ctx.arc(g.px, g.py, PLAYER_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      ctx.fillText(`波次: ${wave}`, 10, 25)

      if (gameState === 'playing') requestAnimationFrame(loop)
    }

    const id = requestAnimationFrame(loop)
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(id)
    }
  }, [gameState, wave, bossHp, bossMaxHp])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || !gameRef.current) return
    const g = gameRef.current
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const cx = (e.clientX - rect.left) * scaleX
    const cy = (e.clientY - rect.top) * scaleY
    if (Math.hypot(cx - g.bossX, cy - g.bossY) < 30) {
      g.bossHp -= 5
      setBossHp(g.bossHp)
    }
  }, [gameState])

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">弹幕 Boss</h1>
          {gameState === 'idle' && (
            <button onClick={() => startGame(false)} disabled={starting || !user} className="px-6 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold rounded-lg">
              {!user ? '请先登录' : starting ? '启动中…' : '开始游戏 (消耗 1 铒币)'}
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          鼠标移动躲避弹幕，点击 Boss 造成伤害。消灭 Boss 进入下一波，弹幕会越来越密。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：波次 2 / 3 / 5 / 7 / 10
        </p>
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full cursor-crosshair"
            style={{ aspectRatio: `${W}/${H}` }}
            onClick={handleClick}
          />
          {gameState === 'dead' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400 mb-2">游戏结束</p>
              <p className="text-white mb-4">波次: {wave}</p>
              <button onClick={() => startGame(true)} className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg">
                再来一局
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
