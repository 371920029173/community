import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

/**
 * 清理幽灵账号：删除在 Supabase Auth 中不存在但 public.users 中仍有记录的用户
 * 
 * 使用方式：
 * 1. 手动调用：GET /api/admin/cleanup-ghost-accounts?secret=<SECRET_KEY>
 * 2. 定时任务：配置外部 cron 服务（如 cron-job.org）每小时调用此端点
 * 
 * 安全验证：
 * - 通过查询参数 secret 验证（建议使用环境变量 ADMIN_CLEANUP_SECRET）
 * - 默认值：'cleanup_ghost_accounts_2024'（可在环境变量中覆盖）
 */
export async function GET(request: NextRequest) {
  try {
    // 安全验证：检查 secret
    const { searchParams } = new URL(request.url)
    const providedSecret = searchParams.get('secret')
    const expectedSecret = process.env.ADMIN_CLEANUP_SECRET || 'cleanup_ghost_accounts_2024'
    
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未授权：需要有效的 secret 参数',
          hint: '请在请求中添加 ?secret=<YOUR_SECRET>'
        },
        { status: 401 }
      )
    }

    const supabase = await getSupabaseAdmin()
    
    // 1. 获取 public.users 表中的所有用户 ID
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      return NextResponse.json(
        { success: false, error: `查询用户列表失败: ${usersError.message}` },
        { status: 500 }
      )
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有用户需要检查',
        stats: {
          totalUsers: 0,
          ghostAccounts: 0,
          deletedUsers: []
        }
      })
    }

    // 2. 检查每个用户是否在 Supabase Auth 中存在
    const ghostAccounts: Array<{
      id: string
      username: string
      email: string | null
      reason: string
    }> = []
    
    const validUsers: string[] = []

    for (const user of allUsers) {
      try {
        // 使用 Supabase Admin API 检查用户是否在 auth.users 中存在
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id)
        
        if (authError || !authUser?.user) {
          // 用户不在 auth.users 中，标记为幽灵账号
          ghostAccounts.push({
            id: user.id,
            username: user.username || 'unknown',
            email: user.email || null,
            reason: authError?.message || '用户不存在于 Supabase Auth'
          })
        } else {
          // 用户存在，记录为有效用户
          validUsers.push(user.id)
        }
      } catch (checkError: any) {
        // 检查过程出错，保守处理：不删除
        console.error(`检查用户 ${user.id} 时出错:`, checkError)
        // 不标记为幽灵账号，保留记录
      }
    }

    // 3. 删除幽灵账号（如果存在）
    const deletedUsers: Array<{
      id: string
      username: string
      email: string | null
    }> = []

    if (ghostAccounts.length > 0) {
      for (const ghost of ghostAccounts) {
        try {
          // 删除 public.users 表中的记录
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', ghost.id)

          if (deleteError) {
            console.error(`删除幽灵账号 ${ghost.id} 失败:`, deleteError)
          } else {
            deletedUsers.push({
              id: ghost.id,
              username: ghost.username,
              email: ghost.email
            })
          }
        } catch (deleteError: any) {
          console.error(`删除幽灵账号 ${ghost.id} 时出错:`, deleteError)
        }
      }
    }

    // 4. 返回统计信息
    return NextResponse.json({
      success: true,
      message: `清理完成：发现 ${ghostAccounts.length} 个幽灵账号，已删除 ${deletedUsers.length} 个`,
      stats: {
        totalUsers: allUsers.length,
        validUsers: validUsers.length,
        ghostAccountsFound: ghostAccounts.length,
        deletedAccounts: deletedUsers.length,
        failedDeletions: ghostAccounts.length - deletedUsers.length,
        deletedUsers: deletedUsers,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('清理幽灵账号时出错:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '清理过程出错',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * POST 方法：手动触发清理（带请求体验证）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const providedSecret = body.secret || request.headers.get('x-cleanup-secret')
    const expectedSecret = process.env.ADMIN_CLEANUP_SECRET || 'cleanup_ghost_accounts_2024'
    
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未授权：需要有效的 secret',
          hint: '请在请求体或 header 中提供 secret'
        },
        { status: 401 }
      )
    }

    // 调用 GET 方法的逻辑
    const getUrl = new URL(request.url)
    getUrl.searchParams.set('secret', providedSecret)
    return GET(new NextRequest(getUrl.toString(), { method: 'GET' }))
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: '请求处理失败',
        details: error.message || String(error)
      },
      { status: 500 }
    )
  }
}

