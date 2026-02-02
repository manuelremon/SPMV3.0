/**
 * TrendChart - Grafico de tendencia historica con MUI X Charts
 *
 * Features:
 * - LineChart con areas apiladas
 * - Evolucion mensual de solicitudes
 * - Leyenda interactiva
 * - Tooltip detallado
 */

import React, { forwardRef, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LineChart, lineElementClasses, areaElementClasses } from '@mui/x-charts/LineChart'
import { SPM_COLORS } from '../ui/SPMCharts'

// Colores por serie
const SERIES_COLORS = {
  aprobadas: SPM_COLORS.success,
  rechazadas: SPM_COLORS.error,
  pendientes: SPM_COLORS.warning,
  total: SPM_COLORS.primary,
}

/**
 * Componente principal TrendChart
 */
export const TrendChart = forwardRef(function TrendChart({
  data = null,
  height = 280,
  showLegend = true,
  showGrid = true,
  showArea = true,
}, ref) {
  // Preparar datos para LineChart
  const chartConfig = useMemo(() => {
    if (!data) return null

    // Esperar objeto con { meses: [], aprobadas: [], rechazadas: [], pendientes: [] }
    const { meses = [], aprobadas = [], rechazadas = [], pendientes = [] } = data

    if (meses.length === 0) return null

    // Generar fechas para xAxis
    const xAxisData = meses.map((mes, idx) => idx)

    const series = []

    // Serie aprobadas
    if (aprobadas.length > 0) {
      series.push({
        data: aprobadas,
        label: 'Aprobadas',
        color: SERIES_COLORS.aprobadas,
        area: showArea,
        showMark: false,
        curve: 'monotoneX',
      })
    }

    // Serie pendientes
    if (pendientes.length > 0) {
      series.push({
        data: pendientes,
        label: 'Pendientes',
        color: SERIES_COLORS.pendientes,
        area: showArea,
        showMark: false,
        curve: 'monotoneX',
      })
    }

    // Serie rechazadas
    if (rechazadas.length > 0) {
      series.push({
        data: rechazadas,
        label: 'Rechazadas',
        color: SERIES_COLORS.rechazadas,
        area: showArea,
        showMark: false,
        curve: 'monotoneX',
      })
    }

    return {
      xAxis: [{
        id: 'months',
        data: xAxisData,
        scaleType: 'point',
        valueFormatter: (value) => meses[value] || '',
        tickLabelStyle: { fontSize: 10 },
      }],
      series,
      meses,
    }
  }, [data, showArea])

  if (!chartConfig || chartConfig.series.length === 0) {
    return (
      <Box
        ref={ref}
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body2" color="text.disabled">
          Sin datos de tendencia disponibles
        </Typography>
      </Box>
    )
  }

  return (
    <Box ref={ref} sx={{ width: '100%', height }}>
      <LineChart
        xAxis={chartConfig.xAxis}
        series={chartConfig.series}
        height={height}
        margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
        grid={showGrid ? { vertical: false, horizontal: true } : undefined}
        slotProps={{
          legend: showLegend ? {
            direction: 'horizontal',
            position: { vertical: 'top', horizontal: 'end' },
            padding: 0,
          } : { hidden: true },
        }}
        sx={{
          [`& .${lineElementClasses.root}`]: {
            strokeWidth: 2,
          },
          [`& .${areaElementClasses.root}`]: {
            opacity: 0.1,
          },
        }}
      />
    </Box>
  )
})

/**
 * Hook para calcular datos de tendencia desde solicitudes
 */
export function useTrendData(solicitudes, mesesAtras = 12) {
  return useMemo(() => {
    if (!solicitudes || solicitudes.length === 0) {
      return null
    }

    const ahora = new Date()
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    // Inicializar contadores por mes
    const meses = []
    const aprobadas = []
    const rechazadas = []
    const pendientes = []

    for (let i = mesesAtras - 1; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
      const mes = `${mesesNombres[fecha.getMonth()]} ${String(fecha.getFullYear()).slice(-2)}`
      meses.push(mes)

      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)

      let countAprobadas = 0
      let countRechazadas = 0
      let countPendientes = 0

      solicitudes.forEach(s => {
        const fechaCreacion = new Date(s.created_at || s.fecha_creacion)
        if (fechaCreacion >= inicioMes && fechaCreacion <= finMes) {
          const estado = (s.estado || s.status || '').toLowerCase()
          if (estado.includes('aprobada') || estado === 'approved') {
            countAprobadas++
          } else if (estado.includes('rechazada') || estado === 'rejected') {
            countRechazadas++
          } else if (estado.includes('enviada') || estado.includes('pendiente') || estado === 'submitted') {
            countPendientes++
          }
        }
      })

      aprobadas.push(countAprobadas)
      rechazadas.push(countRechazadas)
      pendientes.push(countPendientes)
    }

    return { meses, aprobadas, rechazadas, pendientes }
  }, [solicitudes, mesesAtras])
}

export default TrendChart
