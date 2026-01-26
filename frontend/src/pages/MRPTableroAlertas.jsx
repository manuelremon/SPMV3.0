import { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from "../context/i18n";
import api from "../services/api";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Autocomplete,
  Checkbox,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { PieChart } from "@mui/x-charts/PieChart";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// Estados de alerta
const ESTADOS_OPTIONS = [
  { value: "quiebre", label: "Quiebre de Stock" },
  { value: "bajo punto", label: "Bajo Punto de Pedido" },
  { value: "bajo stock", label: "Bajo Stock de Seguridad" },
  { value: "exceso", label: "Exceso/Sobrestock" },
  { value: "normal", label: "Normal" },
];

// Colores para estados
const estadoColors = {
  danger: { color: "#b71c1c", bg: "#ffebee" },
  warning: { color: "#e65100", bg: "#fff3e0" },
  success: { color: "#1b5e20", bg: "#e8f5e9" },
  info: { color: "#0d47a1", bg: "#e3f2fd" },
};

export default function MRPTableroAlertas() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [resumen, setResumen] = useState({});

  // Filtros multiselect
  const [filtros, setFiltros] = useState({
    centros: [],
    almacenes: [],
    sectores: [],
    estados: [],
  });
  const [catalogos, setCatalogos] = useState({ centros: [], almacenes: [], sectores: [] });

  // Búsqueda local
  const [searchTerm, setSearchTerm] = useState("");

  // Cargar catálogos y seleccionar todos por defecto
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await api.get("/mrp/catalogos");
        if (res.data?.ok) {
          setCatalogos(res.data);
          // Seleccionar todos por defecto
          setFiltros({
            centros: res.data.centros || [],
            almacenes: res.data.almacenes || [],
            sectores: res.data.sectores || [],
            estados: ESTADOS_OPTIONS,
          });
        }
      } catch (err) {
        console.error("Error loading catalogos:", err);
      }
    };
    fetchCatalogos();
  }, []);

  // Handlers para "Seleccionar todos"
  const handleSelectAllCentros = (newValue) => {
    const allCentros = catalogos.centros || [];
    const isSelectAll = newValue.some(v => v._selectAll);
    if (isSelectAll) {
      setFiltros(prev => ({
        ...prev,
        centros: prev.centros.length === allCentros.length ? [] : allCentros,
      }));
    } else {
      setFiltros(prev => ({ ...prev, centros: newValue }));
    }
  };

  const handleSelectAllAlmacenes = (newValue) => {
    const allAlmacenes = catalogos.almacenes || [];
    const isSelectAll = newValue.some(v => v._selectAll);
    if (isSelectAll) {
      setFiltros(prev => ({
        ...prev,
        almacenes: prev.almacenes.length === allAlmacenes.length ? [] : allAlmacenes,
      }));
    } else {
      setFiltros(prev => ({ ...prev, almacenes: newValue }));
    }
  };

  const handleSelectAllSectores = (newValue) => {
    const allSectores = catalogos.sectores || [];
    const isSelectAll = newValue.some(v => v._selectAll);
    if (isSelectAll) {
      setFiltros(prev => ({
        ...prev,
        sectores: prev.sectores.length === allSectores.length ? [] : allSectores,
      }));
    } else {
      setFiltros(prev => ({ ...prev, sectores: newValue }));
    }
  };

  const handleSelectAllEstados = (newValue) => {
    const isSelectAll = newValue.some(v => v._selectAll);
    if (isSelectAll) {
      setFiltros(prev => ({
        ...prev,
        estados: prev.estados.length === ESTADOS_OPTIONS.length ? [] : ESTADOS_OPTIONS,
      }));
    } else {
      setFiltros(prev => ({ ...prev, estados: newValue }));
    }
  };

  // Cargar alertas
  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Solo enviar filtros si NO están todos seleccionados
      // Si todos están seleccionados = no enviar filtro = mostrar todo
      const allCentros = catalogos.centros || [];
      const allAlmacenes = catalogos.almacenes || [];
      const allSectores = catalogos.sectores || [];

      if (filtros.centros.length > 0 && filtros.centros.length < allCentros.length) {
        filtros.centros.forEach(c => params.append("centro", c.codigo));
      }
      if (filtros.almacenes.length > 0 && filtros.almacenes.length < allAlmacenes.length) {
        filtros.almacenes.forEach(a => params.append("almacen", a.codigo));
      }
      if (filtros.sectores.length > 0 && filtros.sectores.length < allSectores.length) {
        filtros.sectores.forEach(s => params.append("sector", s.nombre));
      }
      if (filtros.estados.length > 0 && filtros.estados.length < ESTADOS_OPTIONS.length) {
        filtros.estados.forEach(e => params.append("estado", e.value));
      }
      params.append("limit", "500");

      const res = await api.get(`/mrp/alertas?${params.toString()}`);
      if (res.data?.ok) {
        setAlertas(res.data.data || []);
        setResumen(res.data.resumen || {});
      } else {
        setError(res.data?.error?.message || "Error al cargar alertas");
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtros, catalogos]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  // Filtrar por búsqueda local
  const filteredAlertas = useMemo(() => {
    if (!searchTerm) return alertas;
    const term = searchTerm.toLowerCase();
    return alertas.filter(
      (alerta) =>
        alerta.codigo?.toLowerCase().includes(term) ||
        alerta.descripcion?.toLowerCase().includes(term)
    );
  }, [alertas, searchTerm]);

  // Columnas del DataGrid
  const columns = useMemo(
    () => [
      {
        field: "codigo",
        headerName: "Material",
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "descripcion",
        headerName: "Descripción",
        flex: 1.5,
        minWidth: 200,
        headerAlign: "center",
      },
      {
        field: "demanda_estimada_anual",
        width: 80,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Demanda Estimada Anual" arrow>
            <span style={{ fontWeight: 700 }}>Demanda</span>
          </Tooltip>
        ),
        valueFormatter: (value) => Math.round(value || 0).toLocaleString("es-AR"),
      },
      {
        field: "consumo_promedio_anual",
        headerName: "Cons. Prom. Anual",
        headerAlign: "center",
        align: "center",
        valueFormatter: (value) => Math.round(value || 0).toLocaleString("es-AR"),
      },
      {
        field: "stock_seguridad",
        width: 60,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock de Seguridad" arrow>
            <span style={{ fontWeight: 700 }}>SS</span>
          </Tooltip>
        ),
      },
      {
        field: "punto_pedido",
        width: 60,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Punto de Pedido" arrow>
            <span style={{ fontWeight: 700 }}>PP</span>
          </Tooltip>
        ),
      },
      {
        field: "stock_maximo",
        width: 60,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock Máximo" arrow>
            <span style={{ fontWeight: 700 }}>SM</span>
          </Tooltip>
        ),
      },
      {
        field: "stock_actual",
        width: 70,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock HOY" arrow>
            <span style={{ fontWeight: 700 }}>Stock</span>
          </Tooltip>
        ),
        renderCell: (params) => {
          const stock = params.value || 0;
          const pp = params.row.punto_pedido || 0;
          let color = "#1b5e20"; // green
          if (stock <= 0) color = "#b71c1c"; // red
          else if (stock < pp) color = "#e65100"; // orange
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {stock}
            </Typography>
          );
        },
      },
      {
        field: "pedidos_en_curso",
        headerName: "Pedidos Curso",
        headerAlign: "center",
        align: "center",
      },
      {
        field: "rotacion_pct",
        headerName: "Rotación %",
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const rot = Math.round(params.value || 0);
          let color = "#b71c1c"; // red
          if (rot > 300) color = "#1b5e20"; // green
          else if (rot > 100) color = "#e65100"; // orange
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rot}%
            </Typography>
          );
        },
      },
      {
        field: "estado",
        headerName: "Estado",
        flex: 0.6,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const clase = params.row.estado_clase || "info";
          const colors = estadoColors[clase] || estadoColors.info;
          return (
            <Typography
              variant="caption"
              sx={{
                color: colors.color,
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "11px",
              }}
            >
              {params.value || "-"}
            </Typography>
          );
        },
      },
      {
        field: "sugerencia",
        headerName: "Sugerencia",
        flex: 1,
        minWidth: 150,
        headerAlign: "center",
      },
    ],
    []
  );

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1800 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h1"
          fontWeight={700}
          sx={{ textTransform: "uppercase" }}
        >
          {t("mrp_alertas_titulo", "Tablero de Alertas MRP")}
        </Typography>
      </Box>

      {/* Resumen Cards */}
      <Paper
        elevation={1}
        sx={{
          display: "flex",
          alignItems: "stretch",
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {[
          { titulo: "Total", valor: resumen.total || 0, color: "#1565c0", showChart: false },
          { titulo: "Quiebre de Stock", valor: resumen.quiebre_stock || 0, color: "#b71c1c", showChart: true },
          { titulo: "Bajo Stock Seg.", valor: resumen.bajo_stock_seguridad || 0, color: "#aa00ff", showChart: true },
          { titulo: "Bajo Punto Pedido", valor: resumen.bajo_punto_pedido || 0, color: "#3e2723", showChart: true },
          { titulo: "Sobrestock", valor: resumen.sobrestock || 0, color: "#ff3d00", showChart: true },
          { titulo: "Normal", valor: resumen.normal || 0, color: "#2e7d32", showChart: true },
        ].map((item, index, arr) => {
          const total = resumen.total || 1;
          const pct = item.showChart ? Math.round((item.valor / total) * 100) : 0;
          return (
            <Box
              key={item.titulo}
              sx={{
                flex: 1,
                textAlign: "center",
                py: 1.5,
                px: 1,
                borderRight: index < arr.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                {item.valor}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "11px",
                  mb: item.showChart ? 0.5 : 0,
                }}
              >
                {item.titulo}
              </Typography>
              {item.showChart && (
                <Box sx={{ position: "relative", width: 60, height: 35, mt: 0.5 }}>
                  <PieChart
                    series={[
                      {
                        startAngle: -90,
                        endAngle: 90,
                        paddingAngle: 2,
                        innerRadius: "55%",
                        outerRadius: "100%",
                        data: [
                          { value: pct, color: item.color },
                          { value: 100 - pct, color: "#e0e0e0" },
                        ],
                      },
                    ]}
                    width={60}
                    height={35}
                    slotProps={{ legend: { hidden: true } }}
                    margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontWeight: 700,
                      fontSize: "10px",
                      color: item.color,
                    }}
                  >
                    {pct}%
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Paper>

      {/* Filtros Multiselect */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, border: "1px solid", borderColor: "divider" }}>
        <Typography
          variant="subtitle2"
          sx={{ textTransform: "uppercase", fontWeight: 700, mb: 2 }}
        >
          Filtros
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "13px",
            alignItems: "stretch",
            justifyContent: "center",
          }}
        >
          {/* Centro */}
          <Autocomplete
            multiple
            size="small"
            options={[{ _selectAll: true, codigo: "all", nombre: "Seleccionar todos" }, ...(catalogos.centros || [])]}
            disableCloseOnSelect
            getOptionLabel={(option) => option._selectAll ? "Seleccionar todos" : `${option.codigo} - ${option.nombre}`}
            value={filtros.centros}
            onChange={(_, newValue) => handleSelectAllCentros(newValue)}
            isOptionEqualToValue={(option, value) => option._selectAll ? false : option.codigo === value.codigo}
            renderOption={(props, option, { selected }) => {
              const { key, ...restProps } = props;
              const allSelected = filtros.centros.length === (catalogos.centros || []).length;
              return (
                <li key={key} {...restProps}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    style={{ marginRight: 8 }}
                    checked={option._selectAll ? allSelected : selected}
                  />
                  <Typography variant="body2" sx={{ fontWeight: option._selectAll ? 600 : 400 }}>
                    {option._selectAll ? "Seleccionar todos" : `${option.codigo} - ${option.nombre}`}
                  </Typography>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Centro" placeholder="Seleccionar..." />
            )}
            renderTags={(value, getTagProps) =>
              value.length === (catalogos.centros || []).length ? (
                <Chip label="Todos" size="small" />
              ) : (
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option.codigo} size="small" {...tagProps} />;
                })
              )
            }
            sx={{ width: 180, minHeight: 40 }}
          />

          {/* Almacén */}
          <Autocomplete
            multiple
            size="small"
            options={[{ _selectAll: true, codigo: "all", nombre: "Seleccionar todos" }, ...(catalogos.almacenes || [])]}
            disableCloseOnSelect
            getOptionLabel={(option) => option._selectAll ? "Seleccionar todos" : `${option.codigo} - ${option.nombre}`}
            value={filtros.almacenes}
            onChange={(_, newValue) => handleSelectAllAlmacenes(newValue)}
            isOptionEqualToValue={(option, value) => option._selectAll ? false : option.codigo === value.codigo}
            renderOption={(props, option, { selected }) => {
              const { key, ...restProps } = props;
              const allSelected = filtros.almacenes.length === (catalogos.almacenes || []).length;
              return (
                <li key={key} {...restProps}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    style={{ marginRight: 8 }}
                    checked={option._selectAll ? allSelected : selected}
                  />
                  <Typography variant="body2" sx={{ fontWeight: option._selectAll ? 600 : 400 }}>
                    {option._selectAll ? "Seleccionar todos" : `${option.codigo} - ${option.nombre}`}
                  </Typography>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Almacén" placeholder="Seleccionar..." />
            )}
            renderTags={(value, getTagProps) =>
              value.length === (catalogos.almacenes || []).length ? (
                <Chip label="Todos" size="small" />
              ) : (
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option.codigo} size="small" {...tagProps} />;
                })
              )
            }
            sx={{ width: 180, minHeight: 40 }}
          />

          {/* Sector */}
          <Autocomplete
            multiple
            size="small"
            options={[{ _selectAll: true, nombre: "Seleccionar todos" }, ...(catalogos.sectores || [])]}
            disableCloseOnSelect
            getOptionLabel={(option) => option._selectAll ? "Seleccionar todos" : option.nombre}
            value={filtros.sectores}
            onChange={(_, newValue) => handleSelectAllSectores(newValue)}
            isOptionEqualToValue={(option, value) => option._selectAll ? false : option.nombre === value.nombre}
            renderOption={(props, option, { selected }) => {
              const { key, ...restProps } = props;
              const allSelected = filtros.sectores.length === (catalogos.sectores || []).length;
              return (
                <li key={key} {...restProps}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    style={{ marginRight: 8 }}
                    checked={option._selectAll ? allSelected : selected}
                  />
                  <Typography variant="body2" sx={{ fontWeight: option._selectAll ? 600 : 400 }}>
                    {option._selectAll ? "Seleccionar todos" : option.nombre}
                  </Typography>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Sector" placeholder="Seleccionar..." />
            )}
            renderTags={(value, getTagProps) =>
              value.length === (catalogos.sectores || []).length ? (
                <Chip label="Todos" size="small" />
              ) : (
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option.nombre} size="small" {...tagProps} />;
                })
              )
            }
            sx={{ width: 180, minHeight: 40 }}
          />

          {/* Estado */}
          <Autocomplete
            multiple
            size="small"
            options={[{ _selectAll: true, value: "all", label: "Seleccionar todos" }, ...ESTADOS_OPTIONS]}
            disableCloseOnSelect
            getOptionLabel={(option) => option._selectAll ? "Seleccionar todos" : option.label}
            value={filtros.estados}
            onChange={(_, newValue) => handleSelectAllEstados(newValue)}
            isOptionEqualToValue={(option, value) => option._selectAll ? false : option.value === value.value}
            renderOption={(props, option, { selected }) => {
              const { key, ...restProps } = props;
              const allSelected = filtros.estados.length === ESTADOS_OPTIONS.length;
              return (
                <li key={key} {...restProps}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    style={{ marginRight: 8 }}
                    checked={option._selectAll ? allSelected : selected}
                  />
                  <Typography variant="body2" sx={{ fontWeight: option._selectAll ? 600 : 400 }}>
                    {option._selectAll ? "Seleccionar todos" : option.label}
                  </Typography>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} label="Estado" placeholder="Seleccionar..." />
            )}
            renderTags={(value, getTagProps) =>
              value.length === ESTADOS_OPTIONS.length ? (
                <Chip label="Todos" size="small" />
              ) : (
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} label={option.label} size="small" {...tagProps} />;
                })
              )
            }
            sx={{ width: 180, minHeight: 40 }}
          />

          {/* Búsqueda */}
          <TextField
            size="small"
            label="Buscar"
            placeholder="Código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 180, minHeight: 40 }}
          />

          {/* Borrar Filtros */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFiltros({
                centros: [],
                almacenes: [],
                sectores: [],
                estados: [],
              });
              setSearchTerm("");
            }}
            sx={{
              textTransform: "uppercase",
              fontWeight: 600,
              fontSize: "11px",
              width: 180,
              height: 40,
            }}
          >
            Borrar Filtros
          </Button>
        </Box>
      </Paper>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Paper elevation={2} sx={{ height: 600 }}>
        <DataGrid
          rows={filteredAlertas}
          columns={columns}
          getRowId={(row) => row.codigo}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          disableRowSelectionOnClick
          rowHeight={52}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Filas por página:",
            },
            noRowsLabel: "No hay alertas para mostrar",
          }}
          slots={{
            loadingOverlay: () => (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress />
              </Box>
            ),
          }}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "grey.100",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "12px",
            },
            "& .MuiDataGrid-columnHeader--alignCenter .MuiDataGrid-columnHeaderTitleContainer": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-columnHeader": {
              borderRight: "1px solid",
              borderColor: "divider",
            },
            "& .MuiDataGrid-cell": {
              fontSize: "13px",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        />
      </Paper>
    </Container>
  );
}
