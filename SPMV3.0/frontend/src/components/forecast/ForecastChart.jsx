/**
 * ForecastChart - Grafico de prediccion de demanda con MUI X Charts
 *
 * Muestra historico + prediccion con intervalos de confianza
 * Incluye brush interactivo para seleccionar rangos
 * Toggle de zoom para ver detalle de predicciones
 * Navigator bar para controlar el rango visible del eje X
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  useBrush,
  useDrawingArea,
  useLineSeries,
  useXScale,
} from '@mui/x-charts/hooks';
import { useTheme } from '@mui/material/styles';
import { useI18n } from '../../context/i18n';

// Paleta de colores con mayor contraste
const COLORS = {
  historico: '#475569',           // Slate 600 - contexto (gris azulado)
  prediccion: '#6366f1',          // Índigo vibrante - protagonista
  intervalo: 'rgba(99, 102, 241, 0.12)', // Índigo con 12% opacidad
  grid: '#e2e8f0',                // Gris muy claro para grilla
  navigator: {
    background: '#f8fafc',        // Slate 50
    selection: 'rgba(59, 130, 246, 0.15)', // Blue with transparency
    border: '#3b82f6',            // Blue 500
    handle: '#3b82f6',            // Blue 500
    line: '#94a3b8',              // Slate 400
  }
};

// Colores para modo simulación (Cold Start)
const COLORS_SIMULATION = {
  prediccion: '#f59e0b',          // Amber-500 - color distintivo
  intervalo: 'rgba(245, 158, 11, 0.15)', // Amber con transparencia
  safetyStock: '#ef4444',         // Red-500 para safety stock
  navigator: {
    background: '#fffbeb',        // Amber 50
    selection: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b',
    handle: '#f59e0b',
    line: '#fbbf24',
  }
};

// Componente de overlay para el brush (comparación de puntos)
function CustomBrushOverlay({ seriesId, dateLabels }) {
  const theme = useTheme();
  const drawingArea = useDrawingArea();
  const brush = useBrush();
  const xScale = useXScale();
  const series = useLineSeries(seriesId);

  if (!brush || !series || !brush.start || !brush.current) {
    return null;
  }

  const { left, top, width, height } = drawingArea;

  // Clamp coordinates to drawing area
  const clampX = (x) => Math.max(left, Math.min(left + width, x));
  const clampedStartX = clampX(brush.start.x);
  const clampedCurrentX = clampX(brush.current.x);

  const minX = Math.min(clampedStartX, clampedCurrentX);
  const maxX = Math.max(clampedStartX, clampedCurrentX);
  const rectWidth = maxX - minX;

  const color = theme.palette.primary.main;

  if (rectWidth < 1) {
    return null;
  }

  // Para scale type 'time', necesitamos calcular el índice de manera diferente
  const range = xScale.range();
  const rangeWidth = Math.abs(range[1] - range[0]);
  const minRange = Math.min(...range);

  const getIndex = (x) => {
    const ratio = (x - minRange) / rangeWidth;
    const idx = Math.round(ratio * (series.data.length - 1));
    return Math.max(0, Math.min(series.data.length - 1, idx));
  };

  const startIndex = getIndex(clampedStartX);
  const currentIndex = getIndex(clampedCurrentX);

  const startValue = series.data[startIndex];
  const currentValue = series.data[currentIndex];

  // Si algún valor es null, buscar el más cercano no-null
  const findNearestValue = (data, idx, direction = 1) => {
    for (let i = 0; i < data.length; i++) {
      const checkIdx = idx + (i * direction);
      if (checkIdx >= 0 && checkIdx < data.length && data[checkIdx] !== null) {
        return { value: data[checkIdx], idx: checkIdx };
      }
    }
    return null;
  };

  const startData = startValue !== null ? { value: startValue, idx: startIndex } : findNearestValue(series.data, startIndex, 1);
  const currentData = currentValue !== null ? { value: currentValue, idx: currentIndex } : findNearestValue(series.data, currentIndex, -1);

  if (!startData || !currentData) {
    return null;
  }

  const difference = currentData.value - startData.value;
  const percentChange = startData.value !== 0 ? ((difference / startData.value) * 100).toFixed(1) : '0';

  // Obtener las etiquetas de fecha
  const startDate = dateLabels[startData.idx] || '';
  const currentDate = dateLabels[currentData.idx] || '';

  return (
    <g>
      {/* Línea de inicio */}
      <line
        x1={clampedStartX}
        y1={top}
        x2={clampedStartX}
        y2={top + height}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5,5"
        pointerEvents="none"
      />

      {/* Línea actual */}
      <line
        x1={clampedCurrentX}
        y1={top}
        x2={clampedCurrentX}
        y2={top + height}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5,5"
        pointerEvents="none"
      />

      {/* Rectángulo de selección */}
      <rect
        x={minX}
        y={top}
        width={rectWidth}
        height={height}
        fill={color}
        fillOpacity={0.1}
        pointerEvents="none"
      />

      {/* Etiqueta de inicio */}
      <g transform={`translate(${clampedStartX}, ${top + 15})`}>
        <rect x={-35} y={0} width={70} height={44} fill={color} rx={4} />
        <text x={0} y={16} textAnchor="middle" fill="white" fontSize={10}>
          {startDate}
        </text>
        <text
          x={0}
          y={34}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          fontWeight="bold"
        >
          {startData.value.toFixed(1)}
        </text>
      </g>

      {/* Etiqueta final */}
      <g transform={`translate(${clampedCurrentX}, ${top + 15})`}>
        <rect x={-35} y={0} width={70} height={44} fill={color} rx={4} />
        <text x={0} y={16} textAnchor="middle" fill="white" fontSize={10}>
          {currentDate}
        </text>
        <text
          x={0}
          y={34}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          fontWeight="bold"
        >
          {currentData.value.toFixed(1)}
        </text>
      </g>

      {/* Etiqueta de diferencia en el centro */}
      <g transform={`translate(${(minX + maxX) / 2}, ${top + height - 40})`}>
        <rect
          x={-55}
          y={0}
          width={110}
          height={30}
          fill={difference >= 0 ? theme.palette.success.main : theme.palette.error.main}
          rx={4}
        />
        <text
          x={0}
          y={20}
          textAnchor="middle"
          fill="white"
          fontSize={12}
          fontWeight="bold"
        >
          {difference >= 0 ? '+' : ''}{difference.toFixed(1)} ({percentChange}%)
        </text>
      </g>
    </g>
  );
}

/**
 * MiniChart - Mini gráfico de área simple usando SVG
 * Alternativa ligera a SparkLineChart para el navigator
 */
const MiniChart = ({ data, color, height = 40 }) => {
  const points = useMemo(() => {
    if (!data || data.length === 0) return '';

    const values = data.map(d => typeof d === 'number' ? d : (d?.value ?? 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const pointsArray = values.map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    });

    return pointsArray.join(' ');
  }, [data, height]);

  const areaPath = useMemo(() => {
    if (!data || data.length === 0) return '';

    const values = data.map(d => typeof d === 'number' ? d : (d?.value ?? 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    let path = `M 0,${height}`;
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      path += ` L ${x},${y}`;
    });
    path += ` L 100,${height} Z`;

    return path;
  }, [data, height]);

  if (!points) return null;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      {/* Línea base de referencia (visible incluso con datos planos) */}
      <line
        x1="0" y1={height / 2}
        x2="100" y2={height / 2}
        stroke={color}
        strokeWidth="0.5"
        strokeDasharray="2 2"
        opacity="0.3"
      />
      <path
        d={areaPath}
        fill={color}
        fillOpacity="0.3"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/**
 * TimeRangeNavigator - Barra de navegación para seleccionar rango de tiempo
 * Similar a los navegadores de gráficos financieros
 */
const TimeRangeNavigator = ({
  data,
  visibleRange,
  onRangeChange,
  simulationMode = false,
  dateLabels = [],
}) => {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); // 'left' | 'right' | 'middle' | null
  const [dragStart, setDragStart] = useState(null);

  const navColors = simulationMode ? COLORS_SIMULATION.navigator : COLORS.navigator;

  // Calcular posiciones de los handles basadas en el rango visible
  const totalPoints = data.length;

  // Protección contra división por cero
  if (totalPoints === 0) return null;

  const leftPercent = (visibleRange[0] / totalPoints) * 100;
  const rightPercent = (visibleRange[1] / totalPoints) * 100;
  const widthPercent = Math.max(rightPercent - leftPercent, 1);

  // Formatear etiquetas de fecha para el navegador
  const startLabel = dateLabels[visibleRange[0]] || '';
  const endLabel = dateLabels[Math.min(visibleRange[1] - 1, dateLabels.length - 1)] || '';

  const handleMouseDown = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    setDragStart({
      x: e.clientX,
      range: [...visibleRange],
    });
  }, [visibleRange]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const deltaX = e.clientX - dragStart.x;
    const deltaPercent = (deltaX / containerWidth) * 100;
    const deltaPoints = Math.round((deltaPercent / 100) * totalPoints);

    let newRange = [...dragStart.range];
    const minRangeSize = Math.max(5, Math.floor(totalPoints * 0.05)); // Mínimo 5% o 5 puntos

    if (isDragging === 'left') {
      const newStart = Math.max(0, Math.min(dragStart.range[0] + deltaPoints, dragStart.range[1] - minRangeSize));
      newRange = [newStart, dragStart.range[1]];
    } else if (isDragging === 'right') {
      const newEnd = Math.min(totalPoints, Math.max(dragStart.range[1] + deltaPoints, dragStart.range[0] + minRangeSize));
      newRange = [dragStart.range[0], newEnd];
    } else if (isDragging === 'middle') {
      const rangeSize = dragStart.range[1] - dragStart.range[0];
      let newStart = dragStart.range[0] + deltaPoints;
      let newEnd = dragStart.range[1] + deltaPoints;

      // Limitar dentro de los bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeSize;
      }
      if (newEnd > totalPoints) {
        newEnd = totalPoints;
        newStart = totalPoints - rangeSize;
      }

      newRange = [newStart, newEnd];
    }

    onRangeChange(newRange);
  }, [isDragging, dragStart, totalPoints, onRangeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragStart(null);
  }, []);

  // Agregar event listeners globales durante el drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (data.length < 2) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      {/* Labels de rango */}
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[11px] text-slate-600 font-medium">
          {startLabel}
        </span>
        <span className="text-[11px] text-slate-500">
          {t('forecast_navigator_rango', 'Rango visible')}: {visibleRange[1] - visibleRange[0]} {t('common_dias', 'días')}
        </span>
        <span className="text-[11px] text-slate-600 font-medium">
          {endLabel}
        </span>
      </div>

      {/* Navigator container */}
      <div
        ref={containerRef}
        className="relative h-[44px] rounded-lg overflow-hidden border border-slate-200"
        style={{ backgroundColor: navColors.background }}
      >
        {/* Mini chart de fondo */}
        <div className="absolute inset-0">
          <MiniChart
            data={data}
            color={navColors.line}
            height={44}
          />
        </div>

        {/* Áreas grises (no seleccionadas) - más oscuras con patrón */}
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none"
          style={{
            width: `${leftPercent}%`,
            backgroundColor: 'rgba(71, 85, 105, 0.4)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 6px)'
          }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: `${100 - rightPercent}%`,
            backgroundColor: 'rgba(71, 85, 105, 0.4)',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 6px)'
          }}
        />

        {/* Área de selección */}
        <div
          className="absolute top-0 bottom-0 cursor-move"
          style={{
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            backgroundColor: navColors.selection,
            borderTop: `2px solid ${navColors.border}`,
            borderBottom: `2px solid ${navColors.border}`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'middle')}
        />

        {/* Handle izquierdo - más grande con grip lines */}
        <div
          className="absolute top-0 bottom-0 w-[14px] cursor-ew-resize flex items-center justify-center group z-10"
          style={{
            left: `calc(${leftPercent}% - 7px)`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
        >
          <div
            className="w-[8px] h-[28px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all group-hover:h-[34px] shadow-md border border-white/50"
            style={{ backgroundColor: navColors.handle }}
          >
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
          </div>
        </div>

        {/* Handle derecho - más grande con grip lines */}
        <div
          className="absolute top-0 bottom-0 w-[14px] cursor-ew-resize flex items-center justify-center group z-10"
          style={{
            left: `calc(${rightPercent}% - 7px)`,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        >
          <div
            className="w-[8px] h-[28px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all group-hover:h-[34px] shadow-md border border-white/50"
            style={{ backgroundColor: navColors.handle }}
          >
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
            <div className="w-[4px] h-[1px] bg-white/70 rounded" />
          </div>
        </div>
      </div>

      {/* Quick range buttons */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <button
          onClick={() => onRangeChange([0, totalPoints])}
          className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
            visibleRange[0] === 0 && visibleRange[1] === totalPoints
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
          }`}
        >
          {t('forecast_nav_todo', 'Todo')}
        </button>
        {totalPoints > 30 && (
          <button
            onClick={() => onRangeChange([Math.max(0, totalPoints - 30), totalPoints])}
            className="px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            30D
          </button>
        )}
        {totalPoints > 90 && (
          <button
            onClick={() => onRangeChange([Math.max(0, totalPoints - 90), totalPoints])}
            className="px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            90D
          </button>
        )}
        {totalPoints > 180 && (
          <button
            onClick={() => onRangeChange([Math.max(0, totalPoints - 180), totalPoints])}
            className="px-3 py-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            6M
          </button>
        )}
      </div>
    </div>
  );
};

const ForecastChart = ({
  historico = [],
  predicciones = [],
  titulo = '',
  height = 400,
  showLegend = true,
  showNavigator = true, // Nuevo: mostrar/ocultar navegador
  maxHistoricoDias = 90, // Limitar histórico visible para mejor legibilidad
  simulationMode = false, // Modo simulación para cold start
  safetyStock = null, // Valor de safety stock (solo en simulación)
}) => {
  const { t } = useI18n();

  // Seleccionar paleta de colores según modo
  const activeColors = simulationMode ? {
    prediccion: COLORS_SIMULATION.prediccion,
    intervalo: COLORS_SIMULATION.intervalo,
  } : {
    prediccion: COLORS.prediccion,
    intervalo: COLORS.intervalo,
  };

  // Estado para toggle de zoom en predicción
  const [zoomPrediccion, setZoomPrediccion] = useState(false);

  // Estado del rango visible (para el navigator) - inicializado como null hasta tener datos
  const [visibleRange, setVisibleRange] = useState(null);

  // Preparar TODOS los datos (sin limitación para el navigator)
  const fullData = useMemo(() => {
    const allDates = [];
    const allValues = [];
    const labels = [];

    // Procesar histórico completo
    historico.forEach(h => {
      const fecha = new Date(h.fecha);
      allDates.push(fecha);
      allValues.push({ value: h.cantidad, type: 'historico' });
      labels.push(fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }));
    });

    // Procesar predicciones
    predicciones.forEach(p => {
      const fecha = new Date(p.fecha);
      allDates.push(fecha);
      allValues.push({ value: p.prediccion, type: 'prediccion' });
      labels.push(fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }));
    });

    return { dates: allDates, values: allValues, labels };
  }, [historico, predicciones]);

  // Actualizar rango cuando cambian los datos
  useEffect(() => {
    const total = fullData.dates.length;
    if (total > 0) {
      const defaultStart = Math.max(0, historico.length - maxHistoricoDias);
      setVisibleRange([defaultStart, total]);
    }
  }, [fullData.dates.length, historico.length, maxHistoricoDias]);

  // Rango efectivo para usar en el componente
  const effectiveRange = visibleRange || [0, fullData.dates.length];

  // Preparar datos VISIBLES para MUI X Charts (filtrados por el rango)
  const { xAxisData, series, dateLabels, primarySeriesId, outlierIndices } = useMemo(() => {
    const [startIdx, endIdx] = effectiveRange;

    // Filtrar datos según el rango visible
    const visibleDates = fullData.dates.slice(startIdx, endIdx);
    const visibleValues = fullData.values.slice(startIdx, endIdx);
    const visibleLabels = fullData.labels.slice(startIdx, endIdx);

    const historicoValues = [];
    const prediccionValues = [];
    const limiteSuperior = [];
    const limiteInferior = [];

    visibleValues.forEach((v, i) => {
      if (v.type === 'historico') {
        historicoValues.push(v.value);
        prediccionValues.push(null);
        limiteSuperior.push(null);
        limiteInferior.push(null);
      } else {
        historicoValues.push(null);
        prediccionValues.push(v.value);
        // Buscar los límites en las predicciones originales
        const globalIdx = startIdx + i;
        const predIdx = globalIdx - historico.length;
        if (predIdx >= 0 && predIdx < predicciones.length) {
          const pred = predicciones[predIdx];
          limiteSuperior.push(pred.limiteSuperior || pred.prediccion);
          limiteInferior.push(pred.limiteInferior || pred.prediccion);
        } else {
          limiteSuperior.push(v.value);
          limiteInferior.push(v.value);
        }
      }
    });

    // Calcular outliers usando método IQR (solo para valores históricos visibles)
    let outliers = [];
    const visibleHistorico = visibleValues.filter(v => v.type === 'historico');
    if (visibleHistorico.length >= 10) {
      const sortedValues = [...visibleHistorico].map(h => h.value).sort((a, b) => a - b);
      const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)];
      const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)];
      const iqr = q3 - q1;
      const outlierThreshold = q3 + 1.5 * iqr;
      outliers = visibleValues
        .map((v, i) => v.type === 'historico' && v.value > outlierThreshold ? i : null)
        .filter(i => i !== null);
    }

    // Definir series
    const chartSeries = [];
    let mainSeriesId = null;

    // Contar días de histórico visibles
    const visibleHistoricoDays = visibleValues.filter(v => v.type === 'historico').length;

    // Serie de historico con estilos mejorados
    if (visibleHistoricoDays > 0) {
      mainSeriesId = 'historico';
      chartSeries.push({
        id: 'historico',
        data: historicoValues,
        label: t('forecast_historico', `Historico (${visibleHistoricoDays}d)`),
        color: COLORS.historico,
        curve: 'monotoneX',
        showMark: false,
        connectNulls: false,
        valueFormatter: (value) => {
          if (value === null) return null;
          return `${value.toFixed(1)} unidades`;
        },
      });
    }

    // Contar días de predicción visibles
    const visiblePrediccionDays = visibleValues.filter(v => v.type === 'prediccion').length;

    // Serie de prediccion con estilos destacados
    if (visiblePrediccionDays > 0) {
      if (!mainSeriesId) mainSeriesId = 'prediccion';
      chartSeries.push({
        id: 'prediccion',
        data: prediccionValues,
        label: simulationMode
          ? t('forecast_valor_simulado', 'Valor Simulado')
          : t('forecast_prediccion', 'Prediccion'),
        color: activeColors.prediccion,
        curve: 'monotoneX',
        showMark: false,
        connectNulls: false,
        valueFormatter: (value, { dataIndex }) => {
          if (value === null) return null;
          const sup = limiteSuperior[dataIndex];
          const inf = limiteInferior[dataIndex];
          const label = simulationMode
            ? t('forecast_valor_simulado', 'Valor Simulado')
            : t('forecast_prediccion', 'Prediccion');
          if (sup && inf && sup !== inf) {
            const intervalo = ((sup - inf) / 2).toFixed(1);
            return `${label}: ${value.toFixed(1)} ±${intervalo}`;
          }
          return `${label}: ${value.toFixed(1)} unidades`;
        },
      });

      // Intervalo de confianza mejorado
      const tieneIntervalo = predicciones.some(p => p.limiteInferior !== undefined);
      if (tieneIntervalo) {
        chartSeries.push({
          id: 'limiteSuperior',
          data: limiteSuperior,
          label: t('forecast_limite_superior', 'Limite Superior'),
          color: activeColors.intervalo,
          area: true,
          showMark: false,
          connectNulls: false,
          stack: 'intervalo',
          curve: 'monotoneX',
        });

        chartSeries.push({
          id: 'limiteInferior',
          data: limiteInferior,
          label: t('forecast_limite_inferior', 'Limite Inferior'),
          color: 'transparent',
          area: true,
          showMark: false,
          connectNulls: false,
          stack: 'intervalo',
          curve: 'monotoneX',
        });
      }
    }

    return {
      xAxisData: visibleDates,
      series: chartSeries,
      dateLabels: visibleLabels,
      primarySeriesId: mainSeriesId,
      outlierIndices: outliers,
    };
  }, [effectiveRange, fullData, historico, predicciones, t, simulationMode, activeColors]);

  // Calcular rango Y dinámico para zoom
  const yAxisConfig = useMemo(() => {
    if (zoomPrediccion && predicciones.length > 0) {
      const maxPred = Math.max(...predicciones.map(p => p.limiteSuperior || p.prediccion));
      const minPred = Math.min(...predicciones.map(p => p.limiteInferior || p.prediccion));
      const padding = (maxPred - minPred) * 0.2 || maxPred * 0.2;
      return {
        min: Math.max(0, minPred - padding),
        max: maxPred + padding
      };
    }
    return {}; // Escala automática
  }, [zoomPrediccion, predicciones]);

  // Handler para cambios en el rango del navigator
  const handleRangeChange = useCallback((newRange) => {
    setVisibleRange(newRange);
  }, []);

  // Estado vacio
  if (historico.length === 0 && predicciones.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300"
        style={{ height }}
      >
        <p className="text-slate-500">{t('forecast_sin_datos', 'Sin datos para mostrar')}</p>
      </div>
    );
  }

  // Decidir si mostrar el navigator (solo si hay suficientes datos)
  const shouldShowNavigator = showNavigator && fullData.dates.length > 30;

  return (
    <div className="w-full bg-white rounded-lg p-4">
      {/* Header con título y controles */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {titulo && (
            <h3 className="text-lg font-semibold text-slate-900">
              {titulo || t('forecast_grafico_titulo', 'Pronostico de Demanda')}
            </h3>
          )}
          {simulationMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {t('forecast_modo_simulacion', 'Simulación')}
            </span>
          )}
        </div>

        {/* Toggle de zoom - solo si hay predicciones */}
        {predicciones.length > 0 && (
          <button
            onClick={() => setZoomPrediccion(!zoomPrediccion)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
              ${zoomPrediccion
                ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }
            `}
            title={zoomPrediccion
              ? t('forecast_zoom_ver_todo', 'Ver escala completa')
              : t('forecast_zoom_prediccion', 'Zoom en predicción')
            }
          >
            {zoomPrediccion
              ? t('forecast_ver_todo', 'Ver Todo')
              : t('forecast_zoom', 'Zoom Predicción')
            }
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3">
        {simulationMode ? (
          <>
            {t('forecast_simulation_hint', 'Datos generados sintéticamente basados en parámetros ingresados')}
            {safetyStock !== null && (
              <span className="ml-2 text-amber-600 font-medium">
                • {t('forecast_safety_stock', 'Stock de Seguridad')}: {safetyStock.toFixed(1)} unid.
              </span>
            )}
          </>
        ) : (
          <>
            {t('forecast_brush_hint', 'Arrastra sobre el gráfico para comparar valores entre dos puntos')}
            {outlierIndices.length > 0 && (
              <span className="ml-2 text-amber-600">
                • {outlierIndices.length} {t('forecast_outliers', 'valores atípicos detectados')}
              </span>
            )}
          </>
        )}
      </p>

      <LineChart
        xAxis={[{
          data: xAxisData,
          scaleType: 'time',
          valueFormatter: (date, context) => {
            // Formato DD/MM/YY para tooltip, DD mes para eje
            if (context.location === 'tooltip') {
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = String(date.getFullYear()).slice(-2);
              return `${day}/${month}/${year}`;
            }
            return date.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
            });
          },
        }]}
        yAxis={[{
          ...yAxisConfig,
        }]}
        series={series}
        height={shouldShowNavigator ? height - 80 : height}
        margin={{ top: 20, bottom: 30, left: 50, right: 20 }}
        grid={{ vertical: true, horizontal: true }}
        slotProps={{
          legend: showLegend ? {
            direction: 'horizontal',
            position: { vertical: 'top', horizontal: 'end' },
            padding: 0,
          } : { hidden: true },
        }}
        sx={{
          // Estilos personalizados para la grilla
          '& .MuiChartsGrid-line': {
            stroke: COLORS.grid,
            strokeDasharray: '3 3',
          },
          // Aumentar grosor de líneas
          '& .MuiLineElement-root': {
            strokeWidth: 2,
          },
          // Línea de predicción más gruesa
          '& .MuiLineElement-series-prediccion': {
            strokeWidth: 2.5,
            // Línea punteada en modo simulación
            ...(simulationMode && {
              strokeDasharray: '8 4',
            }),
          },
        }}
        experimentalFeatures={{ brush: true }}
      >
        {primarySeriesId && (
          <CustomBrushOverlay seriesId={primarySeriesId} dateLabels={dateLabels} />
        )}
      </LineChart>

      {/* Navigator / Time Range Selector */}
      {shouldShowNavigator && (
        <TimeRangeNavigator
          data={fullData.values}
          visibleRange={effectiveRange}
          onRangeChange={handleRangeChange}
          simulationMode={simulationMode}
          dateLabels={fullData.labels}
        />
      )}
    </div>
  );
};

export default ForecastChart;
