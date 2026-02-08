'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { useTheme } from '@/components/providers/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { checkIwannaGoal } from '@/lib/gameGoals'
import { ArrowLeft, Skull } from 'lucide-react'
import toast from 'react-hot-toast'

const TILE = 24
const W = 600
const H = 360
const GRAV = 0.6
const JUMP = -10
const MOVE = 2.5
const PL_W = 18
const PL_H = 24

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

type Cell = 0 | 1 | 2 | 3 // 0=air, 1=block, 2=spike, 3=goal

function generateLevel(seed: number): Cell[][] {
  const cols = Math.floor(W / TILE)
  const rows = Math.floor(H / TILE)
  const grid: Cell[][] = Array(rows).fill(null).map(() => Array(cols).fill(0))
  for (let y = 0; y < rows; y++) {
    grid[y][0] = 1
    grid[y][cols - 1] = 1
  }
  for (let x = 0; x < cols; x++) {
    grid[0][x] = 1
    grid[rows - 1][x] = 1
  }
  const platforms: { x: number; y: number; w: number }[] = []
  let x = 2
  let lastY = rows - 3
  for (let i = 0; i < 35; i++) {
    const w = 2 + Math.floor(seededRandom(seed + i * 11) * 3)
    const gap = 1 + Math.floor(seededRandom(seed + i * 13) * 2)
    const rise = Math.floor((seededRandom(seed + i * 17) - 0.4) * 2)
    lastY = Math.max(2, Math.min(rows - 3, lastY + rise))
    platforms.push({ x, y: lastY, w })
    for (let dx = 0; dx < w; dx++) {
      if (grid[lastY][x + dx] === 0) grid[lastY][x + dx] = 1
    }
    if (i > 2 && i % 4 === 0 && seededRandom(seed + i * 19) < 0.5) {
      const sx = x + Math.floor(w / 2)
      if (grid[lastY + 1]?.[sx] === 0) grid[lastY + 1][sx] = 2
    }
    x += w + gap
    if (x >= cols - 5) break
  }
  const last = platforms[platforms.length - 1]
  const gx = last ? Math.min(last.x + last.w + 2, cols - 4) : cols - 4
  const gy = last?.y ?? rows - 3
  if (grid[gy][gx] === 0) grid[gy][gx] = 3
  else grid[rows - 3][cols - 4] = 3
  return grid
}

export default function IwannaPage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead' | 'win'>('idle')
  const [deaths, setDeaths] = useState(0)
  const [progress, setProgress] = useState(0)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    grid: Cell[][]
    px: number
    py: number
    vx: number
    vy: number
    maxX: number
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
      const grid = generateLevel(seed)
      const cols = Math.floor(W / TILE)
      const rows = Math.floor(H / TILE)
      let px = 2 * TILE + 4
      let py = (rows - 3) * TILE - PL_H - 2
      gameRef.current = {
        grid,
        px,
        py,
        vx: 0,
        vy: 0,
        maxX: px,
      }
      setDeaths(0)
      setProgress(0)
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
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
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
    const cols = Math.floor(W / TILE)
    const rows = Math.floor(H / TILE)

    const loop = () => {
      const k = keysRef.current
      g.vx = 0
      if (k['arrowleft'] || k['a']) g.vx = -MOVE
      if (k['arrowright'] || k['d']) g.vx = MOVE
      if ((k['arrowup'] || k['w'] || k[' ']) && g.vy >= 0) {
        const footY = g.py + PL_H
        const onGround = footY >= (rows - 2) * TILE - 2 ||
          g.grid.some((row, yy) => {
            for (let xx = 0; xx < cols; xx++) {
              if (row[xx] === 1 || row[xx] === 3) {
                const bx = xx * TILE
                const by = yy * TILE
                if (footY >= by - 2 && footY <= by + TILE + 2 &&
                  g.px + PL_W > bx && g.px < bx + TILE) return true
              }
            }
            return false
          })
        if (onGround) g.vy = JUMP
      }

      g.vy += GRAV
      g.px += g.vx
      g.py += g.vy

      const cx = Math.floor(g.px / TILE)
      const cy = Math.floor(g.py / TILE)
      const cx2 = Math.floor((g.px + PL_W) / TILE)
      const cy2 = Math.floor((g.py + PL_H) / TILE)
      for (let yy = cy; yy <= cy2; yy++) {
        for (let xx = Math.max(0, cx - 1); xx <= Math.min(cols - 1, cx2 + 1); xx++) {
          const cell = g.grid[yy]?.[xx]
          if (cell === 2) {
            const sx = xx * TILE
            const sy = yy * TILE
            if (g.px + PL_W > sx && g.px < sx + TILE &&
              g.py + PL_H > sy && g.py + PL_H < sy + TILE + 4) {
              setDeaths((d) => d + 1)
              setGameState('dead')
              return
            }
          }
          if (cell === 3) {
            const gx = xx * TILE
            const gy = yy * TILE
            if (g.px + PL_W > gx && g.px < gx + TILE &&
              g.py + PL_H > gy && g.py < gy + TILE) {
              setGameState('win')
              if (!rewardedRef.current) {
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
              return
            }
          }
        }
      }

      for (let yy = cy; yy <= cy2; yy++) {
        for (let xx = cx; xx <= cx2; xx++) {
          const cell = g.grid[yy]?.[xx]
          if (cell === 1 || cell === 3) {
            const bx = xx * TILE
            const by = yy * TILE
            if (g.vy > 0 && g.py + PL_H >= by - 1 && g.py + PL_H <= by + TILE + 6 &&
              g.px + PL_W > bx + 2 && g.px < bx + TILE - 2) {
              g.py = by - PL_H
              g.vy = 0
            } else if (g.vy < 0 && g.py <= by + TILE + 2 && g.py + PL_H > by - 2 &&
              g.px + PL_W > bx + 2 && g.px < bx + TILE - 2) {
              g.py = by + TILE
              g.vy = 0
            }
            if (g.vx > 0 && g.px + PL_W >= bx - 1 && g.px + PL_W <= bx + 8 &&
              g.py + PL_H > by + 4 && g.py < by + TILE - 4) {
              g.px = bx - PL_W
              g.vx = 0
            } else if (g.vx < 0 && g.px <= bx + TILE + 2 && g.px >= bx + TILE - 8 &&
              g.py + PL_H > by + 4 && g.py < by + TILE - 4) {
              g.px = bx + TILE
              g.vx = 0
            }
          }
        }
      }

      g.maxX = Math.max(g.maxX, g.px)
      const prog = Math.floor(g.maxX / 20)
      setProgress(prog)
      if (!rewardedRef.current && checkIwannaGoal(prog)) {
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

      ctx.fillStyle = isDark ? '#1a1a2e' : '#f8fafc'
      ctx.fillRect(0, 0, W, H)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = g.grid[y][x]
          const bx = x * TILE
          const by = y * TILE
          if (cell === 1) {
            ctx.fillStyle = isDark ? '#4a5568' : '#94a3b8'
            ctx.fillRect(bx, by, TILE, TILE)
            ctx.strokeStyle = isDark ? '#2d3748' : '#64748b'
            ctx.strokeRect(bx, by, TILE, TILE)
          } else if (cell === 2) {
            ctx.fillStyle = '#dc2626'
            ctx.beginPath()
            ctx.moveTo(bx + TILE / 2, by + TILE)
            ctx.lineTo(bx, by)
            ctx.lineTo(bx + TILE, by)
            ctx.closePath()
            ctx.fill()
            ctx.strokeStyle = isDark ? '#991b1b' : '#b91c1c'
            ctx.stroke()
          } else if (cell === 3) {
            ctx.fillStyle = '#22c55e'
            ctx.fillRect(bx, by, TILE, TILE)
            ctx.fillStyle = '#166534'
            ctx.font = 'bold 14px sans-serif'
            ctx.fillText('★', bx + 6, by + 18)
          }
        }
      }
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(g.px, g.py, PL_W, PL_H)
      ctx.strokeStyle = '#d97706'
      ctx.strokeRect(g.px, g.py, PL_W, PL_H)

      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b'
      ctx.font = '14px sans-serif'
      ctx.fillText(`进度: ${progress} | 死亡: ${deaths}`, 8, 20)

      if (gameState === 'playing') requestAnimationFrame(loop)
    }
    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [gameState, deaths, progress, isDark])

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className={`inline-flex items-center gap-2 mb-6 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Skull className="w-6 h-6 text-amber-500" /> I Wanna
          </h1>
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
        <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          WASD/方向键移动，触刺即死。到达绿色星星过关。I Wanna 风格高难度平台。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：进度 30 / 60 / 120 / 200 / 300 或过关
        </p>
        <div className={`relative rounded-xl overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full"
            style={{ aspectRatio: `${W}/${H}` }}
          />
          {(gameState === 'dead' || gameState === 'win') && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold mb-2">
                {gameState === 'win' ? '过关！' : '游戏结束'}
              </p>
              <p className="text-white mb-4">
                {gameState === 'win' ? '恭喜通关！' : `死亡 ${deaths} 次 | 进度 ${progress}`}
              </p>
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
