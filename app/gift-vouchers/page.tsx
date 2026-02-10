'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'
import { Gift, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const COST_SAND = 50
const COST_GAME = 40

export default function GiftVouchersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [vouchers, setVouchers] = useState(0)
  const [sandCoins, setSandCoins] = useState(0)
  const [gameCoins, setGameCoins] = useState(0)
  const [exchanging, setExchanging] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/gift-vouchers')
      return
    }
    fetchData()
  }, [user, router])

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?redirect=/gift-vouchers')
        return
      }
      const res = await fetch('/api/gift-vouchers', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || '获取失败')
        return
      }
      setEnabled(json.enabled)
      setVouchers(json.vouchers ?? 0)
      setSandCoins(json.sandCoins ?? 0)
      setGameCoins(json.gameCoins ?? 0)
      if (!json.enabled) {
        toast.error('礼品卷功能暂未开放')
      }
    } catch (e) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const exchange = async (type: 'sand' | 'game') => {
    if (exchanging || !enabled) return
    const cost = type === 'sand' ? COST_SAND : COST_GAME
    const name = type === 'sand' ? '沙币' : '铒币'
    if (type === 'sand' && sandCoins < cost) {
      toast.error(`沙币不足，需要 ${cost} 沙币`)
      return
    }
    if (type === 'game' && gameCoins < cost) {
      toast.error(`铒币不足，需要 ${cost} 铒币`)
      return
    }
    setExchanging(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/gift-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type, amount: 1 })
      })
      const json = await res.json()
      if (json.success) {
        setVouchers(json.vouchers)
        setSandCoins(json.sandCoins)
        setGameCoins(json.gameCoins)
        toast.success('兑换成功！获得 1 礼品卷')
      } else {
        toast.error(json.error || '兑换失败')
      }
    } catch (e) {
      toast.error('兑换失败')
    } finally {
      setExchanging(false)
    }
  }

  const nextReset = () => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return next.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        </main>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <Gift className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">礼品卷功能暂未开放</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-amber-400 hover:text-amber-300">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回首页
        </Link>
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-900/30 to-slate-800 p-6">
          <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2 mb-4">
            <Gift className="w-8 h-8" />
            礼品卷
          </h1>
          <p className="text-amber-200/80 text-sm mb-6">
            礼品卷每月 1 号清零，请及时使用。
          </p>
          <p className="text-slate-400 text-sm mb-6">
            下次清零时间：{nextReset()}
          </p>
          <div className="text-center py-6 mb-6 rounded-lg bg-slate-800/60 border border-slate-600">
            <p className="text-slate-400 text-sm mb-2">当前礼品卷</p>
            <p className="text-4xl font-bold text-amber-400">{vouchers}</p>
            <p className="text-slate-500 text-xs mt-2">
              沙币：{sandCoins} · 铒币：{gameCoins}
            </p>
          </div>
          <p className="text-slate-400 text-sm mb-4">兑换比例：50 沙币 = 1 礼品卷，或 40 铒币 = 1 礼品卷</p>
          <div className="flex gap-4">
            <button
              onClick={() => exchange('sand')}
              disabled={exchanging || sandCoins < COST_SAND}
              className="flex-1 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {exchanging ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              50 沙币 → 1 礼品卷
            </button>
            <button
              onClick={() => exchange('game')}
              disabled={exchanging || gameCoins < COST_GAME}
              className="flex-1 px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {exchanging ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              40 铒币 → 1 礼品卷
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
