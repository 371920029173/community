'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000 // 2分钟
const TICK_MS = 30 * 1000 // 每30秒累计一次

export default function StayTracking() {
  const { user } = useAuth()
  const lastTick = useRef(0)
  const accumulated = useRef(0)

  useEffect(() => {
    if (!user?.id) return

    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      const delta = Math.floor((now - lastTick.current) / 1000)
      lastTick.current = now
      if (delta > 0 && delta < 3600) accumulated.current += delta
    }

    lastTick.current = Date.now()
    const tickInterval = setInterval(tick, TICK_MS)

    const heartbeat = async () => {
      if (accumulated.current <= 0) return
      const sec = accumulated.current
      accumulated.current = 0
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        await fetch('/api/user/daily-rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ staySeconds: sec })
        })
      } catch (_) {}
    }

    const hbInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)

    return () => {
      clearInterval(tickInterval)
      clearInterval(hbInterval)
    }
  }, [user?.id])

  return null
}
