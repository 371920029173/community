'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { checkRhythmGoal } from '@/lib/gameGoals'
import { ArrowLeft, Music } from 'lucide-react'
import toast from 'react-hot-toast'

const W = 720
const H = 480
const BALL_R = 10
const GATE_R = 14
const BPM = 120
const BEAT_MS = 60000 / BPM
const PATH_SPEED = 0.0002 // t per ms

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

type Point = { x: number; y: number }

function generatePath(seed: number): { path: Point[]; gateIndices: number[] } {
  const path: Point[] = []
  const gateIndices: number[] = []
  const segments = 80
  let x = W / 2
  let y = H / 2
  let angle = 0
  const segLen = 35
  for (let i = 0; i <= segments; i++) {
    path.push({ x, y })
    if (i > 0 && i % 4 === 0) gateIndices.push(i)
    angle += (seededRandom(seed + i * 7) - 0.5) * 0.6
    x += Math.cos(angle) * segLen
    y += Math.sin(angle) * segLen
    x = Math.max(80, Math.min(W - 80, x))
    y = Math.max(80, Math.min(H - 80, y))
  }
  return { path, gateIndices }
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export default function RhythmPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [nodes, setNodes] = useState(0)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    path: Point[]
    gateIndices: number[]
    t: number
    nextGateIdx: number
    startTime: number
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
      const { path, gateIndices } = generatePath(seed)
      gameRef.current = {
        path,
        gateIndices,
        t: 0,
        nextGateIdx: 0,
        startTime: Date.now(),
      }
      setNodes(0)
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

    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      e.preventDefault()
      if (!g || g.nextGateIdx >= g.gateIndices.length) return
      const gi = g.gateIndices[g.nextGateIdx]
      const segLen = 1 / (g.path.length - 1)
      const gateT = gi * segLen
      const dist = Math.abs(g.t - gateT)
      if (dist < 0.04) {
        g.nextGateIdx++
        setNodes((n) => n + 1)
        if (!rewardedRef.current && checkRhythmGoal(g.nextGateIdx)) {
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
      } else if (dist < 0.08) {
        g.nextGateIdx++
        setNodes((n) => n + 1)
      }
    }
    window.addEventListener('keydown', handleKey)

    const loop = () => {
      const now = Date.now()
      g.t += PATH_SPEED * 16
      if (g.t >= 1) {
        setGameState('dead')
        return
      }
      if (g.nextGateIdx < g.gateIndices.length) {
        const gi = g.gateIndices[g.nextGateIdx]
        const segLen = 1 / (g.path.length - 1)
        const gateT = gi * segLen
        if (g.t > gateT + 0.03) {
          setGameState('dead')
          return
        }
      }

      const idx = g.t * (g.path.length - 1)
      const i0 = Math.floor(idx)
      const i1 = Math.min(i0 + 1, g.path.length - 1)
      const t = idx - i0
      const pos = lerpPoint(g.path[i0], g.path[i1], t)

      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(g.path[0].x, g.path[0].y)
      for (let i = 1; i < g.path.length; i++) {
        ctx.lineTo(g.path[i].x, g.path[i].y)
      }
      ctx.stroke()
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      g.gateIndices.forEach((gi, ii) => {
        if (gi < g.path.length) {
          const p = g.path[gi]
          const isNext = ii === g.nextGateIdx
          ctx.fillStyle = isNext ? '#f59e0b' : '#475569'
          ctx.strokeStyle = isNext ? '#fbbf24' : '#64748b'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(p.x, p.y, GATE_R, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      })

      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0, pos.x, pos.y, BALL_R * 2
      )
      gradient.addColorStop(0, '#22d3ee')
      gradient.addColorStop(0.5, '#06b6d4')
      gradient.addColorStop(1, '#0891b2')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText(`节拍: ${nodes}`, 12, 28)

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [gameState, nodes])

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music className="w-6 h-6 text-cyan-400" /> 节奏之舞
          </h1>
          {gameState === 'idle' && (
            <button
              onClick={startGame}
              disabled={starting || !user}
              className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-900 font-semibold rounded-lg"
            >
              {!user ? '请先登录' : starting ? '启动中…' : '开始游戏 (消耗 1 铒币)'}
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          球沿路径自动前进，到达金黄色圈时按空格键击中节拍。错过即死。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：击中 3 / 5 / 10 / 15 / 20 个节拍
        </p>
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full"
            style={{ aspectRatio: `${W}/${H}` }}
          />
          {gameState === 'dead' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400 mb-2">游戏结束</p>
              <p className="text-white mb-4">击中节拍: {nodes}</p>
              <button
                onClick={startGame}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg"
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
