import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { tryGrantInviteReward } from '@/lib/inviteReward'

export const runtime = 'edge'

function getFileTypeByName(name: string): string {
  const lower = name.toLowerCase()
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp)$/.test(lower)) return 'image'
  if (/(\.mp4|\.webm|\.mov|\.mkv)$/.test(lower)) return 'video'
  if (/(\.mp3|\.wav|\.ogg|\.flac)$/.test(lower)) return 'audio'
  if (/(\.zip|\.rar|\.7z)$/.test(lower)) return 'archive'
  if (/(\.js|\.ts|\.py|\.java|\.c|\.cpp|\.cs|\.go)$/.test(lower)) return 'code'
  return 'document'
}

function generateFilePath(originalName: string, userId: string) {
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : ''
  const safe = originalName.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const ts = Date.now()
  return `${userId}/${ts}_${safe}${ext}`
}

// 使用 Web Crypto API 替代 Node.js crypto
async function createHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }
    const token = auth.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const userId = (formData.get('userId') as string) || ''

    if (!file || !userId) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 })
    }

    // 用户存在校验（可选，防止脏数据）
    const { data: userProfile, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, username, storage_used, storage_limit')
      .eq('id', userId)
      .single()

    if (userErr || !userProfile) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 400 })
    }

    // 存储配额校验
    if (typeof userProfile.storage_limit === 'number' && typeof userProfile.storage_used === 'number') {
      if (userProfile.storage_used + file.size > userProfile.storage_limit) {
        return NextResponse.json({ success: false, error: '存储空间不足' }, { status: 413 })
      }
    }

    const bucket = 'drive' // 独立云盘bucket
    const filePath = generateFilePath(file.name, userId)

    // 优化：并行执行上传和哈希计算（对于大文件）
    let upErr = null as any
    let hash = ''
    
    // 对于大文件，并行计算哈希和上传
    if (file.size > 1024 * 1024) {
      const [uploadResult, hashResult] = await Promise.allSettled([
        supabaseAdmin.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type }),
        file.arrayBuffer().then(buffer => createHash(buffer))
      ])
      
      if (uploadResult.status === 'rejected' || uploadResult.value.error) {
        upErr = uploadResult.status === 'rejected' ? uploadResult.reason : uploadResult.value.error
      }
      if (hashResult.status === 'fulfilled') {
        hash = hashResult.value
      }
    } else {
      // 小文件直接上传，不计算哈希
      try {
        const { error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type })
        upErr = error
      } catch (e: any) {
        upErr = e
      }
    }

    if (upErr) {
      const msg = (upErr as any)?.message?.toLowerCase?.() || ''
      if (msg.includes('not found') || msg.includes('bucket') || msg.includes('does not exist')) {
        // 尝试自动创建bucket
        try {
          // @ts-ignore createBucket 存在于 storage-js
          await (supabaseAdmin as any).storage.createBucket(bucket, { public: false })
          const retry = await supabaseAdmin.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false })
          if (retry.error) {
            return NextResponse.json({ success: false, error: `创建bucket后上传失败: ${retry.error.message}` }, { status: 500 })
          }
        } catch (ce: any) {
          return NextResponse.json({ success: false, error: '存储桶 drive 不存在且自动创建失败，请在Supabase中创建私有bucket: drive' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ success: false, error: `上传失败: ${upErr.message}` }, { status: 500 })
      }
    }

    // 生成受限访问的签名URL用于客户端预览（短期）
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60) // 1小时

    if (signErr) {
      return NextResponse.json({ success: false, error: `生成访问链接失败: ${signErr.message}` }, { status: 500 })
    }

    // 哈希已在上面并行计算（大文件）或跳过（小文件）

    // 保存到独立表 drive_files（需要预先存在该表）
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('drive_files')
      .insert({
        original_name: file.name,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        file_type: getFileTypeByName(file.name),
        file_hash: hash || '', // 小文件可能没有哈希
        // 存储私密文件建议不公开URL，这里保存签名URL供短期预览
        signed_url: signed.signedUrl,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insErr) {
      // 回滚存储
      await supabaseAdmin.storage.from(bucket).remove([filePath])
      const hint = insErr.message?.includes('relation') ? '数据库表 drive_files 不存在，请创建后重试' : insErr.message
      return NextResponse.json({ success: false, error: `保存文件记录失败: ${hint}` }, { status: 500 })
    }

    // 更新配额
    if (typeof userProfile.storage_used === 'number') {
      await supabaseAdmin.from('users').update({ storage_used: userProfile.storage_used + file.size }).eq('id', userId)
    }

    try {
      const sb = await getSupabaseAdmin()
      await tryGrantInviteReward(sb, userId)
    } catch (_) {}

    return NextResponse.json({ success: true, data: { file: inserted } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || '上传失败' }, { status: 500 })
  }
}