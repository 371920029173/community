import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!serviceRoleKey || !anonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables'
      }, { status: 500 })
    }
    
    // 检查隐藏字符
    const serviceKeyRaw = serviceRoleKey
    const serviceKeyClean = serviceRoleKey.trim().replace(/\s+/g, '')
    const anonKeyRaw = anonKey
    const anonKeyClean = anonKey.trim().replace(/\s+/g, '')
    
    // 检查是否有换行符或其他隐藏字符
    const hasNewlines = serviceKeyRaw.includes('\n') || serviceKeyRaw.includes('\r')
    const hasExtraSpaces = serviceKeyRaw.length !== serviceKeyClean.length
    const hasHiddenChars = serviceKeyRaw.split('').some(char => {
      const code = char.charCodeAt(0)
      return (code < 32 || code > 126) && code !== 9 // 排除可见字符和制表符
    })
    
    return NextResponse.json({
      success: true,
      analysis: {
        serviceKey: {
          rawLength: serviceKeyRaw.length,
          cleanLength: serviceKeyClean.length,
          expectedLength: 219,
          hasNewlines,
          hasExtraSpaces,
          hasHiddenChars,
          lengthMatch: serviceKeyClean.length === 219,
          isValidFormat: serviceKeyClean.startsWith('eyJ'),
          first30: serviceKeyClean.substring(0, 30),
          last20: serviceKeyClean.substring(Math.max(0, serviceKeyClean.length - 20)),
          // 显示原始字符串的字符编码（检查隐藏字符）
          rawCharCodes: hasHiddenChars ? 
            Array.from(serviceKeyRaw).slice(0, 50).map((c, i) => ({ 
              index: i, 
              char: c, 
              code: c.charCodeAt(0) 
            })).filter(c => c.code < 32 || c.code > 126) : []
        },
        anonKey: {
          rawLength: anonKeyRaw.length,
          cleanLength: anonKeyClean.length,
          expectedLength: 219,
          hasNewlines: anonKeyRaw.includes('\n') || anonKeyRaw.includes('\r'),
          hasExtraSpaces: anonKeyRaw.length !== anonKeyClean.length,
          lengthMatch: anonKeyClean.length === 219,
          isValidFormat: anonKeyClean.startsWith('eyJ')
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || String(error)
    }, { status: 500 })
  }
}

