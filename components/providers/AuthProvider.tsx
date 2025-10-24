'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
// 注意：不要在客户端引入 supabaseAdmin，避免暴露 service role key
import { User } from '@/lib/supabase'

// 硬编码的初始管理员用户名，无法被其他管理员修改
const INITIAL_ADMIN_USERNAME = '371920029173'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // 简化的登录函数
  const signIn = async (username: string, password: string) => {
    try {
      setLoading(true)
      console.log('开始登录流程,用户名:', username)
      
      // 检查Supabase连接
      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Supabase未配置')
      }

      // 使用固定邮箱进行登录
      const email = `${username}@fileshare.local`
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: password
      })

      if (authError) {
        console.error('登录失败:', authError)
        throw new Error(`登录失败: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('登录后未返回用户数据')
      }

      console.log('登录成功,用户ID:', authData.user.id)
      const meRes = await fetch('/api/profile/me', { headers: { 'x-user-id': authData.user.id } })
      
      if (!meRes.ok) {
        console.error('获取用户资料失败，状态:', meRes.status)
        throw new Error(`获取用户资料失败: HTTP ${meRes.status}`)
      }
      
      const meJson = await meRes.json()
      if (!meJson.success) {
        throw new Error(meJson.error || '无法获取用户资料')
      }
      setUser(meJson.data)
      setLoading(false)

    } catch (error: any) {
      console.error('登录过程中的完整错误:', error)
      setLoading(false)
      throw error
    }
  }

  // 简化的注册函数
  const signUp = async (username: string, password: string) => {
    try {
      setLoading(true)
      console.log('开始注册流程,用户名:', username)

      if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Supabase未配置')
      }

      // 使用固定的邮箱格式，确保一致性
      const email = `${username}@fileshare.local`
      console.log('使用固定邮箱:', email)

      // 先注册认证账户
      let { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username,
          }
        }
      })

      // 如果用户已存在，则尝试直接登录
      if (authError && authError.message?.toLowerCase().includes('already')) {
        console.warn('用户已存在，尝试直接登录')
        const signInRes = await supabase.auth.signInWithPassword({ email, password })
        if (signInRes.error) {
          console.error('登录失败:', signInRes.error)
          throw new Error(`认证账户创建失败: ${authError.message}`)
        }
        authData = signInRes.data
        authError = null as any
      } else if (authError) {
        console.error('认证账户创建失败:', authError)
        throw new Error(`认证账户创建失败: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('注册后未返回用户数据')
      }

      // 检查是否已有资料（服务端查询）
      let finalProfile: any = null
      {
        const meRes = await fetch('/api/profile/me', { headers: { 'x-user-id': authData.user.id } })
        const meJson = await meRes.json()
        if (meJson.success) finalProfile = meJson.data
      }

      if (!finalProfile) {
        // 然后在服务端创建用户资料
        const res = await fetch('/api/profile/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            username,
            email,
            isInitialAdmin: username === INITIAL_ADMIN_USERNAME
          })
        })

        const result = await res.json()
        if (!result.success) {
          console.error('用户资料创建失败:', result.error)
          throw new Error(`用户资料创建失败: ${result.error}`)
        }
        finalProfile = result.data
      }

      console.log('注册完全成功,用户ID:', finalProfile.id)

      setUser(finalProfile)
      setLoading(false)

    } catch (error: any) {
      console.error('注册过程中的完整错误:', error)
      setLoading(false)
      throw error
    }
  }

  // 简化的登出函数
  const signOut = async () => {
    try {
      setLoading(true)
      
      if (supabase) {
        await supabase.auth.signOut()
      }
      
      setUser(null)
      setLoading(false)
      console.log('登出成功')
      
    } catch (error) {
      console.error('登出失败:', error)
      setLoading(false)
      // 即使登出失败，也清除本地状态
      setUser(null)
    }
  }

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      if (!user?.id) return
      
      const meRes = await fetch('/api/profile/me', { headers: { 'x-user-id': user.id } })
      const meJson = await meRes.json()
      if (meJson.success) {
        setUser(meJson.data)
        console.log('用户信息已刷新')
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    }
  }

  // 简化的会话检查
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        
        if (!supabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
          console.log('Supabase未配置，跳过会话检查')
          setLoading(false)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          console.log('找到现有会话，用户ID:', session.user.id)
          
          // 尝试获取用户资料
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError || !userProfile) {
            console.log('无法获取用户资料，尝试通过API获取')
            // 尝试通过API获取用户资料
            try {
              const meRes = await fetch('/api/profile/me', { 
                headers: { 'x-user-id': session.user.id } 
              })
              
              if (!meRes.ok) {
                console.error('API获取用户资料失败，状态:', meRes.status)
                console.log('API失败，清除会话')
                await supabase.auth.signOut()
                setUser(null)
                return
              }
              
              const meJson = await meRes.json()
              if (meJson.success && meJson.data) {
                console.log('通过API恢复用户状态:', meJson.data.username)
                setUser(meJson.data)
              } else {
                console.log('API也无法获取用户资料，清除会话')
                await supabase.auth.signOut()
                setUser(null)
              }
            } catch (apiError) {
              console.error('API获取用户资料失败:', apiError)
              console.log('API失败，清除会话')
              await supabase.auth.signOut()
              setUser(null)
            }
          } else {
            console.log('恢复用户状态:', userProfile.username)
            setUser(userProfile)
          }
        } else {
          console.log('没有找到现有会话')
          setUser(null)
        }
        
      } catch (error: any) {
        console.error('会话检查失败:', error)
        // 网络错误时不清除用户状态
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          console.log('网络错误，保持当前用户状态')
        } else {
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // 设置会话监听器 - 添加错误处理防止无限循环
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event, session?.user?.id)
        
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            // 用户登录后，从服务端拿资料
            const meRes = await fetch('/api/profile/me', { headers: { 'x-user-id': session.user.id } })
            if (meRes.ok) {
              const meJson = await meRes.json()
              if (meJson.success) setUser(meJson.data)
            } else {
              console.error('获取用户资料失败，状态:', meRes.status)
              // 不设置用户，避免无限循环
            }
          } else if (event === 'SIGNED_OUT') {
            // 用户登出
            setUser(null)
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            // Token刷新，重新获取用户信息
            const meRes = await fetch('/api/profile/me', { headers: { 'x-user-id': session.user.id } })
            if (meRes.ok) {
              const meJson = await meRes.json()
              if (meJson.success) setUser(meJson.data)
            } else {
              console.error('Token刷新后获取用户资料失败，状态:', meRes.status)
              // 不设置用户，避免无限循环
            }
          }
        } catch (error) {
          console.error('认证状态变化处理失败:', error)
          // 发生错误时不设置用户，避免无限循环
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // 监听头像更新事件
  useEffect(() => {
    const handleAvatarUpdate = async (event: CustomEvent) => {
      const { userId } = event.detail
      // 如果是当前用户的头像更新，刷新用户信息
      if (user?.id === userId) {
        console.log('检测到头像更新，刷新用户信息')
        await refreshUser()
      }
    }

    window.addEventListener('avatarUpdated', handleAvatarUpdate as unknown as EventListener)
    
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as unknown as EventListener)
    }
  }, [user?.id, refreshUser])

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}