import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 生成设备指纹（简化版，基于多个浏览器特征）
function generateDeviceFingerprint(userAgent: string, acceptLanguage: string, timezone: string): string {
  // 组合多个特征生成指纹
  const features = [
    userAgent,
    acceptLanguage,
    timezone,
    // 可以添加更多特征，如屏幕分辨率、字体等（需要客户端提供）
  ].join('|')
  
  // 简单的哈希函数（实际应该使用更安全的哈希）
  let hash = 0
  for (let i = 0; i < features.length; i++) {
    const char = features.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36)
}

// 检查设备指纹注册限制（1天内最多5个账号）
async function checkDeviceFingerprintLimit(fingerprint: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin()
    
    // 查询过去24小时内该设备指纹注册的账号数
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, created_at')
      .eq('device_fingerprint', fingerprint)
      .gte('created_at', oneDayAgo)
    
    if (error) {
      console.error('查询设备指纹失败:', error)
      // 如果查询失败，为了安全起见，拒绝注册
      return { allowed: false, error: '验证失败，请稍后重试' }
    }
    
    const count = data?.length || 0
    if (count >= 5) {
      return { 
        allowed: false, 
        error: '该设备在24小时内已注册5个账号，请明天再试' 
      }
    }
    
    return { allowed: true }
  } catch (error: any) {
    console.error('设备指纹检查失败:', error)
    return { allowed: false, error: '验证失败，请稍后重试' }
  }
}

// 简单的人机验证（基于时间戳和简单挑战）
function verifyHuman(challenge: string, response: string, timestamp: number): boolean {
  // 检查时间戳是否在合理范围内（5分钟内）
  const now = Date.now()
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return false
  }
  
  // 简单的验证：检查响应是否正确
  // 这里使用简单的数学运算作为挑战
  try {
    const parts = challenge.split('+')
    if (parts.length !== 2) return false
    const a = parseInt(parts[0].trim())
    const b = parseInt(parts[1].trim())
    if (isNaN(a) || isNaN(b)) return false
    const expected = a + b
    return parseInt(response.trim()) === expected
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      challenge, 
      response, 
      timestamp,
      userAgent,
      acceptLanguage,
      timezone
    } = await request.json()
    
    // 1. 人机验证
    if (!challenge || !response || !timestamp) {
      return NextResponse.json(
        { success: false, error: '缺少验证参数' },
        { status: 400 }
      )
    }
    
    if (!verifyHuman(challenge, response, timestamp)) {
      return NextResponse.json(
        { success: false, error: '人机验证失败，请重试' },
        { status: 403 }
      )
    }
    
    // 2. 设备指纹检测
    if (!userAgent || !acceptLanguage || !timezone) {
      return NextResponse.json(
        { success: false, error: '缺少设备信息' },
        { status: 400 }
      )
    }
    
    const fingerprint = generateDeviceFingerprint(userAgent, acceptLanguage, timezone)
    const limitCheck = await checkDeviceFingerprintLimit(fingerprint)
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: limitCheck.error },
        { status: 429 }
      )
    }
    
    // 验证通过，返回设备指纹供后续使用
    return NextResponse.json({
      success: true,
      fingerprint
    })
    
  } catch (error: any) {
    console.error('验证失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '验证失败' },
      { status: 500 }
    )
  }
}

