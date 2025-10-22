import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID（实际应用中应该从JWT token获取�?    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访�? },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 验证token并获取用户信�?    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '无效的认证令�? },
        { status: 401 }
      )
    }

    // 获取用户的文�?    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      files: files || []
    })

  } catch (error: any) {
    console.error('获取用户文件失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    )
  }
} 
