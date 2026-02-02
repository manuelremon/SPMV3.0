/**
 * BudgetRequests - Gestion de Presupuestos
 * Vista de historial de movimientos y solicitudes de incorporacion (BUR)
 *
 * SAP/Enterprise UI - Sprint 23+
 * Migrado a Material-UI
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { budget } from "../services/spm";
import { useAuthStore } from "../store/authStore";
import { useI18n } from "../context/i18n";
import { formatCurrency, formatDate } from "../utils/formatters";

// MUI Components
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Chip,
  TextField,
  Alert,
  Drawer,
  Stack,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import HistoryIcon from "@mui/icons-material/History";
import DescriptionIcon from "@mui/icons-material/Description";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Shared components
import { SPMAgGrid } from "../components/ui/SPMAgGrid";
import { nivelLabels } from "../utils/statusStyles";

const DEBOUNCE_MS = 300;

/* ─────────────────────────────────────────────────────────────
   Export CSV Helper
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const estadoToBadge = {
  pendiente: "Pendiente",
  aprobado_l1: "Aprobado L1",
  aprobado_l2: "Aprobado L2",
  aprobado: "Aprobada",
  rechazado: "Rechazada",
};

const getEstadoColor = (estado) => {
  switch (estado) {
    case "pendiente":
    case "aprobado_l1":
    case "aprobado_l2":
      return "warning";
    case "aprobado":
      return "success";
    case "rechazado":
      return "error";
    default:
      return "default";
  }
};

const getTipoColor = (tipo) => {
  if (tipo.includes("incorporacion") || tipo.includes("ajuste_positivo")) {
    return "success";
  }
  if (tipo.includes("consumo") || tipo.includes("ajuste_negativo")) {
    return "error";
  }
  return "default";
};

/* ─────────────────────────────────────────────────────────────
   Summary Card Component
───────────────────────────────────────────────────────────── */
const SummaryCard = ({ icon, label, value, subvalue, color }) => {
  const colorMap = {
    amber: { bg: 'warning.lighter', iconBg: 'warning.main' },
    emerald: { bg: 'success.lighter', iconBg: 'success.main' },
    red: { bg: 'error.lighter', iconBg: 'error.main' },
    blue: { bg: 'info.lighter', iconBg: 'info.main' },
    warning: { bg: 'warning.lighter', iconBg: 'warning.main' },
    success: { bg: 'success.lighter', iconBg: 'success.main' },
    error: { bg: 'error.lighter', iconBg: 'error.main' },
    info: { bg: 'info.lighter', iconBg: 'info.main' },
  };
  const colors = colorMap[color] || colorMap.info;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: 1,
        borderColor: 'grey.200',
        borderRadius: 2,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: colors.bg,
            color: colors.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subvalue}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};


/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function BudgetRequests() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useI18n();

  // Data states
  const [items, setItems] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);

  // UI states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  // Tabs
  const [mainTab, setMainTab] = useState(0);

  // Modals
  const [approveDrawer, setApproveDrawer] = useState({ open: false, id: null, comentario: "" });
  const [rejectDrawer, setRejectDrawer] = useState({ open: false, id: null, motivo: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Load BUR requests
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await budget.listar({});
      const data = res.data.requests || [];
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Ledger entries
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

  // Load on tab change
  useEffect(() => {
    if (mainTab === 1) {
      load();
    } else {
      loadLedger();
    }
  }, [load, loadLedger, mainTab]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mainTab === 1) {
      await load();
    } else {
      await loadLedger();
    }
    setRefreshing(false);
  }, [load, loadLedger, mainTab]);

  // Filtered BUR items (for sub-tabs)
  const filteredBur = useMemo(() => {
    return items;
  }, [items]);

  // Summary stats
  const stats = useMemo(() => {
    const pendientes = items.filter(i => ["pendiente", "aprobado_l1", "aprobado_l2"].includes(i.estado));
    const totalPendiente = pendientes.reduce((sum, i) => sum + (i.monto_solicitado_usd || 0), 0);

    const incorporaciones = ledgerEntries.filter(e =>
      (e.tipo_movimiento || "").includes("incorporacion") ||
      (e.tipo_movimiento || "").includes("ajuste_positivo")
    );
    const totalIncorporado = incorporaciones.reduce((sum, e) => sum + Math.abs((e.monto_cents || 0) / 100), 0);

    const consumos = ledgerEntries.filter(e => (e.tipo_movimiento || "").includes("consumo"));
    const totalConsumido = consumos.reduce((sum, e) => sum + Math.abs((e.monto_cents || 0) / 100), 0);

    return {
      pendientesCount: pendientes.length,
      totalPendiente,
      totalIncorporado,
      totalConsumido,
      movimientos: ledgerEntries.length,
    };
  }, [items, ledgerEntries]);

  // Approve action
  const confirmAprobar = useCallback(async () => {
    if (!approveDrawer.id) return;
    setActionLoading(true);
    setError("");
    try {
      await budget.aprobar(approveDrawer.id, approveDrawer.comentario);
      setSuccess(t("bur_aprobada_msg", "Solicitud de presupuesto aprobada correctamente"));
      await Promise.all([load(), loadLedger()]);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setActionLoading(false);
      setApproveDrawer({ open: false, id: null, comentario: "" });
    }
  }, [approveDrawer.id, approveDrawer.comentario, load, loadLedger, t]);

  // Reject action
  const confirmRechazar = useCallback(async () => {
    if (!rejectDrawer.id) return;
    const motivo = rejectDrawer.motivo.trim();
    if (motivo.length < 5) {
      setError(t("bur_motivo_required", "Debe proporcionar un motivo (minimo 5 caracteres)"));
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await budget.rechazar(rejectDrawer.id, motivo);
      setSuccess(t("bur_rechazada_msg", "Solicitud de presupuesto rechazada"));
      await Promise.all([load(), loadLedger()]);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setActionLoading(false);
      setRejectDrawer({ open: false, id: null, motivo: "" });
    }
  }, [rejectDrawer.id, rejectDrawer.motivo, load, loadLedger, t]);

  // Export columns
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
      exportToCSV(filteredBur, burExportColumns, "incorporaciones_presupuesto");
    }
  }, [mainTab, ledgerEntries, filteredBur, ledgerExportColumns, burExportColumns]);

  // AG Grid Column Definitions - Ledger (Historial)
  const ledgerColumnDefs = useMemo(() => [
    {
      field: "created_at",
      headerName: "Fecha",
      flex: 0.7,
      minWidth: 100,
      cellRenderer: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "tipo_movimiento",
      headerName: "Tipo",
      flex: 0.8,
      minWidth: 120,
      cellRenderer: (params) => {
        const tipo = params.value || "";
        return (
          <Chip
            label={tipo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            size="small"
            color={getTipoColor(tipo)}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 80,
      valueGetter: (params) => params.data.centro || "-",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.5,
      minWidth: 80,
      valueGetter: (params) => params.data.sector || "-",
    },
    {
      field: "monto_cents",
      headerName: "Monto",
      flex: 0.7,
      minWidth: 110,
      cellRenderer: (params) => {
        const montoCents = params.value || 0;
        const monto = montoCents / 100;
        const isNegative = montoCents < 0;
        return (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: isNegative ? 'error.main' : 'success.main',
            }}
          >
            {isNegative ? "" : "+"}{formatCurrency(monto)}
          </Typography>
        );
      },
    },
    {
      field: "saldo_posterior_cents",
      headerName: "Saldo",
      flex: 0.7,
      minWidth: 110,
      cellRenderer: (params) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontWeight: 600 }}
        >
          {formatCurrency((params.value || 0) / 100)}
        </Typography>
      ),
    },
    {
      field: "referencia_id",
      headerName: "Referencia",
      flex: 0.6,
      minWidth: 100,
      cellRenderer: (params) => {
        if (!params.value) return <Typography color="text.disabled">-</Typography>;
        return (
          <Chip
            label={`${params.data.referencia_tipo} #${params.value}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: 11 }}
          />
        );
      },
    },
    {
      field: "motivo",
      headerName: "Motivo",
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.data.motivo || "-",
    },
  ], []);

  // AG Grid Column Definitions - BUR (Incorporaciones)
  const burColumnDefs = useMemo(() => [
    {
      field: "id",
      headerName: "ID",
      flex: 0.4,
      minWidth: 60,
      cellRenderer: (params) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'grey.100',
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: "centro",
      headerName: "Centro",
      flex: 0.5,
      minWidth: 80,
      valueGetter: (params) => params.data.centro || "-",
    },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.5,
      minWidth: 80,
      valueGetter: (params) => params.data.sector || "-",
    },
    {
      field: "monto_solicitado_usd",
      headerName: "Monto",
      flex: 0.7,
      minWidth: 110,
      cellRenderer: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'success.main',
          }}
        >
          +{formatCurrency(params.value || 0)}
        </Typography>
      ),
    },
    {
      field: "nivel_aprobacion_requerido",
      headerName: "Nivel",
      flex: 0.5,
      minWidth: 80,
      cellRenderer: (params) => (
        <Chip
          label={nivelLabels[params.value] || params.value}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 0.6,
      minWidth: 100,
      cellRenderer: (params) => (
        <Chip
          label={estadoToBadge[params.value] || params.value}
          size="small"
          color={getEstadoColor(params.value)}
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: "created_at",
      headerName: "Fecha",
      flex: 0.6,
      minWidth: 100,
      cellRenderer: (params) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 0.9,
      minWidth: 180,
      sortable: false,
      filter: false,
      cellRenderer: (params) => {
        const canAct = ["pendiente", "aprobado_l1", "aprobado_l2"].includes(params.data.estado);
        return (
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate(`/presupuestos/${params.data.id}`)}
              sx={{ fontSize: 11, py: 0.5, textTransform: 'none' }}
            >
              Ver
            </Button>
            {canAct && (
              <>
                <IconButton
                  size="small"
                  onClick={() => setApproveDrawer({ open: true, id: params.data.id, comentario: "" })}
                  sx={{ color: 'success.main', '&:hover': { bgcolor: 'success.lighter' } }}
                  title="Aprobar"
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setRejectDrawer({ open: true, id: params.data.id, motivo: "" })}
                  sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.lighter' } }}
                  title="Rechazar"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>
        );
      },
    },
  ], [navigate]);

  // Get selected BUR for approve drawer
  const selectedBur = useMemo(() => {
    return items.find(b => b.id === approveDrawer.id);
  }, [items, approveDrawer.id]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: 3, py: 3 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{
                color: 'text.secondary',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.100', borderColor: 'grey.400' },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t("bur_title", "Gestión de Presupuestos")}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t("bur_subtitle", "Control de movimientos e incorporaciones de saldo")}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={loading || ledgerLoading}
              sx={{
                color: 'text.secondary',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.100', borderColor: 'grey.400' },
              }}
            >
              {t("common_exportar", "Exportar CSV")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />}
              onClick={handleRefresh}
              disabled={refreshing || loading || ledgerLoading}
              sx={{
                color: 'text.secondary',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'grey.100', borderColor: 'grey.400' },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t("common_actualizar", "Actualizar")}</Box>
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => navigate("/presupuestos/nueva")}
            >
              {t("bur_crear", "Incorporar Saldo")}
            </Button>
          </Stack>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <SummaryCard
            icon={<AccessTimeIcon />}
            label="Solicitudes Pendientes"
            value={stats.pendientesCount}
            subvalue={`${formatCurrency(stats.totalPendiente)} en espera`}
            color="amber"
          />
          <SummaryCard
            icon={<TrendingUpIcon />}
            label="Total Incorporado"
            value={formatCurrency(stats.totalIncorporado)}
            subvalue="Saldo agregado"
            color="emerald"
          />
          <SummaryCard
            icon={<TrendingDownIcon />}
            label="Total Consumido"
            value={formatCurrency(stats.totalConsumido)}
            subvalue="Saldo utilizado"
            color="red"
          />
          <SummaryCard
            icon={<HistoryIcon />}
            label="Movimientos"
            value={stats.movimientos}
            subvalue="En el historial"
            color="blue"
          />
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2, borderRadius: 2 }}>
            {success}
          </Alert>
        )}

        {/* Main Card with Tabs */}
        <Paper elevation={0} sx={{ border: 1, borderColor: 'grey.200', overflow: 'hidden', borderRadius: 2 }}>
          {/* Main Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50', px: 1 }}>
            <Tabs
              value={mainTab}
              onChange={(_, v) => setMainTab(v)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minHeight: 48,
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              <Tab
                icon={<HistoryIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{t("bur_main_historial", "Historial")}</span>
                    <Chip
                      label={ledgerEntries.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: mainTab === 0 ? 'primary.main' : 'grey.200',
                        color: mainTab === 0 ? 'white' : 'text.secondary',
                      }}
                    />
                  </Stack>
                }
              />
              <Tab
                icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{t("bur_main_solicitudes", "Incorporaciones")}</span>
                    <Chip
                      label={items.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: mainTab === 1 ? 'primary.main' : 'grey.200',
                        color: mainTab === 1 ? 'white' : 'text.secondary',
                      }}
                    />
                  </Stack>
                }
              />
            </Tabs>
          </Box>

          {/* Historial Tab Content */}
          {mainTab === 0 && (
            <SPMAgGrid
              rowData={ledgerEntries}
              columnDefs={ledgerColumnDefs}
              loading={ledgerLoading}
              height={600}
              paginationPageSize={25}
              paginationPageSizeSelector={[10, 25, 50, 100]}
              exportFileName="historial_presupuesto"
              emptyMessage={t("ledger_empty", "No hay movimientos de presupuesto")}
              gridOptions={{
                getRowId: (params) => String(params.data.id),
              }}
            />
          )}

          {/* Incorporaciones Tab Content */}
          {mainTab === 1 && (
            <SPMAgGrid
              rowData={filteredBur}
              columnDefs={burColumnDefs}
              loading={loading}
              height={600}
              paginationPageSize={25}
              paginationPageSizeSelector={[10, 25, 50, 100]}
              exportFileName="incorporaciones_presupuesto"
              emptyMessage={t("bur_empty", "No hay solicitudes de presupuesto")}
              gridOptions={{
                getRowId: (params) => String(params.data.id),
              }}
            />
          )}
        </Paper>

        {/* Approve Drawer */}
        <Drawer
          anchor="right"
          open={approveDrawer.open}
          onClose={() => setApproveDrawer({ open: false, id: null, comentario: "" })}
          PaperProps={{
            sx: { width: 420, maxWidth: '100%' },
          }}
        >
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Aprobar Incorporacion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solicitud #{approveDrawer.id}
            </Typography>
          </Box>

          {selectedBur && (
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Impact Preview */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                  Resumen de la operacion
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
                  <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.disabled', fontSize: 10 }}>Centro</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBur.centro}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.disabled', fontSize: 10 }}>Sector</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedBur.sector}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.disabled', fontSize: 10 }}>Monto a incorporar</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>+{formatCurrency(selectedBur.monto_solicitado_usd || 0)}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 1.5, border: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.disabled', fontSize: 10 }}>Saldo actual</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(selectedBur.saldo_actual_usd || 0)}</Typography>
                  </Paper>
                </Box>
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    mx: -2.5,
                    mb: -2.5,
                    px: 2.5,
                    py: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'success.50',
                    borderRadius: '0 0 8px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Nuevo saldo estimado:</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatCurrency((selectedBur.saldo_actual_usd || 0) + (selectedBur.monto_solicitado_usd || 0))}
                  </Typography>
                </Box>
              </Paper>

              {/* Comment Field */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 1, display: 'block' }}>
                  Comentario (opcional)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={approveDrawer.comentario}
                  onChange={(e) => setApproveDrawer(prev => ({ ...prev, comentario: e.target.value }))}
                  placeholder="Anadir un comentario opcional..."
                />
              </Box>

              {/* Actions */}
              <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setApproveDrawer({ open: false, id: null, comentario: "" })}
                >
                  Cancelar
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={confirmAprobar}
                  disabled={actionLoading}
                  startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {actionLoading ? "Procesando..." : "Confirmar Aprobacion"}
                </Button>
              </Stack>
            </Box>
          )}
        </Drawer>

        {/* Reject Drawer */}
        <Drawer
          anchor="right"
          open={rejectDrawer.open}
          onClose={() => setRejectDrawer({ open: false, id: null, motivo: "" })}
          PaperProps={{
            sx: { width: 420, maxWidth: '100%' },
          }}
        >
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Rechazar Incorporacion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solicitud #{rejectDrawer.id}
            </Typography>
          </Box>

          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Warning */}
            <Alert
              severity="error"
              icon={<WarningAmberIcon />}
              sx={{ '& .MuiAlert-message': { flex: 1 } }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Accion irreversible</Typography>
              <Typography variant="body2">Una vez rechazada, la solicitud no podra ser aprobada posteriormente.</Typography>
            </Alert>

            {/* Reason Field */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 1, display: 'block' }}>
                Motivo de rechazo <Typography component="span" color="error.main">*</Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={4}
                value={rejectDrawer.motivo}
                onChange={(e) => setRejectDrawer(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Explica el motivo del rechazo..."
                error={rejectDrawer.motivo.length > 0 && rejectDrawer.motivo.length < 5}
                helperText={
                  rejectDrawer.motivo.length > 0 && rejectDrawer.motivo.length < 5
                    ? "Minimo 5 caracteres requeridos"
                    : "El solicitante sera notificado con este motivo"
                }
              />
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'right',
                  mt: 0.5,
                  color: rejectDrawer.motivo.length < 5 ? 'error.main' : 'text.secondary',
                }}
              >
                {rejectDrawer.motivo.length}/5 min.
              </Typography>
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setRejectDrawer({ open: false, id: null, motivo: "" })}
              >
                Cancelar
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={confirmRechazar}
                disabled={actionLoading || rejectDrawer.motivo.trim().length < 5}
                startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {actionLoading ? "Procesando..." : "Confirmar Rechazo"}
              </Button>
            </Stack>
          </Box>
        </Drawer>

      </Box>
    </Box>
  );
}
