/**
 * PatternCharts - Graficos de patrones de demanda con MUI X Charts
 *
 * Muestra patrones semanales y mensuales
 */

import React, { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { useI18n } from '../../context/i18n';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Colores MUI oficial
const COLORS = {
  semanal: '#1976d2',      // MUI Blue 700
  finDeSemana: '#2e7d32',  // MUI Green 800
  mensual: '#9c27b0',      // MUI Purple 500
};

const PatternCharts = ({
  patronSemanal = null,
  patronMensual = null,
  loading = false,
  className = ''
}) => {
  const { t } = useI18n();

  // Preparar datos semanales
  const semanalData = useMemo(() => {
    if (!patronSemanal) return { values: [], colors: [] };
    const values = Object.values(patronSemanal);
    const colors = DIAS_SEMANA.map((_, i) =>
      i >= 5 ? COLORS.finDeSemana : COLORS.semanal
    );
    return { values, colors };
  }, [patronSemanal]);

  // Preparar datos mensuales
  const mensualData = useMemo(() => {
    if (!patronMensual) return [];
    return Object.values(patronMensual);
  }, [patronMensual]);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {[1, 2].map(i => (
          <div key={i} className="p-4 bg-white rounded-lg border animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-32 mb-3"></div>
            <div className="h-48 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* Patron semanal */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          {t('forecast_patron_semanal', 'Patron Semanal')}
        </h3>
        {patronSemanal ? (
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: DIAS_SEMANA,
            }]}
            series={[{
              data: semanalData.values,
              color: COLORS.semanal,
              valueFormatter: (value) => value?.toFixed(1) || '-',
            }]}
            height={220}
            margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
            slotProps={{
              legend: { hidden: true },
            }}
            grid={{ horizontal: true }}
            barLabel="value"
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400">
            {t('forecast_sin_patron_semanal', 'Sin datos de patron semanal')}
          </div>
        )}
      </div>

      {/* Patron mensual */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          {t('forecast_patron_mensual', 'Patron Mensual')}
        </h3>
        {patronMensual ? (
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: MESES,
            }]}
            series={[{
              data: mensualData,
              color: COLORS.mensual,
              valueFormatter: (value) => value?.toFixed(1) || '-',
            }]}
            height={220}
            margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
            slotProps={{
              legend: { hidden: true },
            }}
            grid={{ horizontal: true }}
            barLabel="value"
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400">
            {t('forecast_sin_patron_mensual', 'Sin datos de patron mensual')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternCharts;
