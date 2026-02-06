'use client'

/**
 * 通知红点 - 显示未读数量
 */
export default function NotificationDot({ count, className = '' }: { count: number; className?: string }) {
  if (count === 0) return null

  const isSmallCount = count < 10
  const size = isSmallCount ? 'h-5 w-5' : 'h-6 min-w-6 px-1'
  const textSize = isSmallCount ? 'text-xs' : 'text-[10px]'

  return (
    <span
      className={`absolute -top-1 -right-1 bg-red-500 text-white ${textSize} rounded-full ${size} flex items-center justify-center font-bold shadow-lg border-2 border-white ${className}`}
      style={{
        pointerEvents: 'none',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        zIndex: 10000,
        position: 'absolute',
        top: '-4px',
        right: '-4px',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
