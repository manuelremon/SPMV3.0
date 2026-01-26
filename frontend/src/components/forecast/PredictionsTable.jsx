/**
 * PredictionsTable - Tabla de predicciones con MUI DataGrid
 *
 * Muestra las predicciones en formato tabular con filtrado y ordenamiento
 */

import React, { useMemo } from 'react';
import { useI18n } from '../../context/i18n';
import { SPMDataGrid } from '../ui/SPMDataGrid';

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
        esFinDeSemana
      };
    });
  }, [predicciones]);

  // Definir columnas
  const columns = useMemo(() => {
    const cols = [
      {
        field: 'fechaFormateada',
        headerName: t('forecast_fecha', 'Fecha'),
        width: 140,
        align: 'left',
        headerAlign: 'center',
      },
      {
        field: 'prediccion',
        headerName: t('forecast_prediccion', 'Prediccion'),
        width: 120,
        type: 'number',
        align: 'right',
        headerAlign: 'center',
        valueFormatter: (value) => value?.toFixed(1) || '-',
        renderCell: (params) => (
          <span className="font-medium text-blue-600">
            {params.value?.toFixed(1) || '-'}
          </span>
        ),
      },
    ];

    if (showIntervalos) {
      cols.push(
        {
          field: 'limiteInferior',
          headerName: t('forecast_minimo', 'Minimo'),
          width: 100,
          type: 'number',
          align: 'right',
          headerAlign: 'center',
          valueFormatter: (value) => value?.toFixed(1) || '-',
        },
        {
          field: 'limiteSuperior',
          headerName: t('forecast_maximo', 'Maximo'),
          width: 100,
          type: 'number',
          align: 'right',
          headerAlign: 'center',
          valueFormatter: (value) => value?.toFixed(1) || '-',
        }
      );
    }

    cols.push({
      field: 'diaSemana',
      headerName: t('forecast_dia_semana', 'Dia'),
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <span className={`px-2 py-0.5 rounded text-xs ${
          params.row.esFinDeSemana
            ? 'bg-purple-100 text-purple-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {params.value}
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
    <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-semibold text-slate-900">
          {t('forecast_tabla_predicciones', 'Predicciones Detalladas')}
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {predicciones.length} {t('forecast_dias', 'dias')}
        </p>
      </div>

      {/* DataGrid */}
      <SPMDataGrid
        rows={rows}
        columns={columns}
        height={380}
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
      />

      {/* Resumen */}
      {resumen && (
        <div className="p-4 border-t bg-slate-50 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Total:</span>
            <span className="ml-2 font-medium text-slate-900">
              {resumen.total.toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Promedio:</span>
            <span className="ml-2 font-medium text-slate-900">
              {resumen.promedio.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Maximo:</span>
            <span className="ml-2 font-medium text-slate-900">
              {resumen.maximo.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionsTable;
