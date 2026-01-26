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

const parseAsignaciones = (text) => {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [centro, sector, almacen_virtual] = line.split(",").map((v) => v?.trim());
      return { centro, sector, almacen_virtual };
    });
};

const initialForm = {
  usuario_id: "",
  nombre: "",
  activo: 1,
  asignaciones_text: "",
};

export default function AdminPlanificadores() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [planificadores, setPlanificadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  const loadPlanificadores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.list("planificadores");
      const data = res.data;
      const planners = data?.planificadores || [];
      const asign = data?.asignaciones || [];

      const parsed = planners.map((p) => {
        const rows = asign.filter((a) => a.planificador_id === p.usuario_id);
        return {
          ...p,
          asignaciones_text: rows.map((r) => `${r.centro || ""}, ${r.sector || ""}, ${r.almacen_virtual || ""}`).join("\n"),
        };
      });

      setPlanificadores(parsed);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanificadores();
  }, [loadPlanificadores]);

  const columns = useMemo(() => [
    {
      field: "usuario_id",
      headerName: "Usuario",
      flex: 0.5,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      minWidth: 180,
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
      field: "asignaciones_text",
      headerName: "Asignaciones",
      flex: 1.5,
      minWidth: 250,
      headerAlign: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%", whiteSpace: "pre-line", fontSize: "12px" }}>
          {params.value || "-"}
        </Box>
      ),
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
    setEditingId(row.usuario_id);
    setForm({
      usuario_id: row.usuario_id || "",
      nombre: row.nombre || "",
      activo: row.activo ?? 1,
      asignaciones_text: row.asignaciones_text || "",
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

    if (!form.usuario_id) {
      setError(t("admin_required_fields", "Faltan campos obligatorios"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        usuario_id: form.usuario_id,
        nombre: form.nombre,
        activo: form.activo,
        asignaciones: parseAsignaciones(form.asignaciones_text),
      };

      if (editingId) {
        await admin.update("planificadores", editingId, payload);
        setSuccess(t("crud_record_updated", "Planificador actualizado correctamente"));
      } else {
        await admin.create("planificadores", payload);
        setSuccess(t("crud_record_created", "Planificador creado correctamente"));
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadPlanificadores();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, loadPlanificadores, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return;
    setSubmitting(true);
    try {
      await admin.remove("planificadores", deleteDialog.item.usuario_id);
      setSuccess(t("crud_record_deleted", "Planificador eliminado correctamente"));
      setDeleteDialog({ open: false, item: null });
      await loadPlanificadores();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog.item, loadPlanificadores, t]);

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
              Planificadores
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleNew}
            sx={{ textTransform: "uppercase" }}
          >
            Nuevo
          </Button>
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

      {/* DataGrid */}
      <Paper elevation={2} sx={{ height: 600 }}>
        <DataGrid
          rows={planificadores}
          columns={columns}
          getRowId={(row) => row.usuario_id}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          disableRowSelectionOnClick
          rowHeight={67}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Filas por página:",
            },
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

      {/* Modal de Formulario */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700 }}>
          {editingId ? "Editar" : "Nuevo"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="usuario_id"
                  label="Usuario ID"
                  value={form.usuario_id}
                  onChange={handleChange}
                  required
                  disabled={!!editingId}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="nombre"
                  label="Nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.activo === 1 || form.activo === true}
                      onChange={(e) => setForm(prev => ({ ...prev, activo: e.target.checked ? 1 : 0 }))}
                      size="small"
                    />
                  }
                  label="Activo"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="asignaciones_text"
                  label="Asignaciones"
                  value={form.asignaciones_text}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  placeholder="Una por línea: centro, sector, almacen"
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

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })}>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700, color: "error.main" }}>
          Eliminar
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar al planificador <strong>{deleteDialog.item?.nombre || deleteDialog.item?.usuario_id}</strong>?
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
