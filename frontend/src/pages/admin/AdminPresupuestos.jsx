import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { admin } from "../../services/spm";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";

const initialForm = {
  centro: "",
  sector: "",
  monto_usd: "",
  saldo_usd: "",
};

export default function AdminPresupuestos() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [presupuestos, setPresupuestos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Load presupuestos
  const loadPresupuestos = useCallback(async () => {
    setLoadingPresupuestos(true);
    try {
      const res = await admin.list("presupuestos");
      const data = (res.data || []).map(r => ({ ...r, _id: `${r.centro}|${r.sector}` }));
      setPresupuestos(data);
    } catch (e) {
      const err = e.response?.data?.error;
      setError(typeof err === "object" ? (err.message || JSON.stringify(err)) : (err || e.message));
    } finally {
      setLoadingPresupuestos(false);
    }
  }, []);

  // Load historial
  const loadHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const res = await admin.historialPresupuestos({ limit: 100 });
      const data = (res.data || []).map((r, idx) => ({ ...r, _id: r.id || idx }));
      setHistorial(data);
    } catch (e) {
      const err = e.response?.data?.error;
      setError(typeof err === "object" ? (err.message || JSON.stringify(err)) : (err || e.message));
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  useEffect(() => {
    loadPresupuestos();
    loadHistorial();
  }, [loadPresupuestos, loadHistorial]);

  // Columns presupuestos
  const columnsPresupuestos = useMemo(() => [
    { field: "centro", headerName: "Centro", flex: 0.6, minWidth: 100, headerAlign: "center", align: "center" },
    { field: "sector", headerName: "Sector", flex: 0.8, minWidth: 120, headerAlign: "center" },
    {
      field: "monto_usd",
      headerName: "Monto USD",
      flex: 0.8,
      minWidth: 130,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: "saldo_usd",
      headerName: "Saldo USD",
      flex: 0.8,
      minWidth: 130,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => {
        const saldo = params.value || 0;
        const monto = params.row.monto_usd || 1;
        const porcentaje = (saldo / monto) * 100;
        return (
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              color: porcentaje < 20 ? "#b71c1c" : porcentaje < 50 ? "#f57c00" : "#1b5e20",
              fontWeight: 600,
            }}
          >
            {formatCurrency(saldo)}
          </Typography>
        );
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 0.6,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "center", height: "100%", width: "100%" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleEdit(params.row)}
            sx={{ minWidth: 60, textTransform: "uppercase", fontSize: "11px" }}
          >
            Editar
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialog({ open: true, item: params.row })}
            sx={{ minWidth: 60, textTransform: "uppercase", fontSize: "11px" }}
          >
            Eliminar
          </Button>
        </Box>
      ),
    },
  ], []);

  // Columns historial
  const columnsHistorial = useMemo(() => [
    {
      field: "tipo_cambio",
      headerName: "Tipo",
      flex: 0.6,
      minWidth: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const colorMap = {
          creacion: "#1976d2",
          aumento: "#1b5e20",
          reduccion: "#f57c00",
          ajuste: "#64748b",
          eliminacion: "#b71c1c",
        };
        return (
          <Typography
            variant="caption"
            sx={{
              color: colorMap[params.value] || "#64748b",
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
    { field: "centro", headerName: "Centro", flex: 0.5, minWidth: 80, headerAlign: "center", align: "center" },
    { field: "sector", headerName: "Sector", flex: 0.7, minWidth: 100, headerAlign: "center" },
    {
      field: "diferencia_usd",
      headerName: "Cambio",
      flex: 0.7,
      minWidth: 120,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => {
        const diff = params.value || 0;
        return (
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              color: diff > 0 ? "#1b5e20" : diff < 0 ? "#b71c1c" : "#64748b",
              fontWeight: 600,
            }}
          >
            {diff > 0 ? "+" : ""}{formatCurrency(diff)}
          </Typography>
        );
      },
    },
    {
      field: "monto_nuevo_usd",
      headerName: "Monto Final",
      flex: 0.7,
      minWidth: 120,
      headerAlign: "center",
      align: "right",
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: "solicitante_nombre",
      headerName: "Usuario",
      flex: 0.8,
      minWidth: 120,
      headerAlign: "center",
      renderCell: (params) => params.value || "-",
    },
    {
      field: "created_at",
      headerName: "Fecha",
      flex: 0.8,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {formatDate(params.value)}
        </Typography>
      ),
    },
  ], []);

  // Handlers
  const handleEdit = useCallback((row) => {
    setEditingId(row._id);
    setForm({
      centro: row.centro || "",
      sector: row.sector || "",
      monto_usd: row.monto_usd || "",
      saldo_usd: row.saldo_usd || "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }, []);

  const handleNew = useCallback(() => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.centro || !form.sector) {
      setError("Centro y Sector son requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        centro: form.centro,
        sector: form.sector,
        monto_usd: Number(form.monto_usd || 0),
        saldo_usd: Number(form.saldo_usd || form.monto_usd || 0),
      };

      if (editingId) {
        const [centro, sector] = editingId.split("|");
        await admin.updatePresupuesto(centro, sector, payload);
        setSuccess("Presupuesto actualizado correctamente");
      } else {
        await admin.create("presupuestos", payload);
        setSuccess("Presupuesto creado correctamente");
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadPresupuestos();
      await loadHistorial();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      const err = e.response?.data?.error;
      setError(typeof err === "object" ? (err.message || JSON.stringify(err)) : (err || e.message));
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, loadPresupuestos, loadHistorial]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return;
    setSubmitting(true);
    try {
      const [centro, sector] = deleteDialog.item._id.split("|");
      await admin.deletePresupuesto(centro, sector);
      setSuccess("Presupuesto eliminado correctamente");
      setDeleteDialog({ open: false, item: null });
      await loadPresupuestos();
      await loadHistorial();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      const err = e.response?.data?.error;
      setError(typeof err === "object" ? (err.message || JSON.stringify(err)) : (err || e.message));
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog.item, loadPresupuestos, loadHistorial]);

  const dataGridSx = {
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
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1400 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/admin")} size="small" sx={{ color: "text.secondary" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
              Presupuestos
            </Typography>
          </Box>
          {tab === 0 && (
            <Button
              variant="contained"
              onClick={handleNew}
              sx={{ textTransform: "uppercase" }}
            >
              Nuevo
            </Button>
          )}
        </Box>
      </Box>

      {/* Alertas */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Presupuestos" sx={{ textTransform: "uppercase", fontWeight: 600 }} />
          <Tab label="Historial de Cambios" sx={{ textTransform: "uppercase", fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* DataGrid Presupuestos */}
      {tab === 0 && (
        <Paper elevation={2} sx={{ height: 600 }}>
          <DataGrid
            rows={presupuestos}
            columns={columnsPresupuestos}
            getRowId={(row) => row._id}
            loading={loadingPresupuestos}
            pageSizeOptions={[20, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            disableRowSelectionOnClick
            rowHeight={67}
            localeText={{ MuiTablePagination: { labelRowsPerPage: "Filas por página:" } }}
            sx={dataGridSx}
          />
        </Paper>
      )}

      {/* DataGrid Historial */}
      {tab === 1 && (
        <Paper elevation={2} sx={{ height: 600 }}>
          <DataGrid
            rows={historial}
            columns={columnsHistorial}
            getRowId={(row) => row._id}
            loading={loadingHistorial}
            pageSizeOptions={[20, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            disableRowSelectionOnClick
            rowHeight={67}
            localeText={{ MuiTablePagination: { labelRowsPerPage: "Filas por página:" } }}
            sx={dataGridSx}
          />
        </Paper>
      )}

      {/* Modal Formulario */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700 }}>
          {editingId ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="centro"
                  label="Centro"
                  value={form.centro}
                  onChange={(e) => setForm(prev => ({ ...prev, centro: e.target.value }))}
                  required
                  disabled={!!editingId}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="sector"
                  label="Sector"
                  value={form.sector}
                  onChange={(e) => setForm(prev => ({ ...prev, sector: e.target.value }))}
                  required
                  disabled={!!editingId}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="monto_usd"
                  label="Monto USD"
                  type="number"
                  value={form.monto_usd}
                  onChange={(e) => setForm(prev => ({ ...prev, monto_usd: e.target.value }))}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="saldo_usd"
                  label="Saldo USD"
                  type="number"
                  value={form.saldo_usd}
                  onChange={(e) => setForm(prev => ({ ...prev, saldo_usd: e.target.value }))}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => setShowForm(false)}
              disabled={submitting}
              sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ textTransform: "uppercase" }}
            >
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700, color: "error.main" }}>
          Eliminar
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar el presupuesto de <strong>{deleteDialog.item?.centro}</strong> - <strong>{deleteDialog.item?.sector}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDeleteDialog({ open: false, item: null })}
            disabled={submitting}
            sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ textTransform: "uppercase" }}
          >
            {submitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
