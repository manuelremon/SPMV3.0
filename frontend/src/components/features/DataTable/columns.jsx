/**
 * Adaptador de columnas legacy → MUI DataGrid
 *
 * Convierte el formato de columnas del DataTable legacy al formato
 * requerido por MUI DataGrid, manteniendo compatibilidad total.
 */

/**
 * Adapta columnas del formato legacy al formato MUI DataGrid
 *
 * @param {Array<{
 *   key: string,
 *   header: string,
 *   render?: (row: object) => React.ReactNode,
 *   sortAccessor?: (row: object) => any,
 *   align?: 'left' | 'center' | 'right',
 *   width?: number,
 *   minWidth?: number,
 *   maxWidth?: number,
 *   flex?: number,
 *   sortable?: boolean,
 *   filterable?: boolean,
 *   type?: 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'singleSelect' | 'actions'
 * }>} legacyColumns - Columnas en formato legacy
 *
 * @returns {Array<GridColDef>} - Columnas en formato MUI DataGrid
 *
 * @example
 * const muiColumns = adaptLegacyColumns([
 *   { key: 'id', header: 'ID' },
 *   { key: 'nombre', header: 'Nombre', render: (row) => <strong>{row.nombre}</strong> },
 *   { key: 'fecha', header: 'Fecha', sortAccessor: (row) => new Date(row.fecha) },
 * ]);
 */
export function adaptLegacyColumns(legacyColumns) {
  return legacyColumns.map((col, index) => {
    // Determinar minWidth basado en el tipo de columna
    const getMinWidth = () => {
      if (col.minWidth) return col.minWidth;
      const key = col.key?.toLowerCase() || '';
      if (key === 'id') return 70;
      if (key.includes('fecha') || key.includes('date')) return 110;
      if (key.includes('estado') || key.includes('status')) return 100;
      if (key.includes('monto') || key.includes('total') || key.includes('precio')) return 120;
      if (key.includes('items') || key.includes('cantidad')) return 80;
      if (key.includes('criticidad') || key.includes('prioridad')) return 100;
      return 100;
    };

    // Determinar flex basado en el tipo de columna
    const getFlex = () => {
      if (col.flex !== undefined) return col.flex;
      if (col.width) return undefined; // Si tiene width fijo, no usar flex
      const key = col.key?.toLowerCase() || '';
      // Columnas que deben expandirse más
      if (key.includes('nombre') || key.includes('descripcion') || key.includes('solicitante') || key.includes('planificador')) return 1.5;
      if (key.includes('sector') || key.includes('centro') || key.includes('almacen')) return 1;
      // Columnas compactas no necesitan flex
      if (key === 'id' || key.includes('items') || key.includes('cantidad')) return 0.5;
      return 1;
    };

    const colDef = {
      // Campo identificador (requerido por MUI DataGrid)
      field: col.key,

      // Header text
      headerName: col.header,

      // Alineación (headers siempre centrados, contenido según columna)
      align: col.align || 'center',
      headerAlign: 'center',

      // Dimensiones - flex para responsividad automática
      width: col.width,
      minWidth: getMinWidth(),
      maxWidth: col.maxWidth,
      flex: getFlex(),

      // Tipo de columna
      type: col.type || 'string',

      // Ordenamiento y filtrado
      sortable: col.sortable !== false && !!col.sortAccessor,
      filterable: col.filterable !== false,

      // Resizable
      resizable: true,
    };

    // Cell renderer personalizado
    if (col.render) {
      colDef.renderCell = (params) => col.render(params.row);
    }

    // Value getter para ordenamiento personalizado
    if (col.sortAccessor) {
      colDef.valueGetter = (value, row) => {
        return col.sortAccessor(row);
      };
      colDef.sortable = true;
    }

    // Comparador personalizado si se provee sortAccessor
    if (col.sortAccessor) {
      colDef.sortComparator = (v1, v2) => {
        if (v1 == null && v2 == null) return 0;
        if (v1 == null) return 1;
        if (v2 == null) return -1;
        return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
      };
    }

    return colDef;
  });
}

/**
 * Obtiene la clase de alineación para una columna (para compatibilidad)
 *
 * @param {ColumnDef} column - Definición de columna
 * @returns {string} - Clase Tailwind de alineación
 */
export function getAlignmentClass(column) {
  const align = column.columnDef?.meta?.align || column.align || 'center';
  return {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-center';
}

/**
 * Crea columnas de acciones para MUI DataGrid
 *
 * @param {Object} options
 * @param {Function} options.getActions - Función que retorna array de acciones
 * @param {string} [options.headerName='Acciones'] - Título de la columna
 * @param {number} [options.width=100] - Ancho de la columna
 *
 * @returns {GridColDef} - Definición de columna de acciones
 *
 * @example
 * const actionsColumn = createActionsColumn({
 *   getActions: (row) => [
 *     <IconButton onClick={() => handleEdit(row.id)}><EditIcon /></IconButton>,
 *     <IconButton onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>,
 *   ],
 * });
 */
export function createActionsColumn({ getActions, headerName = 'Acciones', width = 100 }) {
  return {
    field: 'actions',
    headerName,
    width,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <div className="flex items-center justify-center gap-1">
        {getActions(params.row)}
      </div>
    ),
  };
}

/**
 * Crea una columna de estado/badge
 *
 * @param {Object} options
 * @param {string} options.field - Campo de la columna
 * @param {string} options.headerName - Título de la columna
 * @param {Object} options.statusConfig - Configuración de estados {estado: {label, className}}
 * @param {number} [options.width=120] - Ancho de la columna
 *
 * @returns {GridColDef} - Definición de columna de estado
 */
export function createStatusColumn({ field, headerName, statusConfig, width = 120 }) {
  return {
    field,
    headerName,
    width,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const status = params.value;
      const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
          {config.label}
        </span>
      );
    },
  };
}

/**
 * Crea una columna de fecha formateada
 *
 * @param {Object} options
 * @param {string} options.field - Campo de la columna
 * @param {string} options.headerName - Título de la columna
 * @param {string} [options.format='dd/MM/yyyy'] - Formato de fecha
 * @param {number} [options.width=120] - Ancho de la columna
 *
 * @returns {GridColDef} - Definición de columna de fecha
 */
export function createDateColumn({ field, headerName, format = 'dd/MM/yyyy', width = 120 }) {
  return {
    field,
    headerName,
    width,
    type: 'date',
    align: 'center',
    headerAlign: 'center',
    valueGetter: (value) => {
      if (!value) return null;
      return new Date(value);
    },
    valueFormatter: (value) => {
      if (!value) return '-';
      try {
        return value.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return '-';
      }
    },
  };
}

/**
 * Crea una columna de número formateado
 *
 * @param {Object} options
 * @param {string} options.field - Campo de la columna
 * @param {string} options.headerName - Título de la columna
 * @param {number} [options.decimals=0] - Decimales a mostrar
 * @param {string} [options.prefix=''] - Prefijo (ej: '$')
 * @param {string} [options.suffix=''] - Sufijo (ej: '%')
 * @param {number} [options.width=100] - Ancho de la columna
 *
 * @returns {GridColDef} - Definición de columna numérica
 */
export function createNumberColumn({ field, headerName, decimals = 0, prefix = '', suffix = '', width = 100 }) {
  return {
    field,
    headerName,
    width,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    valueFormatter: (value) => {
      if (value == null) return '-';
      const formatted = Number(value).toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${prefix}${formatted}${suffix}`;
    },
  };
}
