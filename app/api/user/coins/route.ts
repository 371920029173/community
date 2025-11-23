import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 })
    }

    const supabaseAdmin = await getSupabaseAdmin()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('sand_coins')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('获取沙币失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      coins: user?.sand_coins || 0 
    })
  } catch (error: any) {
    console.error('获取沙币API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

