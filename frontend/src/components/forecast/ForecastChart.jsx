/**
 * ForecastChart - Grafico de prediccion de demanda con MUI X Charts
 *
 * Muestra historico + prediccion con intervalos de confianza
 */

import React, { useMemo } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { useI18n } from '../../context/i18n';

// Colores MUI oficial
const COLORS = {
  historico: '#1976d2',      // MUI Blue 700
  prediccion: '#2e7d32',     // MUI Green 800
  intervalo: 'rgba(46, 125, 50, 0.15)', // Green con transparencia
};

const ForecastChart = ({
  historico = [],
  predicciones = [],
  titulo = '',
  height = 400,
  showLegend = true,
}) => {
  const { t } = useI18n();

  // Preparar datos para MUI X Charts
  const { xAxisData, series } = useMemo(() => {
    const allDates = [];
    const historicoValues = [];
    const prediccionValues = [];
    const limiteSuperior = [];
    const limiteInferior = [];

    // Procesar historico
    historico.forEach(h => {
      const fecha = new Date(h.fecha);
      allDates.push(fecha);
      historicoValues.push(h.cantidad);
      prediccionValues.push(null);
      limiteSuperior.push(null);
      limiteInferior.push(null);
    });

    // Procesar predicciones
    predicciones.forEach(p => {
      const fecha = new Date(p.fecha);
      allDates.push(fecha);
      historicoValues.push(null);
      prediccionValues.push(p.prediccion);
      limiteSuperior.push(p.limiteSuperior || p.prediccion);
      limiteInferior.push(p.limiteInferior || p.prediccion);
    });

    // Definir series
    const chartSeries = [];

    // Serie de historico
    if (historico.length > 0) {
      chartSeries.push({
        data: historicoValues,
        label: t('forecast_historico', 'Historico'),
        color: COLORS.historico,
        showMark: true,
        connectNulls: false,
      });
    }

    // Serie de prediccion
    if (predicciones.length > 0) {
      chartSeries.push({
        data: prediccionValues,
        label: t('forecast_prediccion', 'Prediccion'),
        color: COLORS.prediccion,
        showMark: true,
        connectNulls: false,
      });

      // Intervalo de confianza - Limite superior (area)
      const tieneIntervalo = predicciones.some(p => p.limiteInferior !== undefined);
      if (tieneIntervalo) {
        chartSeries.push({
          data: limiteSuperior,
          label: t('forecast_limite_superior', 'Limite Superior'),
          color: COLORS.intervalo,
          area: true,
          showMark: false,
          connectNulls: false,
          stack: 'intervalo',
        });

        chartSeries.push({
          data: limiteInferior,
          label: t('forecast_limite_inferior', 'Limite Inferior'),
          color: 'transparent',
          area: true,
          showMark: false,
          connectNulls: false,
          stack: 'intervalo',
        });
      }
    }

    return {
      xAxisData: allDates,
      series: chartSeries,
    };
  }, [historico, predicciones, t]);

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

  return (
    <div className="w-full bg-white rounded-lg p-4">
      {titulo && (
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {titulo || t('forecast_grafico_titulo', 'Pronostico de Demanda')}
        </h3>
      )}
      <LineChart
        xAxis={[{
          data: xAxisData,
          scaleType: 'time',
          valueFormatter: (date) => date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
          }),
        }]}
        series={series}
        height={height}
        margin={{ top: 20, bottom: 30, left: 50, right: 20 }}
        grid={{ vertical: true, horizontal: true }}
        slotProps={{
          legend: showLegend ? {
            direction: 'row',
            position: { vertical: 'top', horizontal: 'right' },
            padding: 0,
            itemMarkWidth: 10,
            itemMarkHeight: 10,
          } : { hidden: true },
        }}
      />
    </div>
  );
};

export default ForecastChart;
