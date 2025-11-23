import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 获取记事本
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 获取或创建记事本
    let { data: note, error: noteError } = await supabaseAdmin
      .from('user_notes')
      .select('content')
      .eq('user_id', authUser.id)
      .single()

    if (noteError && noteError.code === 'PGRST116') {
      // 记事本不存在，创建一个
      const { data: newNote, error: createError } = await supabaseAdmin
        .from('user_notes')
        .insert({
          user_id: authUser.id,
          content: ''
        })
        .select('content')
        .single()

      if (createError) {
        console.error('创建记事本失败:', createError)
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { content: newNote?.content || '' }
      })
    }

    if (noteError) {
      console.error('获取记事本失败:', noteError)
      return NextResponse.json({ success: false, error: noteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { content: note?.content || '' }
    })
  } catch (error: any) {
    console.error('获取记事本API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '获取失败' }, { status: 500 })
  }
}

// 保存记事本
export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    const supabaseAdmin = await getSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: '身份验证失败' }, { status: 401 })
    }

    // 更新或创建记事本
    const { error: upsertError } = await supabaseAdmin
      .from('user_notes')
      .upsert({
        user_id: authUser.id,
        content: content || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('保存记事本失败:', upsertError)
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('保存记事本API错误:', error)
    return NextResponse.json({ success: false, error: error.message || '保存失败' }, { status: 500 })
  }
}

