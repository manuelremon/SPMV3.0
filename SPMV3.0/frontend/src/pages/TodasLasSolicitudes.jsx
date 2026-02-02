import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Add,
} from "@mui/icons-material";

const DEBOUNCE_MS = 300;

export default function TodasLasSolicitudes() {
  const { user } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get("tab") || "todas";
  const tabIndexMap = { todas: 0, pendientes: 1, en_proceso: 2, completadas: 3, rechazadas: 4, cerradas: 5 };

  const [items, setItems] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, DEBOUNCE_MS);

  const [activeTab, setActiveTab] = useState(tabIndexMap[initialTab] || 0);
  const [detalleModal, setDetalleModal] = useState({ open: false, solicitud: null });

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

  // Cargar solicitudes
  const fetchSolicitudes = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await solicitudes.listar({ page_size: 500 });
      const data = res.data.solicitudes || res.data.results || [];
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  // Mapeo de tabs a estados
  const tabFilters = [
    { label: "Todas", key: "todas", filter: () => true },
    { label: "Pendientes", key: "pendientes", filter: (e) => e === "submitted" || e === "enviada" },
    { label: "En Proceso", key: "en_proceso", filter: (e) => ["processing", "in_planning", "in_treatment"].includes(e) },
    { label: "Aprobadas", key: "completadas", filter: (e) => ["approved", "aprobada", "treated"].includes(e) },
    { label: "Rechazadas", key: "rechazadas", filter: (e) => e === "rejected" || e === "rechazada" || e === "cancelled" },
    { label: "Cerradas", key: "cerradas", filter: (e) => e === "closed" || e === "completed" },
  ];

  // Calcular estadísticas
  const stats = useMemo(() => {
    return tabFilters.map((tab) => {
      if (tab.key === "todas") return items.length;
      return items.filter((s) => tab.filter((s.estado || s.status || "").toLowerCase())).length;
    });
  }, [items]);

  // Filtrado
  const filtered = useMemo(() => {
    let result = items;

    const currentTab = tabFilters[activeTab];
    if (currentTab && currentTab.key !== "todas") {
      result = result.filter((s) => {
        const estado = (s.estado || s.status || "").toLowerCase();
        return currentTab.filter(estado);
      });
    }

    const term = debouncedQ.trim().toLowerCase();
    if (term) {
      result = result.filter((s) => {
        return (
          String(s.id).includes(term) ||
          (s.justificacion || "").toLowerCase().includes(term) ||
          (s.centro || "").toLowerCase().includes(term) ||
          (s.sector || "").toLowerCase().includes(term) ||
          (`${s.solicitante_nombre || ""} ${s.solicitante_apellido || ""}`).toLowerCase().includes(term)
        );
      });
    }

    result.sort((a, b) => {
      const fechaA = new Date(a.fecha_creacion || a.created_at || 0).getTime();
      const fechaB = new Date(b.fecha_creacion || b.created_at || 0).getTime();
      return fechaB - fechaA;
    });

    return result;
  }, [items, debouncedQ, activeTab]);

  // Columnas del DataGrid
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
      field: "justificacion",
      headerName: "Justificacion",
      flex: 1.5,
      minWidth: 150,
      renderCell: (params) => {
        const texto = params.value || "-";
        const truncado = texto.length > 30;
        return (
          <Tooltip title={truncado ? texto : ""} arrow>
            <Typography variant="body2" noWrap>
              {truncado ? texto.slice(0, 30) + "..." : texto}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 70,
      headerAlign: "center",
      align: "center",
      valueGetter: (value, row) => row.centro || row.centro_id || "-",
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
      field: "planner_nombre",
      headerName: "Planificador",
      flex: 0.8,
      minWidth: 120,
      valueGetter: (value, row) => {
        const nombre = row.planner_nombre || "";
        const apellido = row.planner_apellido || "";
        return `${nombre} ${apellido}`.trim() || "-";
      },
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

  const handleTabChange = (e, newValue) => {
    if (newValue === 6) {
      navigate("/solicitudes/nueva");
    } else {
      setActiveTab(newValue);
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("todas_page_title", "TODAS LAS SOLICITUDES")}
          </Typography>
        </Box>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
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
          {tabFilters.map((tab, idx) => (
            <Tab
              key={tab.key}
              label={`${tab.label} (${stats[idx]})`}
              disableRipple
            />
          ))}
          <Tab
            label={t("btn_crear_solicitud", "+ Crear")}
            disableRipple
            sx={{ color: "#1976d2", fontWeight: 700 }}
          />
        </Tabs>
      </Box>

      {/* DataGrid */}
      <Paper elevation={0} sx={{ border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
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
          emptyMessage={t("todas_empty", "No hay solicitudes")}
        />
      </Paper>

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
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#567ebb" }}>{formatCurrency(detalleModal.solicitud.total_monto || 0)}</td>
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
          <Button
            variant="contained"
            onClick={() => {
              setDetalleModal({ open: false, solicitud: null });
              navigate(`/solicitudes/${detalleModal.solicitud?.id}`);
            }}
          >
            Ver detalle completo
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
