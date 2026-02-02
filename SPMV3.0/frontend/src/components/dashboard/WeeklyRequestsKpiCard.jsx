/**
 * WeeklyRequestsKpiCard - Tarjeta KPI compacta con sparkline
 *
 * Muestra el total de solicitudes de la semana actual con:
 * - KPI grande (total semanal)
 * - Variacion vs semana pasada
 * - Sparkline con MUI X Charts
 */

import React, { useState } from 'react'
import { Card, CardContent } from '../ui/Card'
import { TrendingUp, TrendingDown, Minus } from '../ui/Icons'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'
import { areaElementClasses, lineElementClasses } from '@mui/x-charts/LineChart'
import Box from '@mui/material/Box'
import clsx from 'clsx'


/**
 * Sparkline interactivo con MUI X Charts
 */
function Sparkline({ data, labels = [], className = '', height = 50, onHighlight }) {
  const [highlightedIndex, setHighlightedIndex] = useState(null)

  // Fallback si no hay datos
  if (!data || data.length === 0 || data.every(v => v === 0)) {
    return (
      <div className={clsx('flex items-center justify-center text-slate-400 dark:text-slate-500', className)}>
        <span className="text-xs">Sin datos</span>
      </div>
    )
  }

  // Normalizar datos
  const values = data.map(v => Number(v) || 0)

  // Determinar color basado en tendencia
  const isPositive = values[values.length - 1] >= values[0]
  const chartColor = isPositive ? '#10b981' : '#ef4444'

  const handleHighlightChange = (axisItems) => {
    const newIndex = axisItems?.[0]?.dataIndex ?? null
    setHighlightedIndex(newIndex)
    if (onHighlight) {
      onHighlight(newIndex)
    }
  }

  // Configurar xAxis con labels si están disponibles
  const xAxisConfig = labels.length > 0 ? {
    xAxis: {
      id: 'date-axis',
      data: labels,
      scaleType: 'point',
    }
  } : {}

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <SparkLineChart
        data={values}
        height={height}
        area
        showHighlight
        showTooltip
        color={chartColor}
        baseline="min"
        margin={{ bottom: 0, top: 3, left: 4, right: 4 }}
        {...xAxisConfig}
        yAxis={{
          domainLimit: (_, maxValue) => ({
            min: -maxValue / 8,
            max: maxValue,
          }),
        }}
        sx={{
          [`& .${areaElementClasses.root}`]: {
            opacity: 0.2,
            transition: 'opacity 0.2s ease'
          },
          [`& .${lineElementClasses.root}`]: {
            strokeWidth: 2,
            transition: 'stroke-width 0.2s ease'
          },
        }}
        slotProps={{
          lineHighlight: { r: 3 },
        }}
        clipAreaOffset={{ top: 2, bottom: 2 }}
        axisHighlight={{ x: 'line' }}
        onHighlightedAxisChange={handleHighlightChange}
      />
    </Box>
  )
}

/**
 * Calcula estadisticas de la semana
 */
function calculateWeekStats(currentWeek, previousWeekTotal = null) {
  const current = (currentWeek || []).map(v => Number(v) || 0)
  const totalActual = current.reduce((a, b) => a + b, 0)

  // Si no hay datos de semana pasada, intentar estimar o mostrar N/A
  let variacion = null
  let variacionPct = null

  if (previousWeekTotal !== null && previousWeekTotal > 0) {
    variacion = totalActual - previousWeekTotal
    variacionPct = ((totalActual - previousWeekTotal) / previousWeekTotal) * 100
  }

  return {
    total: totalActual,
    variacion,
    variacionPct,
    promedio: current.length > 0 ? Math.round(totalActual / current.length) : 0,
    hasData: totalActual > 0 || current.some(v => v > 0)
  }
}

/**
 * Componente principal
 */
export function WeeklyRequestsKpiCard({
  data = [],
  labels = [],
  previousWeekTotal = null,
  trendPercentage = null,
  compact = false,
  className = ''
}) {
  // Calcular estadisticas
  const stats = calculateWeekStats(data, previousWeekTotal)

  return (
    <Card className={clsx(
      'bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30 w-full h-full',
      className
    )}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        {/* Titulo y cantidad */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Solicitudes creadas
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {stats.total.toLocaleString()}
          </p>
        </div>
        {/* Sparkline */}
        <div className="h-12">
          <Sparkline data={data} labels={labels} height={48} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export default WeeklyRequestsKpiCard
