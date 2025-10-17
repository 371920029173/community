'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  connections: number[]
  fadeTimer: number
  fadeDuration: number
  isVisible: boolean
  fadeStartTime: number
  isFading: boolean
  baseOpacity: number
  wasAttracted: boolean // 是否曾经被鼠标吸附
}

interface MousePosition {
  x: number
  y: number
}

export default function ParticlePhysics() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0 })
  const animationRef = useRef<number>()

  // 物理参数
  const PARTICLE_COUNT = 120 // 粒子数量
  const MAX_DISTANCE = 250 // 最大距离，超过此距离不再有相互作用
  const MIN_DISTANCE = 75  // 最小距离，小于此距离会产生排斥力
  const IDEAL_DISTANCE = 165 // 理想距离，粒子希望维持的距离
  const MOUSE_ATTRACTION_DISTANCE = 550 // 鼠标吸引距离
  const MOUSE_ATTRACTION_FORCE = 0.08 // 增强鼠标吸引力
  const REPULSION_FORCE = 0.08 // 排斥力与引力同样大小
  const FRICTION = 0.98 // 摩擦力
  const PARTICLE_SIZE = 2.5
  const FREE_MOVEMENT_FORCE = 0.02 // 增加自由游动力
  const FADE_DURATION_MIN = 25000 // 增加最小渐隐时间（毫秒）
  const FADE_DURATION_MAX = 40000 // 增加最大渐隐时间（毫秒）
  const FADE_TRANSITION_DURATION = 3000 // 增加渐隐过渡时间（毫秒）
  const MOUSE_NEAR_DISTANCE = 30 // 鼠标附近距离，在此范围内不显示粒子间连线
  const MAX_CONNECTIONS_PER_PARTICLE = 3 // 每个粒子最多连接的粒子数量
  // 移除惯性相关参数
  const ATTRACTED_PARTICLE_CONNECTION_PRIORITY = true // 被吸附粒子间连线的优先级
  // 移除散开/爆炸相关参数
  const MAX_PARTICLES_PER_AREA = 15 // 每个区域最多粒子数量
  const DENSITY_CONTROL_FORCE_REDUCTION = 0.3 // 密度过高时的力减弱系数
  const PARTICLE_ATTRACTION_FORCE = 0.005 // 粒子间吸引力

  // 初始化粒子
  const initParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    particlesRef.current = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
             particlesRef.current.push({
               x: Math.random() * canvas.width,
               y: Math.random() * canvas.height,
               vx: (Math.random() - 0.5) * 1.2, // 增加初始速度
               vy: (Math.random() - 0.5) * 1.2,
               size: PARTICLE_SIZE,
               opacity: Math.random() * 0.6 + 0.4,
               baseOpacity: Math.random() * 0.6 + 0.4,
               connections: [],
               fadeTimer: Math.random() * (FADE_DURATION_MAX - FADE_DURATION_MIN) + FADE_DURATION_MIN,
               fadeDuration: Math.random() * (FADE_DURATION_MAX - FADE_DURATION_MIN) + FADE_DURATION_MIN,
               isVisible: true,
               fadeStartTime: 0,
               isFading: false,
               wasAttracted: false
             })
    }
  }

  // 检测粒子密度
  const getParticleDensity = (particle: Particle, particles: Particle[]): number => {
    return particles.filter(p => 
      p !== particle && 
      distance(particle, p) < MIN_DISTANCE
    ).length
  }

  // 计算理想距离力
  const distance = (p1: Particle, p2: Particle) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 计算到鼠标的距离
  const distanceToMouse = (particle: Particle) => {
    const dx = particle.x - mouseRef.current.x
    const dy = particle.y - mouseRef.current.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 移除不再需要的辅助函数

  // 移除支撑机制相关函数

  // 更新粒子物理
  const updateParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const particles = particlesRef.current
    const mouse = mouseRef.current

    // 重置连接
    particles.forEach(particle => {
      particle.connections = []
    })

             // 更新每个粒子
             particles.forEach((particle, i) => {
               if (!particle.isVisible) {
                 // 粒子不可见时，随机重新出现
                 if (Math.random() < 0.0005) { // 降低重新出现概率
                   particle.x = Math.random() * canvas.width
                   particle.y = Math.random() * canvas.height
                   particle.vx = (Math.random() - 0.5) * 1.2
                   particle.vy = (Math.random() - 0.5) * 1.2
                   particle.baseOpacity = Math.random() * 0.6 + 0.4
                   particle.opacity = particle.baseOpacity
                   particle.fadeTimer = Math.random() * (FADE_DURATION_MAX - FADE_DURATION_MIN) + FADE_DURATION_MIN
                   particle.fadeDuration = Math.random() * (FADE_DURATION_MAX - FADE_DURATION_MIN) + FADE_DURATION_MIN
                   particle.isVisible = true
                   particle.isFading = false
                   particle.fadeStartTime = 0
      particle.wasAttracted = false
                 }
                 return
               }

               const mouseDist = distanceToMouse(particle)
               const isNearMouse = mouseDist < MOUSE_ATTRACTION_DISTANCE
               const wasNearMouse = particle.wasAttracted
               // 移除支撑机制相关逻辑

               // 移除惯性效果处理

               // 移除散开效果处理逻辑

               // 鼠标吸引力（优先，不考虑斥力）
               if (isNearMouse && mouseDist > 0) {
                 const force = MOUSE_ATTRACTION_FORCE * (1 - mouseDist / MOUSE_ATTRACTION_DISTANCE)
                 const dx = mouseRef.current.x - particle.x
                 const dy = mouseRef.current.y - particle.y
                 particle.vx += (dx / mouseDist) * force
                 particle.vy += (dy / mouseDist) * force
                 
                 // 标记为被吸附
                 particle.wasAttracted = true
                 
                 // 鼠标吸附时停止渐隐计时
                 if (particle.isFading) {
                   particle.isFading = false
                   particle.fadeTimer = particle.fadeDuration // 重置计时器
                 }
               } else {
                 // 自由游动力（当不在鼠标吸引范围内时）
                 particle.vx += (Math.random() - 0.5) * FREE_MOVEMENT_FORCE
                 particle.vy += (Math.random() - 0.5) * FREE_MOVEMENT_FORCE
                 
                 // 开始渐隐计时（如果还没有开始）
                 if (!particle.isFading && !isNearMouse) {
                   particle.fadeTimer -= 16 // 假设60fps
                   if (particle.fadeTimer <= 0) {
                     particle.isFading = true
                     particle.fadeStartTime = Date.now()
                   }
                 }
               }

               // 检查粒子是否应该开始失去力（在淡化过程中）
               const fadeProgress = particle.fadeTimer / particle.fadeDuration
               const shouldLoseForce = fadeProgress > 0.7 // 在70%淡化时开始失去力

               // 粒子间相互作用（包括理想距离和密度控制）
               particles.forEach((otherParticle, j) => {
                 if (i === j || !otherParticle.isVisible) return

                 const dist = distance(particle, otherParticle)
                 const otherMouseDist = distanceToMouse(otherParticle)
                 const otherIsNearMouse = otherMouseDist < MOUSE_ATTRACTION_DISTANCE
                 
                 // 如果粒子正在淡化且应该失去力，跳过相互作用
                 if (shouldLoseForce) return
                 
                 // 检测密度控制
                 const density = getParticleDensity(particle, particles)
                 const isDensityControlled = density > MAX_PARTICLES_PER_AREA && !isNearMouse && !otherIsNearMouse
                 const forceMultiplier = isDensityControlled ? DENSITY_CONTROL_FORCE_REDUCTION : 1.0
                 
                 // 排斥力（当粒子太近时）
                 if (dist < MIN_DISTANCE && dist > 0) {
                   const force = REPULSION_FORCE * (1 - dist / MIN_DISTANCE) * forceMultiplier
                   const dx = particle.x - otherParticle.x
                   const dy = particle.y - otherParticle.y
                   particle.vx += (dx / dist) * force
                   particle.vy += (dy / dist) * force
                 }
                 
                 // 理想距离力（粒子希望维持IDEAL_DISTANCE的距离）
                 else if (dist > MIN_DISTANCE && dist < MAX_DISTANCE) {
                   const idealForce = PARTICLE_ATTRACTION_FORCE * forceMultiplier
                   const distanceRatio = (dist - MIN_DISTANCE) / (IDEAL_DISTANCE - MIN_DISTANCE)
                   const force = idealForce * (1 - distanceRatio) // 距离越接近理想距离，力越小
                   
                   const dx = otherParticle.x - particle.x
                   const dy = otherParticle.y - particle.y
                   particle.vx += (dx / dist) * force
                   particle.vy += (dy / dist) * force
                 }
               })

               // 连接逻辑：被吸附的粒子保持与其他粒子的连线
               if (!shouldLoseForce) { // 只有在粒子还有力时才建立连接
                 particles.forEach((otherParticle, j) => {
                   if (i === j || !otherParticle.isVisible) return
                   
                   const dist = distance(particle, otherParticle)
                   const otherMouseDist = distanceToMouse(otherParticle)
                   const otherIsNearMouse = otherMouseDist < MOUSE_ATTRACTION_DISTANCE
                   
                   // 连接所有粒子，不管是否被吸附，只要在合理距离内
                   if (dist < MAX_DISTANCE && dist >= MIN_DISTANCE) {
                     particle.connections.push(j)
                   }
                 })
               }

               // 应用摩擦力
               particle.vx *= FRICTION
               particle.vy *= FRICTION

      // 更新位置
      particle.x += particle.vx
      particle.y += particle.vy

      // 边界反弹
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.vx *= -0.8
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.vy *= -0.8
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))
      }

      // 处理渐隐效果
      if (particle.isFading) {
        const fadeProgress = (Date.now() - particle.fadeStartTime) / FADE_TRANSITION_DURATION
        if (fadeProgress >= 1) {
          particle.isVisible = false
          return
        }
        particle.opacity = particle.baseOpacity * (1 - fadeProgress)
      } else {
        // 根据连接数量和基础透明度调整透明度
        const connectionOpacity = Math.min(0.3, particle.connections.length * 0.05)
        particle.opacity = Math.min(1, particle.baseOpacity + connectionOpacity)
      }
    })
  }

  // 渲染粒子
  const renderParticles = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles = particlesRef.current
    const mouse = mouseRef.current

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制连接线
    particles.forEach((particle, i) => {
      if (!particle.isVisible) return

      const mouseDist = distanceToMouse(particle)
      const isNearMouse = mouseDist < MOUSE_ATTRACTION_DISTANCE
      const isVeryNearMouse = mouseDist < MOUSE_NEAR_DISTANCE

      // 优先绘制与鼠标的连接线（如果粒子被鼠标吸附）
      if (isNearMouse && mouseDist < MAX_DISTANCE) {
        const opacity = (1 - mouseDist / MAX_DISTANCE) * 0.8 // 增加鼠标连线的透明度
        ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`
        ctx.lineWidth = 2.5 // 增加鼠标连线的粗细
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(mouse.x, mouse.y)
        ctx.stroke()
      }

      // 与其他粒子的连接线
      if (!isVeryNearMouse) { // 只有在不非常接近鼠标时才绘制粒子间连线
        particle.connections.forEach(connectionIndex => {
          const connectedParticle = particles[connectionIndex]
          if (!connectedParticle.isVisible) return

          const dist = distance(particle, connectedParticle)
          
          // 粒子间连线有最短距离限制
          if (dist >= MIN_DISTANCE) {
            const opacity = (1 - dist / MAX_DISTANCE) * 0.4
            
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(connectedParticle.x, connectedParticle.y)
            ctx.stroke()
          }
        })
      }
    })

    // 绘制粒子
    particles.forEach(particle => {
      if (!particle.isVisible) return

      // 粒子颜色更深
      ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()

      // 粒子光晕效果
      const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3)
      gradient.addColorStop(0, `rgba(59, 130, 246, ${particle.opacity * 0.3})`)
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // 不绘制鼠标点，保持连线效果
  }

  // 动画循环
  const animate = () => {
    updateParticles()
    renderParticles()
    animationRef.current = requestAnimationFrame(animate)
  }

  // 处理鼠标移动
  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  // 处理窗口大小变化
  const handleResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    initParticles()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 设置画布大小
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // 初始化粒子
    initParticles()

    // 添加事件监听器
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)

    // 开始动画
    animate()

    // 清理函数
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  )
}



