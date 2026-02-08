'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { checkSurvivalGoal } from '@/lib/gameGoals'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const W = 800
const H = 500
const PLAYER_R = 12
const ENEMY_R = 10
const BULLET_R = 4
const BULLET_SPD = 8

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export default function SurvivalPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [wave, setWave] = useState(0)
  const [score, setScore] = useState(0)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    seed: number
    px: number
    py: number
    enemies: { x: number; y: number; vx: number; vy: number }[]
    bullets: { x: number; y: number; vx: number; vy: number }[]
    lastShot: number
    waveStart: number
  } | null>(null)
  const frameRef = useRef<number>()

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
      gameRef.current = {
        seed,
        px: W / 2,
        py: H / 2,
        enemies: [],
        bullets: [],
        lastShot: 0,
        waveStart: Date.now(),
      }
      setWave(1)
      setScore(0)
      setGameState('playing')
    } catch (e) {
      toast.error('启动失败')
    } finally {
      setStarting(false)
    }
  }, [user])

  useEffect(() => {
    if (gameState !== 'playing' || !gameRef.current) return

    const g = gameRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let mouseX = W / 2
    let mouseY = H / 2

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      mouseX = (e.clientX - rect.left) * scaleX
      mouseY = (e.clientY - rect.top) * scaleY
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    const spawnEnemies = () => {
      const baseCount = 3 + wave * 2
      const count = Math.min(baseCount + Math.floor(seededRandom(g.seed + wave * 100) * 4), 20)
      for (let i = 0; i < count; i++) {
        const side = Math.floor(seededRandom(g.seed + wave * 200 + i) * 4)
        let x: number, y: number
        if (side === 0) x = 0
        else if (side === 1) x = W
        else x = seededRandom(g.seed + i) * W
        if (side === 2) y = 0
        else if (side === 3) y = H
        else y = seededRandom(g.seed + i + 100) * H
        const dx = g.px - x
        const dy = g.py - y
        const len = Math.hypot(dx, dy) || 1
        const spd = 0.8 + wave * 0.15 + seededRandom(g.seed + i * 7) * 0.5
        g.enemies.push({
          x, y,
          vx: (dx / len) * spd,
          vy: (dy / len) * spd,
        })
      }
    }

    const loop = () => {
      const now = Date.now()
      const dt = 16

      if (g.enemies.length === 0 && now - g.waveStart > 1500) {
        g.waveStart = now
        g.seed += 777
        const nextWave = wave + 1
        setWave(nextWave)
        if (!rewardedRef.current && checkSurvivalGoal(nextWave)) {
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
        spawnEnemies()
      }

      g.px += (mouseX - g.px) * 0.15
      g.py += (mouseY - g.py) * 0.15
      g.px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, g.px))
      g.py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, g.py))

      if (now - g.lastShot > 120) {
        g.lastShot = now
        const dx = mouseX - g.px
        const dy = mouseY - g.py
        const len = Math.hypot(dx, dy) || 1
        g.bullets.push({
          x: g.px, y: g.py,
          vx: (dx / len) * BULLET_SPD,
          vy: (dy / len) * BULLET_SPD,
        })
      }

      g.bullets = g.bullets.filter((b) => {
        b.x += b.vx
        b.y += b.vy
        if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) return false
        for (let i = g.enemies.length - 1; i >= 0; i--) {
          const e = g.enemies[i]
          if (Math.hypot(b.x - e.x, b.y - e.y) < ENEMY_R + BULLET_R) {
            g.enemies.splice(i, 1)
            setScore((s) => s + 10)
            return false
          }
        }
        return true
      })

      let dead = false
      g.enemies.forEach((e) => {
        e.x += e.vx
        e.y += e.vy
        if (Math.hypot(e.x - g.px, e.y - g.py) < PLAYER_R + ENEMY_R) dead = true
      })
      if (dead) {
        setGameState('dead')
        return
      }
      g.enemies = g.enemies.filter((e) => e.x > -30 && e.x < W + 30 && e.y > -30 && e.y < H + 30)

      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(0.5, '#1e1b4b')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, W - 2, H - 2)

      const pg = ctx.createRadialGradient(g.px, g.py, 0, g.px, g.py, PLAYER_R * 2)
      pg.addColorStop(0, '#4ade80')
      pg.addColorStop(0.6, '#22c55e')
      pg.addColorStop(1, '#15803d')
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.arc(g.px, g.py, PLAYER_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#ef4444'
      g.enemies.forEach((e) => {
        ctx.beginPath()
        ctx.arc(e.x, e.y, ENEMY_R, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = '#eab308'
      g.bullets.forEach((b) => {
        ctx.beginPath()
        ctx.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = '#fff'
      ctx.font = '16px sans-serif'
      ctx.fillText(`波次: ${wave}  得分: ${score}`, 10, 25)

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [gameState, wave, score])

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">生存模式</h1>
          {gameState === 'idle' && (
            <button
              onClick={startGame}
              disabled={starting || !user}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold rounded-lg"
            >
              {!user ? '请先登录' : starting ? '启动中…' : '开始游戏 (消耗 1 铒币)'}
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          移动鼠标控制角色，自动射击。消灭敌人进入下一波。一碰即死。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：波次 3 / 5 / 8 / 12 / 18
        </p>
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full max-w-full block cursor-crosshair"
            style={{ aspectRatio: `${W}/${H}` }}
          />
          {gameState === 'dead' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400 mb-2">游戏结束</p>
              <p className="text-white mb-4">波次: {wave} · 得分: {score}</p>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg"
              >
                再来一局
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
