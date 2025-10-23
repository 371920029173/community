import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 通过服务端（service role）读取当前用户资料，避免前端触发 RLS
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    console.log('=== /api/profile/me 开始 ===')
    console.log('用户ID:', userId)
    console.log('supabaseAdmin 状态:', supabaseAdmin ? '已初始化' : '未初始化')

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('查询结果:', { data, error })

    if (error) {
      console.error('数据库查询错误:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    console.log('查询成功，用户:', data?.username)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 异常:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    // 检查 supabaseAdmin 是否可用
    if (!supabaseAdmin) {
      console.error('supabaseAdmin 未初始化')
      return NextResponse.json({ success: false, error: '数据库连接失败' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('查询用户资料失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('获取用户资料异常:', error)
    return NextResponse.json({ success: false, error: error.message || '获取资料失败' }, { status: 500 })
  }
}






