import { SupabaseClient } from '@supabase/supabase-js'

const INVITE_COINS = 20
const MIN_ACCOUNT_AGE_HOURS = 24

/** 检查并发放邀请奖励（防刷：需满足激活条件 + 注册满24小时） */
export async function tryGrantInviteReward(
  supabase: SupabaseClient,
  inviteeId: string
): Promise<{ granted: boolean; inviterId?: string }> {
  const { data: invitee, error: uErr } = await supabase
    .from('users')
    .select('id, invited_by, created_at')
    .eq('id', inviteeId)
    .single()

  if (uErr || !invitee || !invitee.invited_by) {
    return { granted: false }
  }

  const inviterId = invitee.invited_by as string

  // 已发放过
  const { data: existing } = await supabase
    .from('invite_rewards')
    .select('id')
    .eq('invitee_id', inviteeId)
    .maybeSingle()

  if (existing) return { granted: false }

  // 注册满24小时
  const createdAt = invitee.created_at ? new Date(invitee.created_at) : new Date()
  const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
  if (hoursSince < MIN_ACCOUNT_AGE_HOURS) return { granted: false }

  // 激活条件：上传过文件 或 发过私信 或 创建过论坛
  const [filesRes, messagesRes, forumsRes] = await Promise.all([
    supabase.from('drive_files').select('id').eq('user_id', inviteeId).limit(1),
    supabase.from('messages').select('id').eq('sender_id', inviteeId).limit(1),
    supabase.from('forums').select('id').eq('owner_id', inviteeId).limit(1)
  ])

  const hasFile = (filesRes.data?.length ?? 0) > 0
  const hasMessage = (messagesRes.data?.length ?? 0) > 0
  const hasForum = (forumsRes.data?.length ?? 0) > 0
  if (!hasFile && !hasMessage && !hasForum) return { granted: false }

  // 获取双方当前沙币
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, sand_coins')
    .in('id', [inviteeId, inviterId])

  if (usersErr || !users?.length) return { granted: false }

  const inviteeUser = users.find((u) => u.id === inviteeId)
  const inviterUser = users.find((u) => u.id === inviterId)
  if (!inviteeUser || !inviterUser) return { granted: false }

  // 插入奖励记录（防并发重复发放）
  const { error: insErr } = await supabase.from('invite_rewards').insert({
    inviter_id: inviterId,
    invitee_id: inviteeId
  })

  if (insErr) {
    if (insErr.code === '23505') return { granted: false } // 唯一约束，已发过
    console.error('邀请奖励记录失败:', insErr)
    return { granted: false }
  }

  // 双方各加20沙币
  const inviterNew = (inviterUser.sand_coins || 0) + INVITE_COINS
  const inviteeNew = (inviteeUser.sand_coins || 0) + INVITE_COINS

  await Promise.all([
    supabase.from('users').update({ sand_coins: inviterNew }).eq('id', inviterId),
    supabase.from('users').update({ sand_coins: inviteeNew }).eq('id', inviteeId)
  ])

  return { granted: true, inviterId }
}
