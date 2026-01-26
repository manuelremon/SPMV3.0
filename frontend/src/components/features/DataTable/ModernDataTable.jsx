import React from "react";
import { SPMDataGrid } from "../../ui/SPMDataGrid";
import { adaptLegacyColumns } from "./columns.jsx";
import { Inbox } from "../../ui/Icons";

/**
 * ModernDataTable - Componente de tabla empresarial con MUI DataGrid
 *
 * Características:
 * - Basado en MUI DataGrid Community
 * - Ordenamiento, filtrado y paginación integrados
 * - Toolbar con búsqueda rápida
 * - Exportación a CSV
 * - Compatible con API del DataTable legacy
 *
 * @param {Object} props
 * @param {Array<{key: string, header: string, render?, sortAccessor?, align?}>} props.columns - Definición de columnas
 * @param {Array<object>} props.rows - Datos a mostrar
 * @param {string | React.ReactNode} [props.emptyMessage="Sin datos"] - Mensaje cuando no hay datos
 * @param {string} [props.className] - Clases adicionales para el contenedor
 * @param {'compact' | 'standard' | 'comfortable'} [props.density='compact'] - Densidad de la tabla
 * @param {number} [props.height=400] - Altura del DataGrid
 * @param {boolean} [props.showToolbar=true] - Mostrar toolbar con filtros
 * @param {Function} [props.getRowId] - Función para obtener ID si no es 'id'
 * @param {boolean} [props.loading=false] - Estado de carga
 * @param {Array<number>} [props.pageSizeOptions] - Opciones de tamaño de página
 */
export function ModernDataTable({
  columns = [],
  rows = [],
  emptyMessage = "Sin datos",
  className = "",
  density = "compact",
  height = 400,
  showToolbar = true,
  getRowId,
  loading = false,
  pageSizeOptions = [10, 25, 50],
}) {
  // Adaptar columnas legacy al formato MUI DataGrid
  const muiColumns = React.useMemo(
    () => adaptLegacyColumns(columns),
    [columns]
  );

  // Asegurar que cada fila tenga un ID
  const rowsWithId = React.useMemo(() => {
    return rows.map((row, index) => {
      if (row.id !== undefined) return row;
      return { ...row, id: index };
    });
  }, [rows]);

  // Mapeo de densidad: 'cozy' → 'comfortable' para compatibilidad
  const mappedDensity = density === 'cozy' ? 'comfortable' : density;

  // Empty state personalizado
  if (rows.length === 0 && !loading) {
    // Si emptyMessage es un elemento React, renderizarlo directamente
    if (React.isValidElement(emptyMessage)) {
      return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
        <div className="w-12 h-12 rounded-full bg-[var(--bg-soft)] flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6 text-[var(--fg-muted)]" />
        </div>
        <div className="text-[var(--fg-muted)] text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={className} role="region" aria-label="Tabla de datos" data-density={density}>
      <SPMDataGrid
        rows={rowsWithId}
        columns={muiColumns}
        loading={loading}
        height={height}
        density={mappedDensity}
        showToolbar={showToolbar}
        getRowId={getRowId}
        emptyMessage={typeof emptyMessage === 'string' ? emptyMessage : 'Sin datos'}
        pageSizeOptions={pageSizeOptions}
        disableRowSelectionOnClick
      />
    </div>
  );
}

export default ModernDataTable;
