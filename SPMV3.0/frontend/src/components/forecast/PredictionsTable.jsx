/**
 * PredictionsTable - Tabla de predicciones con MUI DataGrid
 *
 * Muestra las predicciones en formato tabular con filtrado y ordenamiento
 */

import React, { useMemo } from 'react';
import { useI18n } from '../../context/i18n';
import { SPMDataGrid } from '../ui/SPMDataGrid';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const PredictionsTable = ({
  predicciones = [],
  loading = false,
  showIntervalos = true,
  className = ''
}) => {
  const { t } = useI18n();

  // Convertir predicciones a filas con ID
  const rows = useMemo(() => {
    return predicciones.map((p, index) => {
      const fecha = new Date(p.fecha);
      const diaSemana = fecha.toLocaleDateString('es', { weekday: 'short' });
      const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;

      // Calcular tendencia comparando con predicción anterior
      let tendencia = 'flat';
      if (index > 0) {
        const anterior = predicciones[index - 1].prediccion;
        const diff = p.prediccion - anterior;
        if (diff > 0.5) tendencia = 'up';
        else if (diff < -0.5) tendencia = 'down';
      }

      // Calcular rango (incertidumbre)
      const rango = p.limiteSuperior && p.limiteInferior
        ? p.limiteSuperior - p.limiteInferior
        : 0;

      return {
        id: index,
        fecha: fecha,
        fechaFormateada: fecha.toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        prediccion: p.prediccion,
        limiteInferior: p.limiteInferior,
        limiteSuperior: p.limiteSuperior,
        diaSemana,
        esFinDeSemana,
        tendencia,
        rango,
        semana: Math.ceil((index + 1) / 7)
      };
    });
  }, [predicciones]);

  // Definir columnas
  const columns = useMemo(() => {
    const cols = [
      {
        field: 'fechaFormateada',
        headerName: t('forecast_fecha', 'Fecha'),
        width: 130,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{params.value}</span>
            <span className={`text-[10px] ${params.row.esFinDeSemana ? 'text-purple-600' : 'text-slate-400'}`}>
              {params.row.diaSemana}
            </span>
          </div>
        ),
      },
      {
        field: 'prediccion',
        headerName: t('forecast_prediccion', 'Prediccion'),
        width: 130,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 text-base">
              {params.value?.toFixed(1) || '-'}
            </span>
            {params.row.tendencia === 'up' && (
              <TrendingUpIcon sx={{ fontSize: 16, color: '#22c55e' }} />
            )}
            {params.row.tendencia === 'down' && (
              <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />
            )}
            {params.row.tendencia === 'flat' && (
              <TrendingFlatIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
            )}
          </div>
        ),
      },
    ];

    if (showIntervalos) {
      cols.push(
        {
          field: 'limiteInferior',
          headerName: t('forecast_minimo', 'Min'),
          width: 90,
          type: 'number',
          align: 'center',
          headerAlign: 'center',
          renderCell: (params) => (
            <span className="text-red-600 font-medium text-sm">
              {params.value?.toFixed(1) || '-'}
            </span>
          ),
        },
        {
          field: 'limiteSuperior',
          headerName: t('forecast_maximo', 'Max'),
          width: 90,
          type: 'number',
          align: 'center',
          headerAlign: 'center',
          renderCell: (params) => (
            <span className="text-green-600 font-medium text-sm">
              {params.value?.toFixed(1) || '-'}
            </span>
          ),
        },
        {
          field: 'rango',
          headerName: 'Rango',
          width: 100,
          type: 'number',
          align: 'center',
          headerAlign: 'center',
          renderCell: (params) => {
            const rango = params.value || 0;
            const colorClass = rango < 1 ? 'bg-green-100 text-green-700' :
                              rango < 2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700';
            return (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                ±{(rango / 2).toFixed(1)}
              </span>
            );
          },
        }
      );
    }

    cols.push({
      field: 'semana',
      headerName: 'Sem',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-medium">
          S{params.value}
        </span>
      ),
    });

    return cols;
  }, [showIntervalos, t]);

  // Calcular resumen
  const resumen = useMemo(() => {
    if (!predicciones.length) return null;
    const total = predicciones.reduce((sum, p) => sum + (p.prediccion || 0), 0);
    const promedio = total / predicciones.length;
    const maximo = Math.max(...predicciones.map(p => p.prediccion || 0));
    return { total, promedio, maximo };
  }, [predicciones]);

  if (loading) {
    return (
      <div className={`p-4 bg-white rounded-lg border ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!predicciones || predicciones.length === 0) {
    return (
      <div className={`p-6 bg-white rounded-lg border text-center ${className}`}>
        <p className="text-slate-500">{t('forecast_sin_predicciones', 'No hay predicciones disponibles')}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header mejorado */}
      <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              {t('forecast_tabla_predicciones', 'Predicciones Detalladas')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {predicciones.length} días ({Math.ceil(predicciones.length / 7)} semanas)
            </p>
          </div>
          {/* Mini resumen en header */}
          {resumen && (
            <div className="flex gap-4 text-sm">
              <div className="text-center px-3 py-1 bg-white rounded-lg border">
                <div className="text-xs text-slate-500">Promedio</div>
                <div className="font-bold text-blue-600">{resumen.promedio.toFixed(1)}</div>
              </div>
              <div className="text-center px-3 py-1 bg-white rounded-lg border">
                <div className="text-xs text-slate-500">Máximo</div>
                <div className="font-bold text-green-600">{resumen.maximo.toFixed(1)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DataGrid */}
      <SPMDataGrid
        rows={rows}
        columns={columns}
        height={420}
        density="compact"
        showToolbar={true}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          sorting: {
            sortModel: [{ field: 'fecha', sort: 'asc' }],
          },
          pagination: {
            paginationModel: { pageSize: 10 }
          }
        }}
        sx={{
          '& .MuiDataGrid-row:nth-of-type(even)': {
            backgroundColor: '#f8fafc',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#eff6ff',
          },
          '& .MuiDataGrid-cell': {
            borderColor: '#e2e8f0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f1f5f9',
            borderColor: '#e2e8f0',
          }
        }}
      />

      {/* Resumen detallado */}
      {resumen && (
        <div className="p-4 border-t bg-gradient-to-r from-slate-50 to-green-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-xs font-bold">Σ</span>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Periodo</div>
                <div className="font-bold text-slate-800">{resumen.total.toFixed(0)} uds</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600 text-xs font-bold">μ</span>
              </div>
              <div>
                <div className="text-xs text-slate-500">Promedio/Día</div>
                <div className="font-bold text-slate-800">{resumen.promedio.toFixed(1)} uds</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />
              </div>
              <div>
                <div className="text-xs text-slate-500">Pico Máximo</div>
                <div className="font-bold text-slate-800">{resumen.maximo.toFixed(1)} uds</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 text-xs font-bold">7d</span>
              </div>
              <div>
                <div className="text-xs text-slate-500">Prom/Semana</div>
                <div className="font-bold text-slate-800">{(resumen.promedio * 7).toFixed(0)} uds</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionsTable;
