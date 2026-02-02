import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { budget } from "../services/spm";
import { useAuthStore } from "../store/authStore";
import { useI18n } from "../context/i18n";
import { formatCurrency, formatDate } from "../utils/formatters";
import { useDebounced } from "../hooks/useDebounced";
import StatusBadge from "../components/ui/StatusBadge";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  SvgIcon,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";

const DEBOUNCE_MS = 300;
const LEDGER_PAGE_SIZE = 50;

// Icono de descarga personalizado
const DownloadIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z" />
  </SvgIcon>
);

const exportToCSV = (data, columns, filename) => {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = c.exportValue ? c.exportValue(row) : (row[c.key] || '');
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  ).join('\n');

  const csv = `${headers}\n${rows}`;
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const estadoToBadge = {
  pendiente: "Pendiente",
  aprobado_l1: "Aprobado L1",
  aprobado_l2: "Aprobado L2",
  aprobado: "Aprobada",
  rechazado: "Rechazada",
};

const nivelLabels = {
  L1: "Nivel 1",
  L2: "Nivel 2",
  ADMIN: "Admin",
};

export default function BudgetRequests() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, DEBOUNCE_MS);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState(0);
  const [subTab, setSubTab] = useState(0);

  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [approveModal, setApproveModal] = useState({ open: false, id: null, comentario: "" });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, motivo: "" });

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const subTabFilters = ["todas", "pendientes", "aprobadas", "rechazadas"];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      const currentFilter = subTabFilters[subTab];
      if (currentFilter === "pendientes") params.estado = "pendiente";
      else if (currentFilter === "aprobadas") params.estado = "aprobado";
      else if (currentFilter === "rechazadas") params.estado = "rechazado";

      const res = await budget.listar(params);
      const data = res.data.requests || [];
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    setError("");
    try {
      const res = await budget.getLedger({ limit: 500 });
      setLedgerEntries(res.data.entries || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 1) {
      load();
    } else {
      loadLedger();
    }
  }, [load, loadLedger, mainTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mainTab === 1) {
      await load();
    } else {
      await loadLedger();
    }
    setRefreshing(false);
  }, [load, loadLedger, mainTab]);

  const filtered = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    if (!term) return items;
    return items.filter((s) => {
      return (
        String(s.id).includes(term) ||
        (s.justificacion || "").toLowerCase().includes(term) ||
        (s.centro || "").toLowerCase().includes(term) ||
        (s.sector || "").toLowerCase().includes(term)
      );
    });
  }, [items, debouncedQ]);

  const confirmAprobar = useCallback(async () => {
    if (!approveModal.id) return;
    setError("");
    try {
      await budget.aprobar(approveModal.id, approveModal.comentario);
      setSuccess(t("bur_aprobada_msg", "Solicitud de presupuesto aprobada"));
      await Promise.all([load(), loadLedger()]);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setApproveModal({ open: false, id: null, comentario: "" });
    }
  }, [approveModal.id, approveModal.comentario, load, loadLedger, t]);

  const confirmRechazar = useCallback(async () => {
    if (!rejectModal.id) return;
    setError("");
    const motivo = rejectModal.motivo.trim();
    if (motivo.length < 5) {
      setError(t("bur_motivo_required", "Debe proporcionar un motivo (mínimo 5 caracteres)"));
      return;
    }
    try {
      await budget.rechazar(rejectModal.id, motivo);
      setSuccess(t("bur_rechazada_msg", "Solicitud de presupuesto rechazada"));
      await Promise.all([load(), loadLedger()]);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setRejectModal({ open: false, id: null, motivo: "" });
    }
  }, [rejectModal.id, rejectModal.motivo, load, loadLedger, t]);

  const burExportColumns = useMemo(() => [
    { key: "id", header: "ID", exportValue: (row) => row.id },
    { key: "centro", header: "Centro", exportValue: (row) => row.centro || "" },
    { key: "sector", header: "Sector", exportValue: (row) => row.sector || "" },
    { key: "monto_solicitado_usd", header: "Monto (USD)", exportValue: (row) => row.monto_solicitado_usd || 0 },
    { key: "nivel_aprobacion_requerido", header: "Nivel", exportValue: (row) => nivelLabels[row.nivel_aprobacion_requerido] || row.nivel_aprobacion_requerido },
    { key: "estado", header: "Estado", exportValue: (row) => estadoToBadge[row.estado] || row.estado },
  ], []);

  const ledgerExportColumns = useMemo(() => [
    { key: "id", header: "ID", exportValue: (row) => row.id },
    { key: "created_at", header: "Fecha", exportValue: (row) => row.created_at || "" },
    { key: "tipo_movimiento", header: "Tipo", exportValue: (row) => row.tipo_movimiento || "" },
    { key: "centro", header: "Centro", exportValue: (row) => row.centro || "" },
    { key: "sector", header: "Sector", exportValue: (row) => row.sector || "" },
    { key: "monto_usd", header: "Monto (USD)", exportValue: (row) => (row.monto_cents || 0) / 100 },
    { key: "saldo_usd", header: "Saldo (USD)", exportValue: (row) => (row.saldo_posterior_cents || 0) / 100 },
  ], []);

  const handleExport = useCallback(() => {
    if (mainTab === 0) {
      exportToCSV(ledgerEntries, ledgerExportColumns, "historial_presupuesto");
    } else {
      exportToCSV(filtered, burExportColumns, "incorporaciones_presupuesto");
    }
  }, [mainTab, ledgerEntries, filtered, ledgerExportColumns, burExportColumns]);

  // Columns for BUR (incorporaciones)
  const columns = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.4,
      minWidth: 60,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>#{params.value}</Typography>
      ),
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "monto_solicitado_usd",
      headerName: "Monto",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" color="success.main" fontWeight={600}>
          +{formatCurrency(params.value || 0)}
        </Typography>
      ),
    },
    {
      field: "nivel_aprobacion_requerido",
      headerName: "Nivel",
      flex: 0.5,
      minWidth: 80,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Chip label={nivelLabels[params.value] || params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => <StatusBadge estado={estadoToBadge[params.value] || params.value} showIcon={false} />,
    },
    {
      field: "created_at",
      headerName: "Fecha",
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
      field: "acciones",
      headerName: "Acciones",
      flex: 1,
      minWidth: 160,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={{ textTransform: "none" }} onClick={() => navigate(`/presupuestos/${params.row.id}`)}>
            Ver
          </Button>
          {["pendiente", "aprobado_l1", "aprobado_l2"].includes(params.row.estado) && (
            <>
              <Button size="small" variant="outlined" color="success" sx={{ textTransform: "none" }} onClick={() => setApproveModal({ open: true, id: params.row.id, comentario: "" })}>
                Aprobar
              </Button>
              <Button size="small" variant="outlined" color="error" sx={{ textTransform: "none" }} onClick={() => setRejectModal({ open: true, id: params.row.id, motivo: "" })}>
                Rechazar
              </Button>
            </>
          )}
        </Box>
      ),
    },
  ], [navigate]);

  // Columns for Ledger (historial)
  const ledgerColumns = useMemo(() => [
    {
      field: "created_at",
      headerName: "Fecha",
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
      field: "tipo_movimiento",
      headerName: "Tipo",
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const tipo = params.value || "";
        const isConsumo = tipo.includes("consumo");
        const isIncorporacion = tipo.includes("incorporacion") || tipo.includes("ajuste_positivo");
        return (
          <Chip
            label={tipo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            size="small"
            color={isConsumo ? "error" : isIncorporacion ? "success" : "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 80,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "monto_cents",
      headerName: "Monto",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const montoCents = params.value || 0;
        const monto = montoCents / 100;
        const isNegative = montoCents < 0;
        return (
          <Typography variant="body2" fontFamily="monospace" fontWeight={600} color={isNegative ? "error.main" : "success.main"}>
            {isNegative ? "-" : "+"}{formatCurrency(Math.abs(monto))}
          </Typography>
        );
      },
    },
    {
      field: "saldo_posterior_cents",
      headerName: "Saldo",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
          {formatCurrency((params.value || 0) / 100)}
        </Typography>
      ),
    },
    {
      field: "referencia_id",
      headerName: "Referencia",
      flex: 0.7,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        if (!params.value) return "-";
        const tipo = params.row.referencia_tipo || "";
        return (
          <Chip
            label={`${tipo} #${params.value}`}
            size="small"
            variant="outlined"
            onClick={() => tipo === "solicitud" && navigate(`/solicitudes/${params.value}`)}
            sx={{ cursor: tipo === "solicitud" ? "pointer" : "default" }}
          />
        );
      },
    },
    {
      field: "motivo",
      headerName: "Motivo",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Tooltip title={params.value || ""} arrow>
          <Typography variant="body2" color="text.secondary" noWrap>
            {params.value || "-"}
          </Typography>
        </Tooltip>
      ),
    },
  ], [navigate]);

  const rows = useMemo(() => filtered.map((item) => ({ ...item, id: item.id })), [filtered]);
  const ledgerRows = useMemo(() => ledgerEntries.map((item, idx) => ({ ...item, id: item.id || idx })), [ledgerEntries]);

  const dataGridSx = {
    border: "1px solid #dce0e6",
    borderRadius: "8px",
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
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1550 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "text.secondary" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight={700}>
              {t("bur_title", "Presupuestos")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Descargar CSV">
              <IconButton
                onClick={handleExport}
                disabled={loading || ledgerLoading}
                size="small"
                sx={{
                  color: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: '#fff'
                  },
                  '&.Mui-disabled': {
                    border: '1px solid rgba(0, 0, 0, 0.26)',
                  }
                }}
              >
                <DownloadIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>CSV</span>
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={refreshing || loading || ledgerLoading}
              sx={{ textTransform: "none" }}
            >
              {t("common_refresh", "Actualizar")}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => navigate("/presupuestos/nueva")}
              sx={{ textTransform: "none" }}
            >
              {t("bur_crear", "Incorporar Saldo")}
            </Button>
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

      {/* Main Tabs */}
      <Box sx={{ mb: 2, borderBottom: 2, borderColor: "#1976d2" }}>
        <Tabs
          value={mainTab}
          onChange={(e, v) => setMainTab(v)}
          variant="standard"
          sx={{
            minHeight: 42,
            "& .MuiTab-root": {
              minHeight: 42,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#606d80",
              "&.Mui-selected": {
                color: "#1976d2",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#1976d2",
            },
          }}
        >
          <Tab label={t("bur_main_historial", "Historial")} disableRipple />
          <Tab label={t("bur_main_solicitudes", "Incorporaciones")} disableRipple />
        </Tabs>
      </Box>

      {/* Content */}
      {mainTab === 0 ? (
        <Paper elevation={0} sx={{ height: "calc(100vh - 280px)", minHeight: 500, border: "1px solid #dce0e6", borderRadius: "8px", overflow: "hidden" }}>
          <DataGrid
            rows={ledgerRows}
            columns={ledgerColumns}
            loading={ledgerLoading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 50 } },
              sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
            }}
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: t("ledger_empty", "No hay movimientos de presupuesto"),
              MuiTablePagination: { labelRowsPerPage: "Filas por página:" },
            }}
            sx={dataGridSx}
          />
        </Paper>
      ) : (
        <>
          {/* Sub Tabs */}
          <Box sx={{ mb: 2 }}>
            <Tabs
              value={subTab}
              onChange={(e, v) => setSubTab(v)}
              variant="standard"
              sx={{
                minHeight: 36,
                "& .MuiTab-root": {
                  minHeight: 36,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.8rem",
                  color: "#606d80",
                  "&.Mui-selected": {
                    color: "#1976d2",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#1976d2",
                },
              }}
            >
              <Tab label={t("bur_tab_todas", "Todas")} disableRipple />
              <Tab label={t("bur_tab_pendientes", "Pendientes")} disableRipple />
              <Tab label={t("bur_tab_aprobadas", "Aprobadas")} disableRipple />
              <Tab label={t("bur_tab_rechazadas", "Rechazadas")} disableRipple />
            </Tabs>
          </Box>

          <Paper elevation={0} sx={{ height: "calc(100vh - 330px)", minHeight: 400, border: "1px solid #dce0e6", borderRadius: "8px", overflow: "hidden" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
                sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
              }}
              disableRowSelectionOnClick
              localeText={{
                noRowsLabel: t("bur_empty", "No hay solicitudes de presupuesto"),
                MuiTablePagination: { labelRowsPerPage: "Filas por página:" },
              }}
              sx={dataGridSx}
            />
          </Paper>
        </>
      )}

      {/* Modal Aprobar */}
      <Dialog
        open={approveModal.open}
        onClose={() => setApproveModal({ open: false, id: null, comentario: "" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "8px" }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #dce0e6" }}>
          {t("bur_aprobar", "Aprobar")} #{approveModal.id}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {(() => {
            const selectedBur = items.find(b => b.id === approveModal.id);
            if (!selectedBur) return null;
            const saldoActual = selectedBur.saldo_actual_usd || 0;
            const montoSolicitado = selectedBur.monto_solicitado_usd || 0;
            const nuevoSaldo = saldoActual + montoSolicitado;
            return (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "#f5f7fa", borderColor: "#dce0e6" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Centro</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedBur.centro}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sector</Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedBur.sector}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Monto a incorporar</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">+{formatCurrency(montoSolicitado)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Saldo actual</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(saldoActual)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #dce0e6", display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" fontWeight={600}>Nuevo saldo:</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(nuevoSaldo)}</Typography>
                </Box>
              </Paper>
            );
          })()}
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t("bur_comentario_aprobacion", "Comentario (opcional)")}
            value={approveModal.comentario}
            onChange={(e) => setApproveModal((prev) => ({ ...prev, comentario: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: "1px solid #dce0e6" }}>
          <Button
            onClick={() => setApproveModal({ open: false, id: null, comentario: "" })}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", color: "#606d80", borderColor: "#dce0e6" }}
          >
            {t("common_cancelar", "Cancelar")}
          </Button>
          <Button onClick={confirmAprobar} variant="contained" color="success" sx={{ textTransform: "none" }}>
            {t("bur_aprobar", "Aprobar")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Rechazar */}
      <Dialog
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: null, motivo: "" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "8px" }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: "1px solid #dce0e6" }}>
          {t("bur_rechazar", "Rechazar")} #{rejectModal.id}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t("bur_motivo_rechazo", "Motivo de rechazo")}
            value={rejectModal.motivo}
            onChange={(e) => setRejectModal((prev) => ({ ...prev, motivo: e.target.value }))}
            placeholder={t("bur_motivo_placeholder", "Indica el motivo del rechazo...")}
            error={rejectModal.motivo.length > 0 && rejectModal.motivo.length < 5}
            helperText={rejectModal.motivo.length > 0 && rejectModal.motivo.length < 5 ? "Mínimo 5 caracteres" : ""}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, borderTop: "1px solid #dce0e6" }}>
          <Button
            onClick={() => setRejectModal({ open: false, id: null, motivo: "" })}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", color: "#606d80", borderColor: "#dce0e6" }}
          >
            {t("common_cancelar", "Cancelar")}
          </Button>
          <Button onClick={confirmRechazar} variant="contained" color="error" sx={{ textTransform: "none" }}>
            {t("bur_rechazar", "Rechazar")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
