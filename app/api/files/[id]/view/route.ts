import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'edge'

// 记录文件浏览量
export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const resolvedParams = await context.params
    const fileId = resolvedParams.id

    const supabaseAdmin = await getSupabaseAdmin()

    // 检查文件是否存在
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('id, download_count')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      // 文件不存在也不报错，静默处理
      return NextResponse.json({
        success: true,
        message: '文件不存在，跳过浏览量更新'
      })
    }

    // 更新浏览量（download_count 字段）
    const currentCount = file.download_count ?? 0
    const newCount = currentCount + 1

    // 尝试更新 download_count 字段
    const { error: updateError } = await supabaseAdmin
      .from('files')
      .update({ download_count: newCount })
      .eq('id', fileId)

    // 如果更新失败（可能字段不存在），不报错，静默处理
    if (updateError) {
      console.warn('更新浏览量失败（可能字段不存在）:', updateError)
    }

    return NextResponse.json({
      success: true,
      data: {
        download_count: newCount
      },
      message: '浏览量已更新'
    })

  } catch (error: any) {
    console.error('记录浏览量错误:', error)
    // 即使出错也返回成功，不影响用户体验
    return NextResponse.json({
      success: true,
      message: '浏览量更新失败，但不影响使用'
    })
  }
}

