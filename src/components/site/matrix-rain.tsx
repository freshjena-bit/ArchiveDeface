'use client'

import * as React from 'react'

/**
 * Original "digital rain" canvas effect.
 * Renders katakana + glyph stream falling down the viewport.
 */
export function MatrixRain({ className = '' }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    const fontSize = 14
    let columns = 0
    let drops: number[] = []
    const chars = 'アカサタナハマヤラワ0123456789ABCDEF<>{}[]/\\|*+$%@'.split('')

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      columns = Math.floor(width / fontSize)
      drops = new Array(columns).fill(0).map(() => Math.random() * -50)
    }
    resize()

    let last = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 55) return // throttle ~18fps
      last = t

      ctx.fillStyle = 'rgba(13, 15, 14, 0.18)'
      ctx.fillRect(0, 0, width, height)
      ctx.font = `${fontSize}px var(--font-geist-mono), monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize
        // head bright, trail dim
        const alpha = Math.random() > 0.975 ? 0.95 : 0.32
        ctx.fillStyle = `rgba(124, 255, 138, ${alpha})`
        ctx.fillText(text, x, y)

        if (y > height && Math.random() > 0.975) drops[i] = 0
        drops[i] += 1
      }
    }
    raf = requestAnimationFrame(draw)

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
