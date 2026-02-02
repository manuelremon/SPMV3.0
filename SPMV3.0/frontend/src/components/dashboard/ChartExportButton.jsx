/**
 * ChartExportButton - Exportar graficos como PNG
 *
 * Features:
 * - Captura el contenedor del grafico
 * - Descarga como PNG con fecha en nombre
 * - Fallback si html2canvas no esta disponible
 */

import React, { useState, useCallback } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadIcon from '@mui/icons-material/Download'

/**
 * Captura un elemento DOM y lo convierte a PNG usando Canvas nativo
 * (Alternativa ligera a html2canvas)
 */
async function captureToCanvas(element) {
  // Crear canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const rect = element.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  // Fondo blanco
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, rect.width, rect.height)

  // Intentar usar html2canvas si esta disponible
  if (window.html2canvas) {
    const html2canvas = window.html2canvas
    return html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: dpr,
      useCORS: true,
      logging: false,
    })
  }

  // Fallback: Buscar canvas internos y SVGs
  const svgs = element.querySelectorAll('svg')
  const canvases = element.querySelectorAll('canvas')

  // Procesar SVGs
  for (const svg of svgs) {
    try {
      const svgRect = svg.getBoundingClientRect()
      const x = svgRect.left - rect.left
      const y = svgRect.top - rect.top

      // Serializar SVG
      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      // Crear imagen desde SVG
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })

      ctx.drawImage(img, x, y, svgRect.width, svgRect.height)
      URL.revokeObjectURL(url)
    } catch {
      // Si falla un SVG, continuar con el siguiente
    }
  }

  // Procesar canvas existentes
  for (const existingCanvas of canvases) {
    try {
      const canvasRect = existingCanvas.getBoundingClientRect()
      const x = canvasRect.left - rect.left
      const y = canvasRect.top - rect.top
      ctx.drawImage(existingCanvas, x, y, canvasRect.width, canvasRect.height)
    } catch {
      // Si falla un canvas, continuar
    }
  }

  return canvas
}

/**
 * Componente principal ChartExportButton
 */
export function ChartExportButton({
  chartRef,
  filename = 'chart',
  tooltip = 'Exportar como PNG',
  size = 'small',
  disabled = false,
}) {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!chartRef?.current || exporting) return

    setExporting(true)

    try {
      const element = chartRef.current
      const canvas = await captureToCanvas(element)

      // Crear link de descarga
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.download = `${filename}-${date}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error al exportar grafico:', error)
      // Fallback: Intentar screenshot con API nativa si esta disponible
      try {
        if (navigator.clipboard && 'write' in navigator.clipboard) {
          // Notificar al usuario que copie manualmente
          alert('No se pudo exportar automaticamente. Por favor, use captura de pantalla.')
        }
      } catch {
        // Silenciar error secundario
      }
    } finally {
      setExporting(false)
    }
  }, [chartRef, filename, exporting])

  return (
    <Tooltip title={tooltip}>
      <span>
        <IconButton
          size={size}
          onClick={handleExport}
          disabled={disabled || exporting || !chartRef?.current}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              bgcolor: 'primary.lighter',
            },
          }}
        >
          {exporting ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <DownloadIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}

export default ChartExportButton
