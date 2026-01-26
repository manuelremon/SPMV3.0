import { useEffect, useState, useMemo, useCallback } from "react";
import { admin } from "../../services/spm";
import { useI18n } from "../../context/i18n";
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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const initialForm = {
  codigo: "",
  nombre: "",
  activo: 1,
};

export default function AdminCentros() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const loadCentros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.list("centros");
      const data = Array.isArray(res.data) ? res.data : [];
      setCentros(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCentros();
  }, [loadCentros]);

  const columns = useMemo(() => [
    {
      field: "codigo",
      headerName: "Código",
      flex: 0.5,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      minWidth: 200,
      headerAlign: "center",
    },
    {
      field: "activo",
      headerName: "Estado",
      flex: 0.5,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const isActivo = params.value === 1 || params.value === true;
        return (
          <Typography
            variant="caption"
            sx={{
              color: isActivo ? "#1b5e20" : "#b71c1c",
              fontWeight: 600,
              textTransform: "uppercase",
              fontSize: "11px",
            }}
          >
            {isActivo ? "Activo" : "Inactivo"}
          </Typography>
        );
      },
    },
    {
      field: "created_at",
      headerName: "Creado",
      flex: 0.6,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
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

  const handleEdit = useCallback((row) => {
    setEditingId(row.codigo);
    setForm({
      codigo: row.codigo || "",
      nombre: row.nombre || "",
      activo: row.activo ?? 1,
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

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.codigo) {
      setError(t("admin_required_fields", "Faltan campos obligatorios"));
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await admin.update("centros", editingId, form);
        setSuccess(t("crud_record_updated", "Centro actualizado correctamente"));
      } else {
        await admin.create("centros", form);
        setSuccess(t("crud_record_created", "Centro creado correctamente"));
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadCentros();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, loadCentros, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return;
    setSubmitting(true);
    try {
      await admin.remove("centros", deleteDialog.item.codigo);
      setSuccess(t("crud_record_deleted", "Centro eliminado correctamente"));
      setDeleteDialog({ open: false, item: null });
      await loadCentros();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog.item, loadCentros, t]);

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1200 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/admin")} size="small" sx={{ color: "text.secondary" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
              {t("admin_centros", "Centros")}
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleNew} sx={{ textTransform: "uppercase" }}>
            Nuevo
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Paper elevation={2} sx={{ height: 500 }}>
        <DataGrid
          rows={centros}
          columns={columns}
          getRowId={(row) => row.codigo}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          disableRowSelectionOnClick
          rowHeight={67}
          localeText={{ MuiTablePagination: { labelRowsPerPage: "Filas por página:" } }}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "grey.100", fontWeight: 700, textTransform: "uppercase", fontSize: "12px" },
            "& .MuiDataGrid-columnHeader--alignCenter .MuiDataGrid-columnHeaderTitleContainer": { justifyContent: "center" },
            "& .MuiDataGrid-columnHeader": { borderRight: "1px solid", borderColor: "divider" },
            "& .MuiDataGrid-cell": { fontSize: "13px", borderRight: "1px solid", borderColor: "divider" },
          }}
        />
      </Paper>

      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700 }}>{editingId ? "Editar" : "Nuevo"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" name="codigo" label="Código" value={form.codigo} onChange={handleChange} required disabled={!!editingId} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth size="small" name="nombre" label="Nombre" value={form.nombre} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Checkbox checked={form.activo === 1 || form.activo === true} onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked ? 1 : 0 }))} size="small" />}
                  label="Activo"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button variant="outlined" color="inherit" onClick={() => setShowForm(false)} disabled={submitting} sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null} sx={{ textTransform: "uppercase" }}>
              {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700, color: "error.main" }}>Eliminar</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar el centro <strong>{deleteDialog.item?.codigo}</strong>?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => setDeleteDialog({ open: false, item: null })} disabled={submitting} sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={submitting} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null} sx={{ textTransform: "uppercase" }}>
            {submitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
