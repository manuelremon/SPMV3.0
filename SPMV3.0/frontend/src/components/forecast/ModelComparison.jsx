/**
 * ModelComparison - Comparacion de modelos de forecast con MUI X Charts
 *
 * Muestra ranking y metricas comparativas de multiples modelos
 */

import React, { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { useI18n } from '../../context/i18n';
import { Button } from '../ui/Button';

const MODELOS_NOMBRES = {
  random_forest: 'Random Forest',
  gradient_boosting: 'Gradient Boosting',
  linear: 'Regresion Lineal',
  xgboost: 'XGBoost',
  prophet: 'Prophet',
  arima: 'ARIMA'
};

// Colores MUI oficial
const COLORS = {
  mejor: '#2e7d32',     // MUI Green 800
  normal: '#1976d2',    // MUI Blue 700
};

const ModelComparison = ({
  data,
  loading = false,
  onSelectModel,
  className = ''
}) => {
  const { t } = useI18n();

  // Preparar datos del grafico
  const chartData = useMemo(() => {
    if (!data?.ranking) return { labels: [], values: [], colors: [] };

    const labels = data.ranking.map(r => MODELOS_NOMBRES[r.modelo] || r.modelo);
    const values = data.ranking.map(r => r.mae || 0);
    const colors = data.ranking.map(r =>
      r.modelo === data.mejor_modelo ? COLORS.mejor : COLORS.normal
    );

    return { labels, values, colors };
  }, [data]);

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-slate-100 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { ranking, mejor_modelo, recomendacion } = data;

  return (
    <div className={`p-6 bg-white rounded-lg border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {t('forecast_comparacion_modelos', 'Comparacion de Modelos')}
        </h3>
        {mejor_modelo && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            Mejor: {MODELOS_NOMBRES[mejor_modelo] || mejor_modelo}
          </span>
        )}
      </div>

      {/* Recomendacion */}
      {recomendacion && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">{recomendacion}</p>
        </div>
      )}

      {/* Grafico de barras */}
      {ranking && ranking.length > 0 && (
        <div className="mb-4">
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: chartData.labels,
            }]}
            series={[{
              data: chartData.values,
              color: COLORS.normal,
              valueFormatter: (value) => value?.toFixed(2) || '-',
            }]}
            height={280}
            margin={{ top: 20, bottom: 60, left: 50, right: 20 }}
            slotProps={{
              legend: { hidden: true },
            }}
            grid={{ horizontal: true }}
            barLabel="value"
          />
        </div>
      )}

      {/* Tabla de ranking */}
      {ranking && ranking.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Modelo</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">MAE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">RMSE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">R2</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Accion</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr
                  key={r.modelo}
                  className={`border-b border-slate-100 ${
                    r.modelo === mejor_modelo ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : r.posicion}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {MODELOS_NOMBRES[r.modelo] || r.modelo}
                    {r.modelo === mejor_modelo && (
                      <span className="ml-2 text-xs text-green-600">(Recomendado)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {r.mae?.toFixed(2)}
                    {r.mae_std && (
                      <span className="text-slate-400 text-xs ml-1">
                        +/-{r.mae_std.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.rmse?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.r2?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-center">
                    {onSelectModel && (
                      <Button
                        onClick={() => onSelectModel(r.modelo)}
                        variant="outline"
                        size="xs"
                      >
                        Usar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ModelComparison;
