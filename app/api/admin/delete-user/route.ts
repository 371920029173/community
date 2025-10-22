import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 仅限服务端调用：删除冲突用户（同时删 Auth 与 users 表）
export async function POST(request: NextRequest) {
  try {
    const { username, userId } = await request.json()
    if (!username && !userId) {
      return NextResponse.json({ success: false, error: '需要 username 或 userId' }, { status: 400 })
    }

    let targetId = userId as string | undefined

    // 如果只给了 username，先查 users 表拿 id；查不到再去 auth 用户元数据里找
    if (!targetId && username) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username)
        .single()
      if (userRow?.id) targetId = userRow.id
    }

    // 删除 users 表记录（即使不存在也忽略）
    if (username) {
      await supabaseAdmin.from('users').delete().eq('username', username)
    }
    if (targetId) {
      await supabaseAdmin.from('users').delete().eq('id', targetId)
    }

    // 删除 Auth 用户（如果拿到 id）
    if (targetId) {
      await supabaseAdmin.auth.admin.deleteUser(targetId)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || '删除失败' }, { status: 500 })
  }
}



