import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { solicitudes } from "../services/spm";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useDebounced } from "../hooks/useDebounced";
import { useI18n } from "../context/i18n";
import { formatDate, formatCurrency, getSectorNombre, formatAlmacen } from "../utils/formatters";
import { getCriticidadConfig } from "../utils/styleConfig";
import StatusBadge from "../components/ui/StatusBadge";
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Tooltip,
  TextField,
} from "@mui/material";
import { SPMDataGrid } from "../components/ui/SPMDataGrid";
import {
  ArrowBack,
  Visibility,
  Close,
  CalendarToday,
  Business,
  LocationOn,
  Inventory,
  Tag,
  Schedule,
  CheckCircle,
  Cancel,
  Refresh,
  Warning,
} from "@mui/icons-material";

const DEBOUNCE_MS = 300;

export default function Aprobaciones() {
  const { user } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, DEBOUNCE_MS);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [detalleModal, setDetalleModal] = useState({ open: false, solicitud: null });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, motivo: "" });
  const [budgetErrorModal, setBudgetErrorModal] = useState({ open: false, message: "", solicitudId: null });

  // Check if user is admin
  const isAdmin = useMemo(() => {
    const rol = (user?.rol || '').toLowerCase();
    return rol.includes('admin') || rol.includes('administrador');
  }, [user?.rol]);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Cargar sectores
  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await api.get('/catalogos/sectores');
        const data = Array.isArray(res.data) ? res.data : [];
        setSectores(data);
      } catch (err) {
        console.error('Error cargando sectores:', err);
      }
    };
    fetchSectores();
  }, []);

  // Load pending approvals
  const loadPendientes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { estado: "submitted" };
      if (!isAdmin) {
        params.aprobador_id = user?.id;
      }
      const res = await solicitudes.listar(params);
      const data = res.data.solicitudes || res.data.results || [];
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  // Load approval history
  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const [resAprobadas, resRechazadas] = await Promise.all([
        solicitudes.listar({ estado: "approved" }),
        solicitudes.listar({ estado: "rejected" }),
      ]);
      const aprobadas = resAprobadas.data.solicitudes || resAprobadas.data.results || [];
      const rechazadas = resRechazadas.data.solicitudes || resRechazadas.data.results || [];
      const all = [...aprobadas, ...rechazadas].sort((a, b) =>
        new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
      );
      setHistorial(all);
    } catch (err) {
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    loadPendientes();
    loadHistorial();
  }, [loadPendientes, loadHistorial]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!loading && !refreshing) {
        await loadPendientes();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadPendientes, loading, refreshing]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadPendientes(), loadHistorial()]);
    setRefreshing(false);
  }, [loadPendientes, loadHistorial]);

  // Filtrado pendientes
  const filtered = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    if (!term) return items;
    return items.filter((s) => {
      return (
        String(s.id).includes(term) ||
        (s.justificacion || "").toLowerCase().includes(term) ||
        (s.centro || "").toLowerCase().includes(term) ||
        (s.sector || "").toLowerCase().includes(term) ||
        (`${s.solicitante_nombre || ""} ${s.solicitante_apellido || ""}`).toLowerCase().includes(term)
      );
    });
  }, [items, debouncedQ]);

  // Filtrado historial
  const filteredHistorial = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    if (!term) return historial;
    return historial.filter((s) => {
      return (
        String(s.id).includes(term) ||
        (s.justificacion || "").toLowerCase().includes(term) ||
        (s.centro || "").toLowerCase().includes(term) ||
        (s.sector || "").toLowerCase().includes(term)
      );
    });
  }, [historial, debouncedQ]);

  const aprobar = useCallback(async (id) => {
    setError("");
    try {
      await solicitudes.aprobar(id);
      setSuccess(t("aprov_aprobada_msg", "Solicitud aprobada y asignada a planificador"));
      loadPendientes();
      loadHistorial();
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      const errorMessage = err.response?.data?.error?.message || err.message;
      if (errorCode === "saldo_insuficiente" || errorMessage.toLowerCase().includes("saldo insuficiente")) {
        setBudgetErrorModal({ open: true, message: errorMessage, solicitudId: id });
      } else {
        setError(errorMessage);
      }
    }
  }, [loadPendientes, loadHistorial, t]);

  const confirmRechazar = useCallback(async () => {
    if (!rejectModal.id) return;
    setError("");
    const motivo = rejectModal.motivo.trim() || "Rechazada";
    try {
      await solicitudes.rechazar(rejectModal.id, motivo);
      setSuccess(t("aprov_rechazada_msg", "Solicitud rechazada."));
      loadPendientes();
      loadHistorial();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setRejectModal({ open: false, id: null, motivo: "" });
    }
  }, [rejectModal.id, rejectModal.motivo, loadPendientes, loadHistorial, t]);

  // Columnas del DataGrid para pendientes
  const columns = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.4,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "fecha_creacion",
      headerName: "Fecha",
      flex: 0.6,
      minWidth: 90,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.fecha_creacion || row.created_at,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "solicitante",
      headerName: "Solicitante",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (value, row) => {
        const nombre = row.solicitante_nombre || "";
        const apellido = row.solicitante_apellido || "";
        return `${nombre} ${apellido}`.trim() || "-";
      },
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.centro || "-",
    },
    {
      field: "almacen_virtual",
      headerName: "Almacen",
      flex: 0.5,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => formatAlmacen(params.value || params.row.almacen) || "-",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.8,
      minWidth: 100,
      valueGetter: (value, row) => getSectorNombre(row.sector || row.sector_id, sectores),
    },
    {
      field: "fecha_necesidad",
      headerName: "F. Necesidad",
      flex: 0.6,
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
      field: "total_monto",
      headerName: "Monto",
      flex: 0.7,
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
      field: "items_count",
      headerName: "Items",
      flex: 0.4,
      minWidth: 50,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.items?.length || 0,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 0.7,
      minWidth: 110,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Ver detalle">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setDetalleModal({ open: true, solicitud: params.row })}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Aprobar">
            <IconButton
              size="small"
              color="success"
              onClick={() => aprobar(params.row.id)}
            >
              <CheckCircle fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rechazar">
            <IconButton
              size="small"
              color="error"
              onClick={() => setRejectModal({ open: true, id: params.row.id, motivo: "" })}
            >
              <Cancel fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [sectores, aprobar]);

  // Columnas para historial (sin acciones)
  const columnsHistorial = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.4,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "fecha_creacion",
      headerName: "Fecha",
      flex: 0.6,
      minWidth: 90,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.fecha_creacion || row.created_at,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "solicitante",
      headerName: "Solicitante",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (value, row) => {
        const nombre = row.solicitante_nombre || "";
        const apellido = row.solicitante_apellido || "";
        return `${nombre} ${apellido}`.trim() || "-";
      },
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.8,
      minWidth: 100,
      valueGetter: (value, row) => getSectorNombre(row.sector || row.sector_id, sectores),
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
      field: "total_monto",
      headerName: "Monto",
      flex: 0.7,
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
      field: "status",
      headerName: "Estado",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.estado || row.status || "pendiente",
      renderCell: (params) => <StatusBadge estado={params.value} showIcon={false} />,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 0.4,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Ver detalle">
          <IconButton
            size="small"
            color="primary"
            onClick={() => setDetalleModal({ open: true, solicitud: params.row })}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [sectores]);

  const rows = useMemo(() => filtered.map((item) => ({ ...item, id: item.id })), [filtered]);
  const rowsHistorial = useMemo(() => filteredHistorial.map((item) => ({ ...item, id: item.id })), [filteredHistorial]);

  const tabFilters = [
    { label: "Pendientes", key: "pendientes" },
    { label: "Historial", key: "historial" },
  ];

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t("aprov_page_title", "APROBACIONES")}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
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
          <Tab label={`${tabFilters[0].label} (${items.length})`} disableRipple />
          <Tab label={`${tabFilters[1].label} (${historial.length})`} disableRipple />
        </Tabs>
      </Box>

      {/* DataGrid */}
      <Paper elevation={0} sx={{ border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        {activeTab === 0 ? (
          <SPMDataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            height={600}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: "fecha_creacion", sort: "desc" }] },
            }}
            onRowDoubleClick={(params) => setDetalleModal({ open: true, solicitud: params.row })}
            emptyMessage={t("aprov_no_items", "No hay solicitudes pendientes de aprobación")}
          />
        ) : (
          <SPMDataGrid
            rows={rowsHistorial}
            columns={columnsHistorial}
            loading={loadingHistorial}
            height={600}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: "fecha_creacion", sort: "desc" }] },
            }}
            onRowDoubleClick={(params) => setDetalleModal({ open: true, solicitud: params.row })}
            emptyMessage={t("aprov_no_historial", "No hay registros en el historial")}
          />
        )}
      </Paper>

      {/* Modal de rechazo */}
      <Dialog
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, motivo: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Cancel color="error" />
          {t("aprov_rechazar", "Rechazar")} #{rejectModal.id}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t("aprov_motivo", "Motivo de rechazo")}
            value={rejectModal.motivo}
            onChange={(e) => setRejectModal((prev) => ({ ...prev, motivo: e.target.value }))}
            placeholder={t("planner_rechazar_placeholder", "Explica brevemente el motivo del rechazo...")}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectModal({ open: false, id: null, motivo: "" })} color="inherit">
            {t("common_cancelar", "Cancelar")}
          </Button>
          <Button onClick={confirmRechazar} color="error" variant="contained">
            {t("aprov_rechazar", "Rechazar")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de error de presupuesto */}
      <Dialog
        open={budgetErrorModal.open}
        onClose={() => setBudgetErrorModal({ open: false, message: "", solicitudId: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
          <Warning color="error" />
          {t("aprov_presupuesto_insuficiente", "Presupuesto Insuficiente")}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {budgetErrorModal.message}
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            {t("aprov_presupuesto_ayuda", "Para aprobar esta solicitud, solicita un aumento de presupuesto")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBudgetErrorModal({ open: false, message: "", solicitudId: null })} color="inherit">
            {t("common_cerrar", "Cerrar")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setBudgetErrorModal({ open: false, message: "", solicitudId: null });
              navigate("/presupuestos/nueva");
            }}
          >
            {t("aprov_solicitar_presupuesto", "Solicitar Presupuesto")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalle */}
      <Dialog
        open={detalleModal.open}
        onClose={() => setDetalleModal({ open: false, solicitud: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight={600}>
            Solicitud #{detalleModal.solicitud?.id}
          </Typography>
          <IconButton onClick={() => setDetalleModal({ open: false, solicitud: null })} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detalleModal.solicitud && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Estado y Criticidad */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StatusBadge estado={detalleModal.solicitud.estado || detalleModal.solicitud.status} />
                {detalleModal.solicitud.criticidad && (
                  <Chip
                    label={detalleModal.solicitud.criticidad}
                    size="small"
                    color={detalleModal.solicitud.criticidad === "Critica" ? "error" : detalleModal.solicitud.criticidad === "Alta" ? "warning" : "default"}
                  />
                )}
              </Box>

              {/* Info y Ubicación */}
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: "uppercase", fontSize: 11 }}>
                      Información General
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Tag fontSize="small" color="action" />
                        <Typography variant="body2"><strong>ID:</strong> {detalleModal.solicitud.id}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2"><strong>Creación:</strong> {formatDate(detalleModal.solicitud.created_at)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Typography variant="body2"><strong>Necesidad:</strong> {formatDate(detalleModal.solicitud.fecha_necesidad)}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: "uppercase", fontSize: 11 }}>
                      Ubicación
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Business fontSize="small" color="action" />
                        <Typography variant="body2"><strong>Centro:</strong> {detalleModal.solicitud.centro || "-"}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2"><strong>Sector:</strong> {getSectorNombre(detalleModal.solicitud.sector, sectores)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Inventory fontSize="small" color="action" />
                        <Typography variant="body2"><strong>Almacén:</strong> {formatAlmacen(detalleModal.solicitud.almacen_virtual) || "-"}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Justificación */}
              {detalleModal.solicitud.justificacion && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "primary.50" }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: "uppercase", fontSize: 11 }}>
                    Justificación
                  </Typography>
                  <Typography variant="body2">{detalleModal.solicitud.justificacion}</Typography>
                </Paper>
              )}

              {/* Items */}
              {detalleModal.solicitud.items && detalleModal.solicitud.items.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ textTransform: "uppercase", fontSize: 11 }}>
                    Materiales ({detalleModal.solicitud.items.length})
                  </Typography>
                  <Paper variant="outlined">
                    <Box sx={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f5f5f5" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Código</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Descripción</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #ddd" }}>Cant.</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #ddd" }}>Precio</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #ddd" }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalleModal.solicitud.items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", fontFamily: "monospace", fontSize: 12 }}>{item.codigo || item.codigo_sap}</td>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>{item.descripcion}</td>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: 600 }}>{item.cantidad}</td>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "right" }}>{formatCurrency(item.precio_unitario || 0)}</td>
                              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: 600 }}>{formatCurrency((item.cantidad || 0) * (item.precio_unitario || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ backgroundColor: "#f9f9f9" }}>
                            <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>Total:</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#1976d2" }}>{formatCurrency(detalleModal.solicitud.total_monto || 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetalleModal({ open: false, solicitud: null })} color="inherit">
            Cerrar
          </Button>
          {activeTab === 0 && detalleModal.solicitud && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => {
                  aprobar(detalleModal.solicitud.id);
                  setDetalleModal({ open: false, solicitud: null });
                }}
              >
                {t("aprov_aprobar", "Aprobar")}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={() => {
                  setDetalleModal({ open: false, solicitud: null });
                  setRejectModal({ open: true, id: detalleModal.solicitud.id, motivo: "" });
                }}
              >
                {t("aprov_rechazar", "Rechazar")}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
