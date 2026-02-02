/**
 * Canvas-based Donut Chart Component
 *
 * Reemplaza @mui/x-charts/PieChart con una versión Canvas mucho más ligera.
 * Aproximadamente 15x más pequeño (sin deps pesadas de MUI X Charts).
 *
 * Uso:
 *   <CanvasDonutChart
 *     data={[150, 85, 120]}
 *     colors={['#3b82f6', '#ef4444', '#10b981']}
 *     labels={['Completadas', 'Pendientes', 'Rechazadas']}
 *     width={100}
 *     height={100}
 *   />
 */

import React, { useEffect, useRef } from 'react'

export function CanvasDonutChart({
  data = [],
  colors = [],
  labels = [],
  width = 100,
  height = 100,
  innerRadius = 30,
  outerRadius = 45,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data || data.length === 0) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Set canvas size with device pixel ratio
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2

    // Calculate total for percentage
    const total = data.reduce((sum, val) => sum + val, 0)
    if (total === 0) return

    // Draw slices
    let startAngle = -Math.PI / 2 // Start from top
    const sliceColors = colors.length > 0 ? colors : generateDefaultColors(data.length)

    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI
      const endAngle = startAngle + sliceAngle

      // Draw outer slice (fill)
      ctx.fillStyle = sliceColors[index] || '#ccc'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      // Draw inner circle (to create donut effect)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
      ctx.fill()

      startAngle = endAngle
    })

    // Draw total text in center
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1f2937'
    ctx.fillText(String(total), centerX, centerY)
  }, [data, colors, width, height, innerRadius, outerRadius])

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

/**
 * Genera colores por defecto si no se proporcionan
 */
function generateDefaultColors(count) {
  const hues = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
  ]
  return Array.from({ length: count }, (_, i) => hues[i % hues.length])
}

/**
 * Hook para calcular colores automáticamente
 */
export function useDonutChartColors(dataLength) {
  return generateDefaultColors(dataLength)
}

export default CanvasDonutChart
