/**
 * StatusDistributionChart - PieChart interactivo con MUI X Charts
 *
 * Features:
 * - Click en segmento para drill-down
 * - Tooltip con cantidad y porcentaje
 * - Animacion de highlight en hover
 * - Colores consistentes con SPM_COLORS
 */

import React, { forwardRef, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { PieChart, pieArcLabelClasses } from '@mui/x-charts/PieChart'
import { SPM_COLORS } from '../ui/SPMCharts'

// Colores por estado del sistema
const STATUS_COLORS = {
  borrador: '#94a3b8',    // Slate
  enviadas: '#f59e0b',    // Amber
  aprobadas: '#10b981',   // Emerald
  enProceso: '#3b82f6',   // Blue
  rechazadas: '#ef4444',  // Red
  cerradas: '#8b5cf6',    // Purple
}

/**
 * Componente principal StatusDistributionChart
 */
export const StatusDistributionChart = forwardRef(function StatusDistributionChart({
  data = [],
  onDrillDown = null,
  height = 180,
  showLegend = true,
  innerRadius = 45,
  outerRadius = 70,
}, ref) {
  // Preparar datos para PieChart
  const pieData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Esperar array de objetos { id, label, value, color? }
    return data
      .filter(item => item.value > 0)
      .map((item, index) => ({
        id: item.id || index,
        value: item.value,
        label: item.label,
        color: item.color || STATUS_COLORS[item.id] || SPM_COLORS.series[index % SPM_COLORS.series.length],
      }))
  }, [data])

  // Calcular total para mostrar en centro
  const total = useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.value, 0)
  }, [pieData])

  // Handler para click en segmento
  const handleItemClick = (event, itemIdentifier) => {
    if (onDrillDown && pieData[itemIdentifier.dataIndex]) {
      const item = pieData[itemIdentifier.dataIndex]
      onDrillDown(item.id, item)
    }
  }

  if (pieData.length === 0) {
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
          Sin datos disponibles
        </Typography>
      </Box>
    )
  }

  return (
    <Box ref={ref} sx={{ position: 'relative', height, width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ height: '100%' }}>
        {/* Leyenda a la izquierda */}
        {showLegend && (
          <Stack spacing={0.5} sx={{ minWidth: 100 }}>
            {pieData.map((item, idx) => (
              <Stack
                key={item.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  cursor: onDrillDown ? 'pointer' : 'default',
                  '&:hover': onDrillDown ? { opacity: 0.8 } : {},
                }}
                onClick={() => onDrillDown && onDrillDown(item.id, item)}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: item.color,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontSize: '0.65rem' }}
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.7rem' }}
                >
                  {item.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        {/* PieChart */}
        <Box sx={{ position: 'relative', width: 150, height: '100%', flexShrink: 0 }}>
          <PieChart
            series={[
              {
                data: pieData,
                innerRadius,
                outerRadius,
                paddingAngle: 2,
                cornerRadius: 4,
                highlightScope: { faded: 'global', highlighted: 'item' },
                faded: { innerRadius: innerRadius - 5, additionalRadius: -5, color: 'gray' },
                cx: 75,
                cy: height / 2 - 10,
              },
            ]}
            height={height}
            width={150}
            margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            slots={{
              legend: () => null,
            }}
            onItemClick={handleItemClick}
            sx={{
              [`& .${pieArcLabelClasses.root}`]: {
                fill: 'white',
                fontWeight: 'bold',
                fontSize: 10,
              },
              cursor: onDrillDown ? 'pointer' : 'default',
            }}
          />
          {/* Total en el centro */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: 75,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, lineHeight: 1, color: 'text.primary' }}
            >
              {total}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Box>
  )
})

export default StatusDistributionChart
