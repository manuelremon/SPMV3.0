/**
 * TodasLasSolicitudes - Lista de todas las solicitudes del sistema
 * MUI Components - Enterprise UI
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { solicitudes } from "../services/spm";
import api from "../services/api";
import { useI18n } from "../context/i18n";
import { formatDate, formatCurrency, getSectorNombre, formatAlmacen } from "../utils/formatters";
import { getCriticidadConfig } from "../utils/styleConfig";
import StatusBadge from "../components/ui/StatusBadge";
import { SPMAgGrid } from "../components/ui/SPMAgGrid";

// MUI Components
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Modal from "@mui/material/Modal";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableFooter from "@mui/material/TableFooter";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import TagIcon from "@mui/icons-material/Tag";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AddIcon from "@mui/icons-material/Add";

/* ─────────────────────────────────────────────────────────────
   Detail Modal
───────────────────────────────────────────────────────────── */
function DetalleModal({ open, solicitud, sectores, onClose, onViewFull }) {
  if (!open || !solicitud) return null;

  const criticidadConfig = getCriticidadConfig(solicitud.criticidad || "Normal");

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="detalle-modal-title"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 700,
          maxHeight: "90vh",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
          }}
        >
          <Typography
            id="detalle-modal-title"
            variant="subtitle1"
            component="h3"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            Solicitud #{solicitud.id}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ px: 2.5, py: 2.5, overflowY: "auto", flex: 1 }}>
          <Stack spacing={2.5}>
            {/* Estado y Criticidad */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <StatusBadge
                estado={solicitud.estado || solicitud.status}
                tooltipInfo={{
                  aprobador: [solicitud.aprobador_nombre, solicitud.aprobador_apellido].filter(Boolean).join(" ") || null,
                  planificador: [solicitud.planner_nombre, solicitud.planner_apellido].filter(Boolean).join(" ") || null,
                  fechaEnvio: solicitud.created_at,
                }}
              />
              {solicitud.criticidad && (
                <Chip
                  label={criticidadConfig.label}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    color: criticidadConfig.color,
                    bgcolor: criticidadConfig.bg,
                  }}
                />
              )}
            </Box>

            {/* Info y Ubicación */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {/* Información General */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    mb: 1.5,
                  }}
                >
                  Información General
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TagIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>ID:</strong> {solicitud.id}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Creación:</strong> {formatDate(solicitud.created_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Necesidad:</strong> {formatDate(solicitud.fecha_necesidad)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Ubicación */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    mb: 1.5,
                  }}
                >
                  Ubicación
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Centro:</strong> {solicitud.centro || "-"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Sector:</strong> {getSectorNombre(solicitud.sector, sectores)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <WarehouseIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Almacén:</strong> {formatAlmacen(solicitud.almacen_virtual) || "-"}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Box>

            {/* Justificación */}
            {solicitud.justificacion && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: "info.lighter",
                  borderColor: "info.light",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    mb: 1,
                  }}
                >
                  Justificación
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {solicitud.justificacion}
                </Typography>
              </Paper>
            )}

            {/* Items */}
            {solicitud.items && solicitud.items.length > 0 && (
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "text.secondary",
                    mb: 1.5,
                  }}
                >
                  Materiales ({solicitud.items.length})
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                          Código
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                          Descripción
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                          Cant.
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                          Precio
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.6875rem", textTransform: "uppercase" }}>
                          Subtotal
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {solicitud.items.map((item, idx) => (
                        <TableRow
                          key={idx}
                          sx={{ "&:hover": { bgcolor: "grey.50" } }}
                        >
                          <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                            {item.codigo || item.codigo_sap}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.875rem", color: "text.primary" }}>
                            {item.descripcion}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary" }}>
                            {item.cantidad}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                            {formatCurrency(item.precio_unitario || 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary" }}>
                            {formatCurrency((item.cantidad || 0) * (item.precio_unitario || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "text.primary" }}>
                          Total:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "primary.main" }}>
                          {formatCurrency(solicitud.total_monto || 0)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            px: 2.5,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "grey.50",
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            sx={{ textTransform: "none" }}
          >
            Cerrar
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onViewFull}
            sx={{ textTransform: "none" }}
          >
            Ver detalle completo
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function TodasLasSolicitudes() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get("tab") || "todas";
  const tabIndexMap = { todas: 0, pendientes: 1, en_proceso: 2, completadas: 3, rechazadas: 4, cerradas: 5 };

  const [items, setItems] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(tabIndexMap[initialTab] || 0);
  const [detalleModal, setDetalleModal] = useState({ open: false, solicitud: null });

  // Cargar sectores
  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await api.get("/catalogos/sectores");
        const data = Array.isArray(res.data) ? res.data : [];
        setSectores(data);
      } catch (err) {
        console.error("Error cargando sectores:", err);
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

  // Filtrado por tab
  const filtered = useMemo(() => {
    let result = items;

    const currentTab = tabFilters[activeTab];
    if (currentTab && currentTab.key !== "todas") {
      result = result.filter((s) => {
        const estado = (s.estado || s.status || "").toLowerCase();
        return currentTab.filter(estado);
      });
    }

    // Ordenar por fecha de creación descendente
    result.sort((a, b) => {
      const fechaA = new Date(a.fecha_creacion || a.created_at || 0).getTime();
      const fechaB = new Date(b.fecha_creacion || b.created_at || 0).getTime();
      return fechaB - fechaA;
    });

    return result;
  }, [items, activeTab]);

  // Columnas del DataGrid - AG Grid format
  const columnDefs = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        flex: 0.4,
        minWidth: 60,
      },
      {
        field: "fecha_creacion",
        headerName: "Fecha",
        flex: 0.6,
        minWidth: 90,
        valueGetter: (params) => params.data.fecha_creacion || params.data.created_at,
        cellRenderer: (params) => (
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
            {formatDate(params.value)}
          </Typography>
        ),
      },
      {
        field: "solicitante",
        headerName: "Solicitante",
        flex: 0.9,
        minWidth: 120,
        valueGetter: (params) => {
          const nombre = params.data.solicitante_nombre || "";
          const apellido = params.data.solicitante_apellido || "";
          return `${nombre} ${apellido}`.trim() || "-";
        },
      },
      {
        field: "justificacion",
        headerName: "Justificación",
        flex: 1.5,
        minWidth: 150,
        cellRenderer: (params) => {
          const texto = params.value || "-";
          const truncado = texto.length > 30;
          return (
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                fontSize: "0.875rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={truncado ? texto : undefined}
            >
              {truncado ? texto.slice(0, 30) + "..." : texto}
            </Typography>
          );
        },
      },
      {
        field: "centro",
        headerName: "Centro",
        flex: 0.5,
        minWidth: 70,
        valueGetter: (params) => params.data.centro || params.data.centro_id || "-",
      },
      {
        field: "almacen_virtual",
        headerName: "Almacén",
        flex: 0.5,
        minWidth: 70,
        cellRenderer: (params) => formatAlmacen(params.value || params.data.almacen) || "-",
      },
      {
        field: "sector",
        headerName: "Sector",
        flex: 0.8,
        minWidth: 100,
        valueGetter: (params) => getSectorNombre(params.data.sector || params.data.sector_id, sectores),
      },
      {
        field: "criticidad",
        headerName: "Criticidad",
        flex: 0.5,
        minWidth: 80,
        cellRenderer: (params) => {
          const criticidad = params.value || "Normal";
          const config = getCriticidadConfig(criticidad);
          return (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontSize: "0.875rem", color: config.color }}
            >
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
        cellRenderer: (params) => (
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontSize: "0.875rem", color: "text.primary" }}
          >
            {formatCurrency(params.value || 0)}
          </Typography>
        ),
      },
      {
        field: "status",
        headerName: "Estado",
        flex: 0.7,
        minWidth: 100,
        valueGetter: (params) => params.data.estado || params.data.status || "pendiente",
        cellRenderer: (params) => {
          const data = params.data;
          const aprobador = [data.aprobador_nombre, data.aprobador_apellido].filter(Boolean).join(" ") || null;
          const planner = [data.planner_nombre, data.planner_apellido].filter(Boolean).join(" ") || null;
          return (
            <StatusBadge
              estado={params.value}
              showIcon={false}
              tooltipInfo={{ aprobador, planificador: planner, fechaEnvio: data.created_at }}
            />
          );
        },
      },
      {
        field: "planner_nombre",
        headerName: "Planificador",
        flex: 0.8,
        minWidth: 120,
        valueGetter: (params) => {
          const nombre = params.data.planner_nombre || "";
          const apellido = params.data.planner_apellido || "";
          return `${nombre} ${apellido}`.trim() || "-";
        },
      },
      {
        field: "acciones",
        headerName: "Acciones",
        flex: 0.5,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellRenderer: (params) => (
          <Button
            variant="text"
            size="small"
            onClick={() => setDetalleModal({ open: true, solicitud: params.data })}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              minWidth: "auto",
              px: 1,
            }}
          >
            Ver
          </Button>
        ),
      },
    ],
    [sectores]
  );

  const rows = useMemo(() => filtered.map((item) => ({ ...item, id: item.id })), [filtered]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{
              color: "text.disabled",
              "&:hover": {
                color: "text.secondary",
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              {t("todas_page_title", "Todas las Solicitudes")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("todas_page_subtitle", "Vista general de todas las solicitudes del sistema")}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => navigate("/solicitudes/nueva")}
          sx={{ textTransform: "none" }}
        >
          {t("btn_crear_solicitud", "Crear Solicitud")}
        </Button>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Main Card */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                minHeight: 48,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
              },
            }}
          >
            {tabFilters.map((tab, idx) => (
              <Tab
                key={tab.key}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {tab.label}
                    <Chip
                      label={stats[idx]}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        bgcolor: activeTab === idx ? "primary.light" : "grey.200",
                        color: activeTab === idx ? "primary.dark" : "text.secondary",
                      }}
                    />
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* AG Grid */}
        <SPMAgGrid
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          height={600}
          paginationPageSize={25}
          paginationPageSizeSelector={[10, 25, 50, 100]}
          onRowDoubleClick={(data) => setDetalleModal({ open: true, solicitud: data })}
          exportFileName="solicitudes"
          emptyMessage={t("todas_empty", "No hay solicitudes")}
        />
      </Paper>

      {/* Modal de detalle */}
      <DetalleModal
        open={detalleModal.open}
        solicitud={detalleModal.solicitud}
        sectores={sectores}
        onClose={() => setDetalleModal({ open: false, solicitud: null })}
        onViewFull={() => {
          setDetalleModal({ open: false, solicitud: null });
          navigate(`/solicitudes/${detalleModal.solicitud?.id}`);
        }}
      />
    </Box>
  );
}
