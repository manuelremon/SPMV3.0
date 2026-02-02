/**
 * Planner Page - MUI Style
 * Refactored to use MUI components for consistency
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanner, renderSolicitante } from "../hooks/usePlanner";
import { useI18n } from "../context/i18n";
import { formatDate, formatCurrency, getSectorNombre } from "../utils/formatters";
import { getCriticidadConfig } from "../utils/styleConfig";
import StatusBadge from "../components/ui/StatusBadge";
import TratarSolicitudModal from "../components/Planner/TratarSolicitudModal";
import SolicitudDetalleModal from "../components/Planner/SolicitudDetalleModal";

// MUI Components
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  OutlinedInput,
  Slider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  ArrowBack,
  Close,
} from "@mui/icons-material";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export default function Planner({ filterMode }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Modal de detalle
  const [detalleModal, setDetalleModal] = useState({ open: false, solicitud: null });

  // Estados para slider de fechas (0 = hace 1 año, 365 = hoy)
  const [rangoFechasLocal, setRangoFechasLocal] = useState([0, 365]);
  const rangoFechas = useDebouncedValue(rangoFechasLocal, 300);

  // Función para convertir valor del slider a fecha (formato DD/MM/AA)
  const sliderAFecha = (valor) => {
    const diasHaciaAtras = 365 - valor;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasHaciaAtras);
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const yy = String(fecha.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // MenuProps para los multiselect
  const MenuProps = {
    PaperProps: { style: { maxHeight: 32 * 6 + 4, width: 180 } },
  };

  // All state and logic extracted to usePlanner hook
  const {
    error,
    success,
    loading,
    q,
    filtroCentros,
    filtroAlmacenes,
    filtroSectores,
    filtroEstados,
    filtroCriticidades,
    activeTab,
    selectedParaTratar,
    rejectModal,
    filtered,
    tabCounts,
    catalogos,
    estadosOptions,
    criticidadOptions,
    hayFiltrosActivos,
    setQ,
    setFiltroCentros,
    setFiltroAlmacenes,
    setFiltroSectores,
    setFiltroEstados,
    setFiltroCriticidades,
    setActiveTab,
    handleTratar,
    rechazar,
    closeTratarModal,
    onTratarComplete,
    closeRejectModal,
    updateRejectMotivo,
    clearError,
    clearSuccess,
    limpiarFiltros,
  } = usePlanner({ t, filterMode });

  // DataGrid columns
  const columns = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.3,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "acciones",
      headerName: "Acción",
      flex: 0.6,
      minWidth: 120,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Button
            size="small"
            color="info"
            onClick={(e) => {
              e.stopPropagation();
              setDetalleModal({ open: true, solicitud: params.row });
            }}
            sx={{ fontSize: "0.7rem", py: 0.25, minWidth: "auto" }}
          >
            Ver
          </Button>
          <Button
            size="small"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              handleTratar(params.row);
            }}
            sx={{ fontSize: "0.7rem", py: 0.25, minWidth: "auto" }}
          >
            Tratar
          </Button>
        </Box>
      ),
    },
    {
      field: "items_count",
      headerName: "Items",
      flex: 0.3,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => (row.items || []).length,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, minWidth: 32 }}
        />
      ),
    },
    {
      field: "created_at",
      headerName: "F. Creación",
      flex: 0.5,
      minWidth: 90,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.4,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "almacen",
      headerName: "Almacén",
      flex: 0.4,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.almacen || row.almacen_codigo || "-",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.6,
      minWidth: 100,
      valueGetter: (value, row) => getSectorNombre(row.sector),
    },
    {
      field: "solicitante",
      headerName: "Solicitante",
      flex: 0.7,
      minWidth: 120,
      valueGetter: (value, row) => renderSolicitante(row),
    },
    {
      field: "criticidad",
      headerName: "Criticidad",
      flex: 0.5,
      minWidth: 80,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const criticidad = params.value || "Normal";
        const config = getCriticidadConfig(criticidad);
        return (
          <Typography variant="body2" fontWeight={600} sx={{ color: config.color }}>
            {config.label}
          </Typography>
        );
      },
    },
    {
      field: "justificacion",
      headerName: "Asunto",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const texto = params.value || "-";
        const truncado = texto.length > 25;
        return (
          <Tooltip title={truncado ? texto : ""} arrow>
            <Typography variant="body2" noWrap>
              {truncado ? texto.slice(0, 25) + "..." : texto}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "total_monto",
      headerName: "Monto",
      flex: 0.6,
      minWidth: 100,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {formatCurrency(params.value || 0)}
        </Typography>
      ),
    },
    {
      field: "fecha_necesidad",
      headerName: "F. Necesidad",
      flex: 0.5,
      minWidth: 90,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.status || row.estado || "pendiente",
      renderCell: (params) => <StatusBadge estado={params.value} showIcon={false} />,
    },
  ], [handleTratar]);

  const rows = useMemo(() => filtered.map((item) => ({ ...item, id: item.id })), [filtered]);

  // Tab mapping
  const tabMapping = ["pendientes", "en_progreso", "finalizadas"];
  const activeTabIndex = tabMapping.indexOf(activeTab);

  const handleTabChange = (event, newValue) => {
    setActiveTab(tabMapping[newValue]);
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {filterMode === "asignadas"
            ? t("nav_asignadas", "SOLICITUDES ASIGNADAS A MÍ")
            : filterMode === "no-asignadas"
            ? t("nav_no_asignadas", "SOLICITUDES SIN ASIGNAR")
            : t("planner_title", "PLANIFICADOR")}
        </Typography>
      </Box>

      {/* Alertas */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={clearSuccess}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Filtros - estilo Dashboard */}
      <Paper elevation={0} sx={{ mb: 3, border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        <div className="py-3 px-6" style={{ height: "73px" }}>
          <div className="flex items-center gap-6 h-full">
          {/* Slider de fechas */}
          <div className="flex flex-col gap-0 min-w-[280px]">
            <label className="text-xs font-medium text-slate-600 mt-2">
              Desde <span className="text-blue-600 font-semibold">{sliderAFecha(rangoFechasLocal[0])}</span> hasta <span className="text-blue-600 font-semibold">{sliderAFecha(rangoFechasLocal[1])}</span>
            </label>
            <Slider
              size="small"
              value={rangoFechasLocal}
              onChange={(_, value) => setRangoFechasLocal(value)}
              min={0}
              max={365}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => sliderAFecha(value)}
              getAriaLabel={() => "Rango de fechas"}
              sx={{ color: "#2196f3", "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-valueLabel": { fontSize: 10 } }}
            />
            <div className="flex justify-between text-[10px] text-slate-400 -mt-1">
              <span>Hace 1 año</span>
              <span>Hoy</span>
            </div>
          </div>

          {/* Separador */}
          <div className="h-16 w-px bg-slate-200" />

          {/* Búsqueda */}
          <TextField
            label="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, asunto..."
            size="small"
            sx={{ minWidth: 140, maxWidth: 180 }}
            InputProps={{ sx: { fontSize: "0.75rem" } }}
            InputLabelProps={{ sx: { fontSize: "0.75rem" } }}
          />

          {/* Centro */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="centro-label" sx={{ fontSize: "0.75rem" }}>Centro</InputLabel>
            <Select
              labelId="centro-label"
              multiple
              value={filtroCentros.map(c => c.id || c)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes("__todos__")) {
                  setFiltroCentros(filtroCentros.length === (catalogos.centros || []).length ? [] : catalogos.centros || []);
                } else {
                  setFiltroCentros((catalogos.centros || []).filter(c => value.includes(c.id)));
                }
              }}
              input={<OutlinedInput label="Centro" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtroCentros.length === (catalogos.centros || []).length && (catalogos.centros || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.centros || []).map((centro) => (
                <MenuItem key={centro.id} value={centro.id}>
                  <Checkbox checked={filtroCentros.some(c => (c.id || c) === centro.id)} size="small" />
                  <ListItemText primary={centro.nombre || centro.id} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Almacén */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="almacen-label" sx={{ fontSize: "0.75rem" }}>Almacén</InputLabel>
            <Select
              labelId="almacen-label"
              multiple
              value={filtroAlmacenes.map(a => a.codigo || a)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes("__todos__")) {
                  setFiltroAlmacenes(filtroAlmacenes.length === (catalogos.almacenes || []).length ? [] : catalogos.almacenes || []);
                } else {
                  setFiltroAlmacenes((catalogos.almacenes || []).filter(a => value.includes(a.codigo)));
                }
              }}
              input={<OutlinedInput label="Almacén" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtroAlmacenes.length === (catalogos.almacenes || []).length && (catalogos.almacenes || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.almacenes || []).map((almacen) => (
                <MenuItem key={almacen.codigo} value={almacen.codigo}>
                  <Checkbox checked={filtroAlmacenes.some(a => (a.codigo || a) === almacen.codigo)} size="small" />
                  <ListItemText primary={almacen.nombre || almacen.codigo} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sector */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="sector-label" sx={{ fontSize: "0.75rem" }}>Sector</InputLabel>
            <Select
              labelId="sector-label"
              multiple
              value={filtroSectores.map(s => s.nombre || s)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes("__todos__")) {
                  setFiltroSectores(filtroSectores.length === (catalogos.sectores || []).length ? [] : catalogos.sectores || []);
                } else {
                  setFiltroSectores((catalogos.sectores || []).filter(s => value.includes(s.nombre)));
                }
              }}
              input={<OutlinedInput label="Sector" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtroSectores.length === (catalogos.sectores || []).length && (catalogos.sectores || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.sectores || []).map((sector) => (
                <MenuItem key={sector.nombre} value={sector.nombre}>
                  <Checkbox checked={filtroSectores.some(s => (s.nombre || s) === sector.nombre)} size="small" />
                  <ListItemText primary={sector.nombre} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Estado */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="estado-label" sx={{ fontSize: "0.75rem" }}>Estado</InputLabel>
            <Select
              labelId="estado-label"
              multiple
              value={filtroEstados.map(e => e.value || e)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes("__todos__")) {
                  setFiltroEstados(filtroEstados.length === estadosOptions.length ? [] : estadosOptions);
                } else {
                  setFiltroEstados(estadosOptions.filter(opt => value.includes(opt.value)));
                }
              }}
              input={<OutlinedInput label="Estado" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtroEstados.length === estadosOptions.length} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {estadosOptions.map((estado) => (
                <MenuItem key={estado.value} value={estado.value}>
                  <Checkbox checked={filtroEstados.some(e => (e.value || e) === estado.value)} size="small" />
                  <ListItemText primary={estado.label} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Criticidad */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="criticidad-label" sx={{ fontSize: "0.75rem" }}>Criticidad</InputLabel>
            <Select
              labelId="criticidad-label"
              multiple
              value={filtroCriticidades.map(c => c.value || c)}
              onChange={(e) => {
                const value = e.target.value;
                if (value.includes("__todos__")) {
                  setFiltroCriticidades(filtroCriticidades.length === criticidadOptions.length ? [] : criticidadOptions);
                } else {
                  setFiltroCriticidades(criticidadOptions.filter(opt => value.includes(opt.value)));
                }
              }}
              input={<OutlinedInput label="Criticidad" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtroCriticidades.length === criticidadOptions.length} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {criticidadOptions.map((crit) => (
                <MenuItem key={crit.value} value={crit.value}>
                  <Checkbox checked={filtroCriticidades.some(c => (c.value || c) === crit.value)} size="small" />
                  <ListItemText primary={crit.label} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

            {/* Limpiar Filtros */}
            <button
              type="button"
              onClick={() => {
                limpiarFiltros();
                setRangoFechasLocal([0, 365]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-md hover:border-blue-300 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      </Paper>

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTabIndex >= 0 ? activeTabIndex : 0}
          onChange={handleTabChange}
          variant="standard"
          sx={{
            minHeight: 44,
            bgcolor: "#ffffff",
            borderRadius: "8px 8px 0 0",
            borderBottom: "2px solid #dce0e6",
            "& .MuiTab-root": {
              minHeight: 44,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#606d80",
              "&.Mui-selected": {
                color: "#1976d2",
              },
              "&:hover": {
                color: "#1976d2",
                bgcolor: "rgba(25, 118, 210, 0.04)",
              },
            },
            "& .MuiTabs-indicator": {
              bgcolor: "#1976d2",
              height: 3,
            },
          }}
        >
          <Tab label={`${t("planner_tab_pendientes", "Pendientes")} (${tabCounts.pendientes})`} disableRipple />
          <Tab label={`${t("planner_tab_en_progreso", "En Progreso")} (${tabCounts.en_progreso})`} disableRipple />
          <Tab label={`${t("planner_tab_finalizadas", "Finalizadas")} (${tabCounts.finalizadas})`} disableRipple />
        </Tabs>
      </Box>

      {/* DataGrid */}
      <Paper elevation={0} sx={{ height: 600, border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
          }}
          disableRowSelectionOnClick
          onRowDoubleClick={(params) => setDetalleModal({ open: true, solicitud: params.row })}
          localeText={{
            noRowsLabel: t("planner_empty_full", "Sin solicitudes asignadas"),
            MuiTablePagination: {
              labelRowsPerPage: "Filas por página:",
            },
          }}
          sx={{
            border: "1px solid #dce0e6",
            borderRadius: 2,
            backgroundColor: "#ffffff",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#ffffff !important",
              color: "#1f1f20 !important",
              borderBottom: "2px solid #dce0e6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#ffffff !important",
              color: "#1f1f20 !important",
              borderRight: "1px solid #dce0e6 !important",
              "&:last-of-type": {
                borderRight: "none !important",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 600,
              color: "#1f1f20 !important",
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-sortIcon": {
              color: "#606d80 !important",
              opacity: "1 !important",
            },
            "& .MuiDataGrid-menuIconButton": {
              color: "#606d80 !important",
            },
            "& .MuiDataGrid-iconButtonContainer": {
              visibility: "visible !important",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #dce0e6 !important",
              borderRight: "1px solid #dce0e6 !important",
              color: "#1f1f20",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              "&:last-of-type": {
                borderRight: "none !important",
              },
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f0f2f5",
              cursor: "pointer",
            },
            "& .MuiDataGrid-row.Mui-selected": {
              backgroundColor: "#e8eef5",
              "&:hover": {
                backgroundColor: "#e8eef5",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #dce0e6",
              backgroundColor: "#f5f7fa",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          }}
        />
      </Paper>

      {/* Treatment Modal */}
      <TratarSolicitudModal
        solicitud={selectedParaTratar}
        isOpen={!!selectedParaTratar}
        onClose={closeTratarModal}
        onComplete={onTratarComplete}
      />

      {/* Reject Modal - MUI Dialog */}
      <Dialog
        open={rejectModal.open}
        onClose={closeRejectModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={600}>
            {t("planner_rechazar_solicitud", "Rechazar Solicitud")} #{rejectModal.solicitud?.id}
          </Typography>
          <IconButton onClick={closeRejectModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("planner_rechazar_motivo_label", "Motivo del rechazo")} <span style={{ color: "red" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={rejectModal.motivo}
            onChange={(e) => updateRejectMotivo(e.target.value)}
            placeholder={t("planner_rechazar_placeholder", "Explica brevemente el motivo del rechazo...")}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectModal} color="inherit">
            {t("common_cancelar", "Cancelar")}
          </Button>
          <Button onClick={rechazar} variant="contained" color="error">
            {t("planner_confirmar_rechazo", "Confirmar Rechazo")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detalle Modal */}
      <SolicitudDetalleModal
        isOpen={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, solicitud: null })}
        solicitud={detalleModal.solicitud}
      />
    </Container>
  );
}
