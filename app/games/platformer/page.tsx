'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { checkPlatformerGoal } from '@/lib/gameGoals'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const W = 700
const H = 400
const GRAV = 0.5
const JUMP = -11
const MOVE = 5
const PL_W = 20
const PL_H = 28

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

type Platform = { x: number; y: number; w: number; h: number }

function generateChunks(seed: number, count: number): Platform[] {
  const platforms: Platform[] = []
  let lastX = 0
  let lastY = H - 60
  for (let i = 0; i < count; i++) {
    const gap = 40 + seededRandom(seed + i * 3) * 80
    const rise = (seededRandom(seed + i * 5) - 0.4) * 120
    const platW = 35 + seededRandom(seed + i * 7) * 45
    const platH = 10
    lastX += gap
    lastY = Math.max(40, Math.min(H - 40, lastY + rise))
    platforms.push({ x: lastX, y: lastY, w: platW, h: platH })
  }
  return platforms
}

export default function PlatformerPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [score, setScore] = useState(0)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    seed: number
    platforms: Platform[]
    px: number
    py: number
    vx: number
    vy: number
    camX: number
  } | null>(null)
  const keysRef = useRef<Record<string, boolean>>({})

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
        body: JSON.stringify({ action: 'play' })
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || '铒币不足')
        return
      }
      rewardedRef.current = false
      const seed = Date.now()
      const platforms = generateChunks(seed, 200)
      platforms.unshift({ x: 0, y: H - 50, w: 80, h: 12 })
      gameRef.current = {
        seed,
        platforms,
        px: 30,
        py: H - 50 - PL_H - 2,
        vx: 0,
        vy: 0,
        camX: 0,
      }
      setScore(0)
      setGameState('playing')
    } catch (e) {
      toast.error('启动失败')
    } finally {
      setStarting(false)
    }
  }, [user])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true
      e.preventDefault()
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return

    const g = gameRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const loop = () => {
      const k = keysRef.current
      g.vx = 0
      if (k['arrowleft'] || k['a']) g.vx = -MOVE
      if (k['arrowright'] || k['d']) g.vx = MOVE
      if ((k['arrowup'] || k['w'] || k[' ']) && g.vy >= 0) {
        const onGround = g.platforms.some(
          (p) =>
            g.py + PL_H >= p.y - 2 &&
            g.py + PL_H <= p.y + p.h + 2 &&
            g.px + PL_W > p.x &&
            g.px < p.x + p.w
        )
        if (onGround) g.vy = JUMP
      }

      g.vx *= 0.9
      g.vy += GRAV
      g.px += g.vx
      g.py += g.vy

      if (g.py > H + 50) {
        setGameState('dead')
        return
      }

      g.platforms.forEach((p) => {
        if (g.vy > 0 && g.py + PL_H >= p.y && g.py + PL_H <= p.y + p.h + 8 && g.px + PL_W > p.x && g.px < p.x + p.w) {
          g.py = p.y - PL_H
          g.vy = 0
          const newRight = p.x + p.w
          const newScore = Math.floor(newRight / 10)
          if (newScore > score) {
            setScore(newScore)
            if (!rewardedRef.current && checkPlatformerGoal(newScore)) {
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
          }
        }
      })

      g.camX = Math.max(0, g.px - W / 3)

      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0c4a6e')
      bg.addColorStop(0.4, '#0f172a')
      bg.addColorStop(1, '#134e4a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.translate(-g.camX, 0)

      g.platforms.forEach((p) => {
        if (p.x + p.w > g.camX - 50 && p.x < g.camX + W + 50) {
          const pg = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h)
          pg.addColorStop(0, '#64748b')
          pg.addColorStop(0.5, '#475569')
          pg.addColorStop(1, '#334155')
          ctx.fillStyle = pg
          ctx.fillRect(p.x, p.y, p.w, p.h)
          ctx.strokeStyle = '#475569'
          ctx.lineWidth = 1
          ctx.strokeRect(p.x, p.y, p.w, p.h)
        }
      })

      const playerG = ctx.createLinearGradient(g.px, g.py, g.px + PL_W, g.py + PL_H)
      playerG.addColorStop(0, '#4ade80')
      playerG.addColorStop(0.5, '#22c55e')
      playerG.addColorStop(1, '#16a34a')
      ctx.fillStyle = playerG
      ctx.fillRect(g.px, g.py, PL_W, PL_H)
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)'
      ctx.strokeRect(g.px, g.py, PL_W, PL_H)

      ctx.restore()
      ctx.fillStyle = '#fff'
      ctx.font = '16px sans-serif'
      ctx.fillText(`距离: ${score}`, 10, 25)

      if (gameState === 'playing') requestAnimationFrame(loop)
    }

    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [gameState, score])

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">精确平台</h1>
          {gameState === 'idle' && (
            <button onClick={startGame} disabled={starting || !user} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-lg">
              {!user ? '请先登录' : starting ? '启动中…' : '开始游戏 (消耗 1 铒币)'}
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          A/D 或左右键移动，W/上/空格跳跃。掉落即死。跑得越远得分越高。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：距离 80 / 200 / 400 / 800 / 1500
        </p>
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ aspectRatio: `${W}/${H}` }} />
          {gameState === 'dead' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400 mb-2">游戏结束</p>
              <p className="text-white mb-4">距离: {score}</p>
              <button onClick={startGame} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg">
                再来一局
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
