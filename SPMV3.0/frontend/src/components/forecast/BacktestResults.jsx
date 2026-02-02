/**
 * BacktestResults - Resultados de backtesting con MUI DataGrid y MUI X Charts
 *
 * Muestra metricas y graficos de validacion walk-forward
 */

import React, { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { useI18n } from '../../context/i18n';
import { SPMDataGrid } from '../ui/SPMDataGrid';

// Colores MUI oficial
const COLORS = {
  mae: '#1976d2',      // MUI Blue 700
  rmse: '#9c27b0',     // MUI Purple 500
};

const BacktestResults = ({ data, loading = false, className = '' }) => {
  const { t } = useI18n();

  // Preparar filas para el DataGrid
  const rows = useMemo(() => {
    if (!data?.steps) return [];
    return data.steps.map((step, i) => ({
      id: i,
      paso: i + 1,
      fecha_corte: new Date(step.fecha_corte),
      n_train: step.n_train,
      n_test: step.n_test,
      mae: step.mae,
      r2: step.r2,
    }));
  }, [data?.steps]);

  // Definir columnas
  const columns = useMemo(() => [
    {
      field: 'paso',
      headerName: 'Paso',
      width: 80,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'fecha_corte',
      headerName: 'Fecha Corte',
      width: 130,
      type: 'date',
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value) => {
        if (!value) return '-';
        return value.toLocaleDateString('es-ES');
      },
    },
    {
      field: 'n_train',
      headerName: 'Train',
      width: 90,
      type: 'number',
      align: 'right',
      headerAlign: 'center',
    },
    {
      field: 'n_test',
      headerName: 'Test',
      width: 90,
      type: 'number',
      align: 'right',
      headerAlign: 'center',
    },
    {
      field: 'mae',
      headerName: 'MAE',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'center',
      valueFormatter: (value) => value?.toFixed(2) || '-',
      renderCell: (params) => (
        <span className="font-medium">{params.value?.toFixed(2) || '-'}</span>
      ),
    },
    {
      field: 'r2',
      headerName: 'R2',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'center',
      valueFormatter: (value) => value?.toFixed(4) || '-',
      renderCell: (params) => (
        <span className="font-medium">{params.value?.toFixed(4) || '-'}</span>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { metricas_agregadas, steps, es_estable } = data;

  // Datos para el grafico de metricas por paso (MUI X Charts)
  const chartData = useMemo(() => {
    if (!steps || steps.length === 0) return { labels: [], mae: [], rmse: [] };
    return {
      labels: steps.map((_, i) => `Paso ${i + 1}`),
      mae: steps.map(s => s.mae || 0),
      rmse: steps.map(s => s.rmse || 0),
    };
  }, [steps]);

  return (
    <div className={`p-6 bg-white rounded-lg border ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {t('forecast_backtest_resultados', 'Resultados de Backtesting')}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          es_estable
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {es_estable
            ? t('forecast_modelo_estable', 'Modelo Estable')
            : t('forecast_modelo_variable', 'Modelo Variable')
          }
        </span>
      </div>

      {/* Metricas resumidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">MAE Promedio</p>
          <p className="text-xl font-bold text-blue-700">
            {metricas_agregadas?.mae_mean?.toFixed(2) || '-'}
          </p>
          <p className="text-xs text-blue-500">
            +/-{metricas_agregadas?.mae_std?.toFixed(2) || '0'}
          </p>
        </div>

        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 font-medium">RMSE Promedio</p>
          <p className="text-xl font-bold text-purple-700">
            {metricas_agregadas?.rmse_mean?.toFixed(2) || '-'}
          </p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium">R2 Promedio</p>
          <p className="text-xl font-bold text-green-700">
            {metricas_agregadas?.r2_mean?.toFixed(4) || '-'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 font-medium">Pasos Exitosos</p>
          <p className="text-xl font-bold text-slate-700">
            {metricas_agregadas?.n_pasos_exitosos || 0}
          </p>
        </div>
      </div>

      {/* Grafico de metricas por paso - MUI X Charts */}
      {steps && steps.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">
            {t('forecast_backtest_metricas_paso', 'Metricas por Paso de Validacion')}
          </h4>
          <BarChart
            xAxis={[{
              scaleType: 'band',
              data: chartData.labels,
            }]}
            series={[
              {
                data: chartData.mae,
                label: 'MAE',
                color: COLORS.mae,
                valueFormatter: (value) => value?.toFixed(2) || '-',
              },
              {
                data: chartData.rmse,
                label: 'RMSE',
                color: COLORS.rmse,
                valueFormatter: (value) => value?.toFixed(2) || '-',
              },
            ]}
            height={280}
            margin={{ top: 20, bottom: 40, left: 50, right: 20 }}
            slotProps={{
              legend: {
                direction: 'row',
                position: { vertical: 'top', horizontal: 'right' },
                padding: 0,
                itemMarkWidth: 10,
                itemMarkHeight: 10,
              },
            }}
            grid={{ horizontal: true }}
          />
        </div>
      )}

      {/* Tabla de detalle por paso con DataGrid */}
      {rows.length > 0 && (
        <div className="mt-4">
          <SPMDataGrid
            rows={rows}
            columns={columns}
            height={300}
            density="compact"
            showToolbar={false}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 5 }
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BacktestResults;
