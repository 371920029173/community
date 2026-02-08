'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import { checkDungeonGoal } from '@/lib/gameGoals'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const TILE = 24
const COLS = 25
const ROWS = 17
const W = COLS * TILE
const H = ROWS * TILE

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

type Cell = 0 | 1 | 2 // 0=wall, 1=floor, 2=door

function generateDungeon(seed: number): Cell[][] {
  const grid: Cell[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(1))
  for (let y = 0; y < ROWS; y++) {
    grid[y][0] = 0
    grid[y][COLS - 1] = 0
  }
  for (let x = 0; x < COLS; x++) {
    grid[0][x] = 0
    grid[ROWS - 1][x] = 0
  }
  const roomCount = 4 + Math.floor(seededRandom(seed) * 4)
  const rooms: { x: number; y: number; w: number; h: number }[] = []
  for (let i = 0; i < roomCount; i++) {
    const w = 4 + Math.floor(seededRandom(seed + i * 7) * 4)
    const h = 3 + Math.floor(seededRandom(seed + i * 11) * 3)
    const x = 1 + Math.floor(seededRandom(seed + i * 13) * (COLS - w - 2))
    const y = 1 + Math.floor(seededRandom(seed + i * 17) * (ROWS - h - 2))
    rooms.push({ x, y, w, h })
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        grid[y + dy][x + dx] = 1
      }
    }
  }
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i]
    const b = rooms[i + 1]
    const ax = a.x + Math.floor(a.w / 2)
    const ay = a.y + Math.floor(a.h / 2)
    const bx = b.x + Math.floor(b.w / 2)
    const by = b.y + Math.floor(b.h / 2)
    let x = ax, y = ay
    while (x !== bx || y !== by) {
      if (grid[y][x] === 0) grid[y][x] = 1
      if (x < bx) x++
      else if (x > bx) x--
      else if (y < by) y++
      else if (y > by) y--
    }
  }
  const exitRoom = rooms[rooms.length - 1]
  const ex = exitRoom.x + Math.floor(exitRoom.w / 2)
  const ey = exitRoom.y + Math.floor(exitRoom.h / 2)
  grid[ey][ex] = 2
  return grid
}

export default function DungeonPage() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead' | 'win'>('idle')
  const [depth, setDepth] = useState(1)
  const [starting, setStarting] = useState(false)
  const rewardedRef = useRef(false)
  const gameRef = useRef<{
    seed: number
    grid: Cell[][]
    px: number
    py: number
    enemies: { x: number; y: number; hp: number }[]
    exit: { x: number; y: number }
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
      const grid = generateDungeon(seed)
      let px = 1, py = 1
      while (grid[py][px] !== 1) {
        px = 1 + Math.floor(Math.random() * 5)
        py = 1 + Math.floor(Math.random() * 5)
      }
      const enemies: { x: number; y: number; hp: number }[] = []
      let ex = 0, ey = 0
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (grid[y][x] === 2) { ex = x; ey = y }
          if (grid[y][x] === 1 && Math.hypot(x - px, y - py) > 5 && seededRandom(seed + x + y * COLS) < 0.08) {
            enemies.push({ x, y, hp: 2 })
          }
        }
      }
      gameRef.current = { seed, grid, px, py, enemies, exit: { x: ex, y: ey } }
      setDepth(1)
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
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
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

    let lastMove = 0
    const moveInterval = 80

    const loop = () => {
      const now = Date.now()
      if (now - lastMove > moveInterval) {
        lastMove = now
        const k = keysRef.current
        let dx = 0, dy = 0
        if (k['arrowleft'] || k['a']) dx = -1
        if (k['arrowright'] || k['d']) dx = 1
        if (k['arrowup'] || k['w']) dy = -1
        if (k['arrowdown'] || k['s']) dy = 1
        if (dx !== 0 || dy !== 0) {
          const nx = g.px + dx
          const ny = g.py + dy
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
            const enemy = g.enemies.find((e) => e.x === nx && e.y === ny)
            if (enemy) {
              enemy.hp--
              if (enemy.hp <= 0) g.enemies = g.enemies.filter((e) => e !== enemy)
            } else {
              const cell = g.grid[ny][nx]
              if (cell === 1 || cell === 2) {
                g.px = nx
                g.py = ny
                if (cell === 2) {
                  const newDepth = depth + 1
                  if (!rewardedRef.current && checkDungeonGoal(newDepth)) {
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
                  const newSeed = g.seed + depth * 999
                  const grid = generateDungeon(newSeed)
                  g.grid = grid
                  g.px = 1
                  g.py = 1
                  g.enemies = []
                  let ex = 0, ey = 0
                  for (let y = 0; y < ROWS; y++) {
                    for (let x = 0; x < COLS; x++) {
                      if (grid[y][x] === 2) { ex = x; ey = y }
                      if (grid[y][x] === 1 && seededRandom(newSeed + x + y * COLS) < 0.06 + depth * 0.02) {
                        g.enemies.push({ x, y, hp: 1 + Math.floor(depth / 3) })
                      }
                    }
                  }
                  g.exit = { x: ex, y: ey }
                  setDepth(newDepth)
                }
              }
            }
          }
        }
      }

      g.enemies.forEach((e) => {
        if (Math.abs(e.x - g.px) <= 1 && Math.abs(e.y - g.py) <= 1) {
          const dx = g.px - e.x
          const dy = g.py - e.y
          if (dx !== 0 || dy !== 0) {
            const nx = e.x + Math.sign(dx)
            const ny = e.y + Math.sign(dy)
            if (g.grid[ny]?.[nx] === 1 || g.grid[ny]?.[nx] === 2) {
              const block = g.enemies.some((o) => o.x === nx && o.y === ny) || (nx === g.px && ny === g.py)
              if (!block) {
                e.x = nx
                e.y = ny
                if (e.x === g.px && e.y === g.py) setGameState('dead')
              }
            }
          }
        }
      })

      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W)
      bg.addColorStop(0, '#1e1b4b')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cell = g.grid[y][x]
          const bx = x * TILE
          const by = y * TILE
          if (cell === 0) {
            const wg = ctx.createLinearGradient(bx, by, bx + TILE, by + TILE)
            wg.addColorStop(0, '#334155')
            wg.addColorStop(1, '#1e293b')
            ctx.fillStyle = wg
            ctx.fillRect(bx, by, TILE, TILE)
          } else if (cell === 1) {
            const fg = ctx.createLinearGradient(bx, by, bx + TILE, by + TILE)
            fg.addColorStop(0, '#475569')
            fg.addColorStop(1, '#334155')
            ctx.fillStyle = fg
            ctx.fillRect(bx, by, TILE, TILE)
          } else if (cell === 2) {
            const eg = ctx.createRadialGradient(bx + TILE/2, by + TILE/2, 0, bx + TILE/2, by + TILE/2, TILE)
            eg.addColorStop(0, '#4ade80')
            eg.addColorStop(0.5, '#22c55e')
            eg.addColorStop(1, '#15803d')
            ctx.fillStyle = eg
            ctx.fillRect(bx, by, TILE, TILE)
          }
        }
      }
      const pg = ctx.createRadialGradient(
        g.px * TILE + TILE/2, g.py * TILE + TILE/2, 0,
        g.px * TILE + TILE/2, g.py * TILE + TILE/2, TILE
      )
      pg.addColorStop(0, '#60a5fa')
      pg.addColorStop(0.7, '#3b82f6')
      pg.addColorStop(1, '#1d4ed8')
      ctx.fillStyle = pg
      ctx.fillRect(g.px * TILE + 2, g.py * TILE + 2, TILE - 4, TILE - 4)
      ctx.fillStyle = '#ef4444'
      g.enemies.forEach((e) => {
        ctx.fillRect(e.x * TILE + 4, e.y * TILE + 4, TILE - 8, TILE - 8)
      })
      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      ctx.fillText(`层数: ${depth}`, 10, 20)

      if (gameState === 'playing') requestAnimationFrame(loop)
    }

    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [gameState, depth])

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/games" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> 返回游戏中心
        </Link>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">地牢探险</h1>
          {gameState === 'idle' && (
            <button onClick={startGame} disabled={starting || !user} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-lg">
              {!user ? '请先登录' : starting ? '启动中…' : '开始游戏 (消耗 1 铒币)'}
            </button>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          WASD/方向键移动，碰到敌人会攻击（需撞两次击杀）。抵达绿色出口进入下一层。被敌人碰到即死。
        </p>
        <p className="text-amber-400/90 text-sm mb-2">
          达成目标返还 2 铒币：到达层数 2 / 3 / 5 / 7 / 10
        </p>
        <div className="relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 inline-block">
          <canvas ref={canvasRef} width={W} height={H} className="block" />
          {(gameState === 'dead' || gameState === 'win') && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <p className="text-2xl font-bold text-red-400 mb-2">{gameState === 'dead' ? '游戏结束' : '通关!'}</p>
              <p className="text-white mb-4">到达层数: {depth}</p>
              <button onClick={startGame} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg">
                再来一局
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
