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
import { SPMDataGrid } from "../../components/ui/SPMDataGrid";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const initialForm = {
  codigo: "",
  nombre: "",
  activo: 1,
};

export default function AdminAlmacenes() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const loadAlmacenes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.list("almacenes");
      const data = Array.isArray(res.data) ? res.data : [];
      setAlmacenes(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlmacenes();
  }, [loadAlmacenes]);

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
        await admin.update("almacenes", editingId, form);
        setSuccess(t("crud_record_updated", "Almacén actualizado correctamente"));
      } else {
        await admin.create("almacenes", form);
        setSuccess(t("crud_record_created", "Almacén creado correctamente"));
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadAlmacenes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, loadAlmacenes, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return;
    setSubmitting(true);
    try {
      await admin.remove("almacenes", deleteDialog.item.codigo);
      setSuccess(t("crud_record_deleted", "Almacén eliminado correctamente"));
      setDeleteDialog({ open: false, item: null });
      await loadAlmacenes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog.item, loadAlmacenes, t]);

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1600 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/admin")} size="small" sx={{ color: "text.secondary" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
              {t("admin_almacenes", "Almacenes")}
            </Typography>
          </Box>
          <Button variant="contained" onClick={handleNew} sx={{ textTransform: "uppercase" }}>
            Nuevo
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <Paper elevation={2}>
        <SPMDataGrid
          rows={almacenes}
          columns={columns}
          getRowId={(row) => row.codigo}
          loading={loading}
          height={500}
          pageSizeOptions={[20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
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
          <Typography>¿Eliminar el almacén <strong>{deleteDialog.item?.codigo}</strong>?</Typography>
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
