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
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const ROLES_OPTIONS = [
  { value: "solicitante", label: "Solicitante", description: "Puede crear y gestionar solicitudes de materiales" },
  { value: "aprobador_solicitudes", label: "Aprobador Solicitudes", description: "Puede aprobar o rechazar solicitudes" },
  { value: "aprobador_presupuestos", label: "Aprobador Presupuestos", description: "Puede aprobar incorporaciones de presupuesto" },
  { value: "planificador", label: "Planificador", description: "Puede planificar y gestionar el despacho" },
  { value: "administrador", label: "Administrador", description: "Acceso completo al sistema" },
];

const PUESTOS_OPTIONS = [
  { value: "Planificador", label: "Planificador" },
  { value: "Jefe", label: "Jefe" },
  { value: "Gerente1", label: "Gerente Nivel 1" },
  { value: "Gerente2", label: "Gerente Nivel 2" },
  { value: "Director", label: "Director" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Analista", label: "Analista" },
  { value: "Coordinador", label: "Coordinador" },
];

const SECTORES_OPTIONS = [
  { value: "1", label: "Almacenes" },
  { value: "2", label: "Compras" },
  { value: "3", label: "Mantenimiento" },
  { value: "4", label: "Planificación" },
  { value: "5", label: "Operaciones" },
  { value: "6", label: "Logística" },
  { value: "7", label: "Producción" },
  { value: "8", label: "Calidad" },
];

const ESTADOS_OPTIONS = [
  { value: "Activo", label: "Activo" },
  { value: "Inactivo", label: "Inactivo" },
  { value: "Suspendido", label: "Suspendido" },
];

const initialForm = {
  id_spm: "",
  nombre: "",
  apellido: "",
  mail: "",
  mail_respaldo: "",
  telefono: "",
  posicion: "Analista",
  id_ypf: "",
  sector: "",
  roles: ["solicitante"],
  centros: "",
  almacenes: "",
  jefe: "",
  gerente1: "",
  gerente2: "",
  estado_registro: "Activo",
  contrasena: "spm123",
};

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admin.list("usuarios");
      const data = Array.isArray(res.data) ? res.data : [];
      setUsuarios(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  // Opciones de jefes/gerentes filtradas por posición
  const jefesOptions = useMemo(() =>
    usuarios.filter(u => u.posicion?.toLowerCase() === "jefe").map(u => ({
      value: u.id_spm,
      label: `${u.nombre} ${u.apellido} (${u.id_spm})`,
    })), [usuarios]);

  const gerentes1Options = useMemo(() =>
    usuarios.filter(u => u.posicion?.toLowerCase() === "gerente1").map(u => ({
      value: u.id_spm,
      label: `${u.nombre} ${u.apellido} (${u.id_spm})`,
    })), [usuarios]);

  const gerentes2Options = useMemo(() =>
    usuarios.filter(u => u.posicion?.toLowerCase() === "gerente2").map(u => ({
      value: u.id_spm,
      label: `${u.nombre} ${u.apellido} (${u.id_spm})`,
    })), [usuarios]);

  const parseRoles = (roles) => {
    if (Array.isArray(roles)) return roles;
    if (typeof roles === "string") {
      try {
        const parsed = JSON.parse(roles);
        return Array.isArray(parsed) ? parsed : [roles];
      } catch {
        return [roles];
      }
    }
    return [];
  };

  const columns = useMemo(() => [
    { field: "id_spm", headerName: "ID SPM", flex: 0.5, minWidth: 80, headerAlign: "center", align: "center" },
    {
      field: "nombre_completo",
      headerName: "Nombre",
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
      valueGetter: (value, row) => `${row.nombre || ""} ${row.apellido || ""}`.trim() || "-",
    },
    {
      field: "roles",
      headerName: "Roles",
      width: 310,
      headerAlign: "center",
      renderCell: (params) => {
        const roles = parseRoles(params.row.roles || params.row.rol);
        const colorMap = {
          admin: "#b71c1c",
          administrador: "#b71c1c",
          aprobador_presupuestos: "#1b5e20",
          aprobador_solicitudes: "#ff6f00",
          planificador: "#880e4f",
          jefe: "#0d47a1",
          gerente1: "#212121",
          gerente2: "#3e2723",
          solicitante: "#00897b",
        };
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", height: "100%" }}>
            {roles.length > 0 ? roles.map((rol, idx) => (
              <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {idx > 0 && (
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>|</Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: colorMap[rol?.toLowerCase()] || "text.secondary",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    fontSize: "11px",
                  }}
                >
                  {rol}
                </Typography>
              </Box>
            )) : (
              <Typography variant="caption" color="text.secondary">-</Typography>
            )}
          </Box>
        );
      },
    },
    { field: "mail", headerName: "Email", flex: 1, minWidth: 180, headerAlign: "center" },
    { field: "posicion", headerName: "Puesto", flex: 0.8, minWidth: 100, headerAlign: "center" },
    {
      field: "sector",
      headerName: "Sector",
      flex: 0.6,
      minWidth: 100,
      headerAlign: "center",
      valueGetter: (value) => {
        const sector = SECTORES_OPTIONS.find(s => s.value === value);
        return sector?.label || value || "-";
      },
    },
    {
      field: "estado_registro",
      headerName: "Estado",
      flex: 0.5,
      minWidth: 80,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const estado = params.value?.toLowerCase();
        const isActivo = estado === "activo";
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
            {params.value || "Inactivo"}
          </Typography>
        );
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 0.8,
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
            onClick={() => setDeleteDialog({ open: true, user: params.row })}
            sx={{ minWidth: 60, textTransform: "uppercase", fontSize: "11px" }}
          >
            Eliminar
          </Button>
        </Box>
      ),
    },
  ], []);

  const handleEdit = useCallback((row) => {
    setEditingId(row.id_spm);
    setForm({
      ...initialForm,
      ...row,
      roles: parseRoles(row.roles || row.rol),
      contrasena: "",
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

  const handleRoleToggle = useCallback((roleValue) => {
    setForm(prev => {
      const currentRoles = prev.roles || [];
      const newRoles = currentRoles.includes(roleValue)
        ? currentRoles.filter(r => r !== roleValue)
        : [...currentRoles, roleValue];
      return { ...prev, roles: newRoles };
    });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.id_spm || !form.nombre || !form.apellido || !form.mail) {
      setError(t("admin_required_fields", "Faltan campos obligatorios"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        roles: JSON.stringify(form.roles),
      };

      if (editingId) {
        await admin.update("usuarios", editingId, payload);
        setSuccess(t("crud_record_updated", "Usuario actualizado correctamente"));
      } else {
        await admin.create("usuarios", payload);
        setSuccess(t("crud_record_created", "Usuario creado correctamente"));
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadUsuarios();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, loadUsuarios, t]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.user) return;
    setSubmitting(true);
    try {
      await admin.remove("usuarios", deleteDialog.user.id_spm);
      setSuccess(t("crud_record_deleted", "Usuario eliminado correctamente"));
      setDeleteDialog({ open: false, user: null });
      await loadUsuarios();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [deleteDialog.user, loadUsuarios, t]);

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1600 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/admin")} size="small" sx={{ color: "text.secondary" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
              {t("admin_usuarios", "Administración de Usuarios")}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleNew}
            sx={{ textTransform: "uppercase" }}
          >
            {t("crud_new", "Nuevo")}
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
          rows={usuarios}
          columns={columns}
          getRowId={(row) => row.id_spm}
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
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "90vh" } }}
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
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="id_spm"
                  label="ID SPM"
                  value={form.id_spm}
                  onChange={handleChange}
                  required
                  disabled={!!editingId}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="nombre"
                  label="Nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="apellido"
                  label="Apellido"
                  value={form.apellido}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="mail"
                  label="Email"
                  type="email"
                  value={form.mail}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="telefono"
                  label="Teléfono"
                  value={form.telefono}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="posicion"
                  label="Puesto"
                  value={form.posicion}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  {PUESTOS_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="sector"
                  label="Sector"
                  value={form.sector}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">Selecciona...</MenuItem>
                  {SECTORES_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Roles *
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <FormGroup row>
                    {ROLES_OPTIONS.map(role => (
                      <FormControlLabel
                        key={role.value}
                        control={
                          <Checkbox
                            checked={form.roles?.includes(role.value) || false}
                            onChange={() => handleRoleToggle(role.value)}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2">{role.label}</Typography>}
                        sx={{ minWidth: 200, mb: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="centros"
                  label="Centros"
                  value={form.centros}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="almacenes"
                  label="Almacenes"
                  value={form.almacenes}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="jefe"
                  label="Jefe"
                  value={form.jefe}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">-</MenuItem>
                  {jefesOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="gerente1"
                  label="Gerente 1"
                  value={form.gerente1}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">-</MenuItem>
                  {gerentes1Options.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="gerente2"
                  label="Gerente 2"
                  value={form.gerente2}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">-</MenuItem>
                  {gerentes2Options.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="estado_registro"
                  label="Estado"
                  value={form.estado_registro}
                  onChange={handleChange}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  {ESTADOS_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="contrasena"
                  label="Contraseña"
                  type="password"
                  value={form.contrasena}
                  onChange={handleChange}
                  required={!editingId}
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
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700, color: "error.main" }}>
          Eliminar
        </DialogTitle>
        <DialogContent>
          <Typography>
            ¿Eliminar a <strong>{deleteDialog.user?.nombre} {deleteDialog.user?.apellido}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDeleteDialog({ open: false, user: null })}
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
