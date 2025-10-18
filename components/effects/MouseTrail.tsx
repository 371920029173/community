'use client'

import { useEffect } from 'react'

interface MouseTrailProps {
  enabled?: boolean
}

export default function MouseTrail({ enabled = true }: MouseTrailProps) {
  useEffect(() => {
    if (!enabled) return

    let mouseX = 0
    let mouseY = 0
    let trail: Array<{ x: number; y: number; time: number }> = []
    const maxTrailLength = 20
    const trailContainer = document.createElement('div')
    trailContainer.className = 'mouse-trail'
    document.body.appendChild(trailContainer)

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      
      // 添加当前鼠标位置到轨迹
      trail.push({ x: mouseX, y: mouseY, time: Date.now() })
      
      // 限制轨迹长度
      if (trail.length > maxTrailLength) {
        trail.shift()
      }
      
      // 创建轨迹点
      createTrailDot(mouseX, mouseY)
      
      // 创建连线
      if (trail.length > 1) {
        createTrailLines()
      }
    }

    const handleMouseClick = (e: MouseEvent) => {
      // 点击时创建特殊的波纹效果
      createRippleEffect(e.clientX, e.clientY)
    }

    const createTrailDot = (x: number, y: number) => {
      const dot = document.createElement('div')
      dot.className = 'trail-dot'
      dot.style.left = `${x - 2}px`
      dot.style.top = `${y - 2}px`
      
      trailContainer.appendChild(dot)
      
      // 自动移除
      setTimeout(() => {
        if (dot.parentNode) {
          dot.parentNode.removeChild(dot)
        }
      }, 1000)
    }

    const createTrailLines = () => {
      // 移除旧的连线
      const oldLines = trailContainer.querySelectorAll('.trail-line')
      oldLines.forEach(line => {
        if (line.parentNode) {
          line.parentNode.removeChild(line)
        }
      })

      // 创建新的连线
      for (let i = 0; i < trail.length - 1; i++) {
        const current = trail[i]
        const next = trail[i + 1]
        
        // 计算距离，只连接相近的点
        const distance = Math.sqrt(
          Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
        )
        
        if (distance < 100) { // 只连接距离小于100px的点
          const line = document.createElement('div')
          line.className = 'trail-line'
          
          const angle = Math.atan2(next.y - current.y, next.x - current.x)
          const length = distance
          
          line.style.left = `${current.x}px`
          line.style.top = `${current.y}px`
          line.style.width = `${length}px`
          line.style.transform = `rotate(${angle}rad)`
          line.style.transformOrigin = '0 0'
          
          trailContainer.appendChild(line)
          
          // 自动移除
          setTimeout(() => {
            if (line.parentNode) {
              line.parentNode.removeChild(line)
            }
          }, 800)
        }
      }
    }

    const createRippleEffect = (x: number, y: number) => {
      const ripple = document.createElement('div')
      ripple.style.position = 'fixed'
      ripple.style.left = `${x - 25}px`
      ripple.style.top = `${y - 25}px`
      ripple.style.width = '50px'
      ripple.style.height = '50px'
      ripple.style.borderRadius = '50%'
      ripple.style.background = 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(99, 102, 241, 0.3) 50%, transparent 100%)'
      ripple.style.pointerEvents = 'none'
      ripple.style.zIndex = '9999'
      ripple.style.animation = 'ripple 0.6s ease-out forwards'
      
      document.body.appendChild(ripple)
      
      // 自动移除
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
      }, 600)
    }

    // 添加CSS动画
    const style = document.createElement('style')
    style.textContent = `
      @keyframes ripple {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(style)

    // 绑定事件
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleMouseClick)

    // 清理函数
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleMouseClick)
      if (trailContainer.parentNode) {
        trailContainer.parentNode.removeChild(trailContainer)
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style)
      }
    }
  }, [enabled])

  return null
}

