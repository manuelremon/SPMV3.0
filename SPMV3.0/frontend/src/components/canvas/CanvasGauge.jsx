/**
 * Canvas-based Gauge Component
 *
 * Reemplaza @mui/x-charts/Gauge con una versión Canvas mucho más ligera.
 * Aproximadamente 10x más pequeño (sin deps pesadas).
 *
 * Uso:
 *   <CanvasGauge
 *     value={75}
 *     valueMax={100}
 *     width={70}
 *     height={70}
 *     color="#3b82f6"
 *     text="75%"
 *   />
 */

import React, { useEffect, useRef } from 'react'

export function CanvasGauge({
  value = 0,
  valueMax = 100,
  width = 70,
  height = 70,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  text = `${value}%`,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size with device pixel ratio
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Gauge parameters
    const centerX = width / 2
    const centerY = height * 0.65 // More towards bottom
    const radius = Math.min(width, height) * 0.35
    const startAngle = (Math.PI * 200) / 180 // -110 degrees
    const endAngle = (Math.PI * -20) / 180 // 110 degrees
    const lineWidth = 5

    // Draw background arc
    ctx.strokeStyle = backgroundColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, true)
    ctx.stroke()

    // Draw value arc
    const percentage = Math.min(value / valueMax, 1)
    const currentAngle = startAngle + (endAngle - startAngle) * percentage

    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, currentAngle, true)
    ctx.stroke()

    // Draw center text
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1f2937'

    const textWidth = ctx.measureText(text).width
    const maxWidth = width * 0.6

    // Scale text if too wide
    if (textWidth > maxWidth) {
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }

    ctx.fillText(text, centerX, centerY)
  }, [value, valueMax, width, height, color, backgroundColor, text])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
      }}
    />
  )
}

export default CanvasGauge
