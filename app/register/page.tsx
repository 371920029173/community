'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { Eye, EyeOff, User, Lock, Palette, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getFriendlyErrorMessage } from '@/lib/utils'

const nicknameColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

function RegisterForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedColor, setSelectedColor] = useState(nicknameColors[0])
  const [isLoading, setIsLoading] = useState(false)
  
  // 人机验证相关
  const [challenge, setChallenge] = useState<{ a: number; b: number } | null>(null)
  const [verificationResponse, setVerificationResponse] = useState('')
  const [verificationTimestamp, setVerificationTimestamp] = useState(0)
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('ref') || undefined

  // 生成新的验证挑战
  const generateChallenge = () => {
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 20) + 1
    setChallenge({ a, b })
    setVerificationResponse('')
    setVerificationTimestamp(Date.now())
  }

  // 初始化验证挑战
  useEffect(() => {
    generateChallenge()
  }, [])

  // 执行人机验证和设备指纹检测
  const performVerification = async (): Promise<string | null> => {
    if (!challenge || !verificationResponse.trim()) {
      toast.error('请完成人机验证')
      return null
    }

    setIsVerifying(true)
    try {
      const userAgent = navigator.userAgent
      const acceptLanguage = navigator.language || 'zh-CN'
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const response = await fetch('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge: `${challenge.a}+${challenge.b}`,
          response: verificationResponse.trim(),
          timestamp: verificationTimestamp,
          userAgent,
          acceptLanguage,
          timezone
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || '验证失败')
        generateChallenge() // 重新生成挑战
        return null
      }

      return data.fingerprint
    } catch (error: any) {
      toast.error('验证失败，请重试')
      generateChallenge()
      return null
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !password || !confirmPassword) {
      toast.error('请填写所有字段')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    // 先执行验证
    const fingerprint = await performVerification()
    if (!fingerprint) {
      return // 验证失败，已显示错误提示
    }

    setIsLoading(true)
    
    try {
      // 传递设备指纹给注册函数（需要修改 AuthProvider）
      await signUp(username, password, fingerprint, inviteCode)
      toast.success('注册成功！请登录')
      router.push('/login')
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error) || '注册失败，请重试')
      generateChallenge() // 重新生成验证挑战
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-primary-600 to-accent-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            创建新账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              登录现有账户
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="请输入用户名"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="请输入密码（至少6位）"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="请再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                昵称颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {nicknameColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                选择你喜欢的昵称显示颜色
              </p>
            </div>

            {/* 人机验证 */}
            <div className="relative z-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                人机验证
              </label>
              {challenge && (
                <div className="relative">
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-xl border border-white/50 shadow-lg -z-10"></div>
                  <div className="relative flex items-center gap-3 px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-md">
                    <span className="text-gray-800 font-semibold text-lg">
                      {challenge.a} + {challenge.b} =
                    </span>
                    <input
                      type="number"
                      value={verificationResponse}
                      onChange={(e) => setVerificationResponse(e.target.value)}
                      placeholder="?"
                      className="flex-1 ml-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateChallenge}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-lg transition-colors backdrop-blur-sm"
                      title="刷新验证"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                请计算并输入结果以验证您是人类
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || isVerifying || !verificationResponse.trim()}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '注册中...' : isVerifying ? '验证中...' : '注册'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-500">
              返回首页
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>}>
      <RegisterForm />
    </Suspense>
  )
}