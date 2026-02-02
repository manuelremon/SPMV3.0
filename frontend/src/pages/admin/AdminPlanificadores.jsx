import { useEffect, useState, useCallback } from "react";
import { admin } from "../../services/spm";
import { useI18n } from "../../context/i18n";
import { useNavigate } from "react-router-dom";

// MUI Components
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";

// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import GroupIcon from "@mui/icons-material/Group";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";

// Services
import { exportToXLSX } from "../../services/export";

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

/* ─────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────── */
function TableSkeleton({ rows = 5 }) {
  return (
    <Box>
      {[...Array(rows)].map((_, i) => (
        <Stack
          key={i}
          direction="row"
          spacing={2}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            py: 1.5,
            px: 2,
          }}
        >
          <Skeleton variant="text" width={64} height={24} />
          <Skeleton variant="text" sx={{ flex: 1 }} height={24} />
          <Skeleton variant="text" width={80} height={24} />
          <Skeleton variant="text" width={128} height={24} />
          <Skeleton variant="text" width={64} height={24} />
        </Stack>
      ))}
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────
   Empty State
───────────────────────────────────────────────────────────── */
function EmptyState({ message, onAction, actionLabel }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        color: "text.secondary",
      }}
    >
      <GroupIcon sx={{ fontSize: 48, mb: 1.5, opacity: 0.5 }} />
      <Typography variant="body2" sx={{ mb: 2 }}>
        {message}
      </Typography>
      {onAction && (
        <Button
          onClick={onAction}
          size="small"
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontSize: "0.75rem",
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function AdminPlanificadores() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [planificadores, setPlanificadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ─── Load Data ────────────────────────────────────────────
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
          asignaciones_text: rows
            .map((r) => `${r.centro || ""}, ${r.sector || ""}, ${r.almacen_virtual || ""}`)
            .join("\n"),
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

  // ─── Filtered Data ────────────────────────────────────────
  const filteredPlanificadores = planificadores.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.usuario_id?.toString().toLowerCase().includes(term) ||
      r.nombre?.toLowerCase().includes(term)
    );
  });

  // ─── Handlers ─────────────────────────────────────────────
  const handleNew = () => {
    setEditingId(null);
    setForm(initialForm);
    setDrawerOpen(true);
    setError("");
  };

  const handleEdit = (row) => {
    setEditingId(row.usuario_id);
    setForm({
      usuario_id: row.usuario_id || "",
      nombre: row.nombre || "",
      activo: row.activo ?? 1,
      asignaciones_text: row.asignaciones_text || "",
    });
    setDrawerOpen(true);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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

      setDrawerOpen(false);
      setForm(initialForm);
      setEditingId(null);
      await loadPlanificadores();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setSubmitting(true);
    try {
      await admin.remove("planificadores", id);
      setSuccess(t("crud_record_deleted", "Planificador eliminado correctamente"));
      setDeletingId(null);
      await loadPlanificadores();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToXLSX(
        filteredPlanificadores,
        "planificadores",
        "Planificadores"
      );
      setSuccess("Planificadores exportados correctamente");
    } catch (err) {
      setError(err.message || "Error al exportar planificadores");
    } finally {
      setExporting(false);
    }
  };

return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, py: 3 }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              onClick={() => navigate("/admin")}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "grey.200",
                  color: "text.primary",
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.primary",
              }}
            >
              {t("admin_planificadores", "Planificadores")}
            </Typography>
          </Stack>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title="Descargar XLSX">
              <span>
                <IconButton
                  onClick={handleExport}
                  disabled={loading || exporting || filteredPlanificadores.length === 0}
                  size="small"
                  sx={{
                    color: "var(--success)",
                    border: "1px solid var(--success)",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    "&:hover": {
                      backgroundColor: "var(--success)",
                      color: "var(--card)",
                    },
                    "&:disabled": {
                      opacity: 0.5,
                      cursor: "not-allowed",
                    },
                  }}
                >
                  {exporting ? (
                    <CircularProgress size={14} sx={{ color: "var(--success)" }} />
                  ) : (
                    <>
                      <FileDownloadIcon sx={{ fontSize: "1rem", mr: 0.5 }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>XLSX</span>
                    </>
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              onClick={handleNew}
              size="small"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.75rem",
                px: 2,
              }}
            >
              {t("crud_new", "Nuevo")}
            </Button>
          </Box>
        </Stack>

        {/* Alerts */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError("")}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {/* Search */}
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Buscar por ID o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            sx={{
              width: 300,
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
              },
            }}
          />
        </Box>

        {/* Table */}
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredPlanificadores.length === 0 ? (
            <EmptyState
              message={searchTerm ? "No se encontraron planificadores" : "No hay planificadores registrados"}
              onAction={!searchTerm ? handleNew : undefined}
              actionLabel="Crear primer planificador"
            />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell
                    align="center"
                    sx={{
                      width: 100,
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "text.secondary",
                      borderRight: 1,
                      borderColor: "divider",
                    }}
                  >
                    Usuario ID
                  </TableCell>
                  <TableCell
                    sx={{
                      width: 180,
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "text.secondary",
                      borderRight: 1,
                      borderColor: "divider",
                    }}
                  >
                    Nombre
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      width: 90,
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "text.secondary",
                      borderRight: 1,
                      borderColor: "divider",
                    }}
                  >
                    Estado
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "text.secondary",
                      borderRight: 1,
                      borderColor: "divider",
                    }}
                  >
                    Asignaciones
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      width: 100,
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "text.secondary",
                    }}
                  >
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlanificadores.map((row) =>
                  deletingId === row.usuario_id ? (
                    <TableRow key={row.usuario_id} sx={{ bgcolor: "error.lighter" }}>
                      <TableCell colSpan={5}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="body2" sx={{ color: "error.dark" }}>
                            Eliminar al planificador <strong>{row.nombre || row.usuario_id}</strong>?
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDeletingId(null)}
                              disabled={submitting}
                              sx={{
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                fontSize: "0.75rem",
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleDelete(row.usuario_id)}
                              disabled={submitting}
                              sx={{
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                fontSize: "0.75rem",
                              }}
                            >
                              {submitting ? "..." : "Eliminar"}
                            </Button>
                          </Stack>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow
                      key={row.usuario_id}
                      hover
                      sx={{
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.875rem",
                          color: "text.primary",
                          borderRight: 1,
                          borderColor: "grey.100",
                        }}
                      >
                        {row.usuario_id}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: "0.875rem",
                          color: "text.primary",
                          borderRight: 1,
                          borderColor: "grey.100",
                        }}
                      >
                        {row.nombre || "-"}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          borderRight: 1,
                          borderColor: "grey.100",
                        }}
                      >
                        <Chip
                          label={row.activo === 1 || row.activo === true ? "Activo" : "Inactivo"}
                          size="small"
                          sx={{
                            fontSize: "0.625rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            height: 20,
                            bgcolor:
                              row.activo === 1 || row.activo === true
                                ? "success.lighter"
                                : "grey.200",
                            color:
                              row.activo === 1 || row.activo === true
                                ? "success.dark"
                                : "text.secondary",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          borderRight: 1,
                          borderColor: "grey.100",
                        }}
                      >
                        {row.asignaciones_text ? (
                          <Box
                            component="pre"
                            sx={{
                              whiteSpace: "pre-wrap",
                              fontFamily: "monospace",
                              m: 0,
                              fontSize: "inherit",
                            }}
                          >
                            {row.asignaciones_text}
                          </Box>
                        ) : (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.disabled" }}
                          >
                            Sin asignaciones
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="center"
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(row)}
                            title="Editar"
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: "primary.main",
                                bgcolor: "primary.lighter",
                              },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => setDeletingId(row.usuario_id)}
                            title="Eliminar"
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "error.lighter",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 2, color: "text.disabled" }}
        >
          {filteredPlanificadores.length} de {planificadores.length} planificadores
        </Typography>
      </Box>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: "100%",
            maxWidth: 400,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "grey.50",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "text.primary",
            }}
          >
            {editingId ? "Editar Planificador" : "Nuevo Planificador"}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setDrawerOpen(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2.5,
          }}
        >
          <Stack spacing={2.5}>
            {error && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Usuario ID"
              name="usuario_id"
              value={form.usuario_id}
              onChange={handleChange}
              required
              disabled={!!editingId}
              size="small"
              fullWidth
              autoComplete="off"
              InputLabelProps={{
                sx: {
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                },
              }}
            />

            <TextField
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              size="small"
              fullWidth
              autoComplete="off"
              InputLabelProps={{
                sx: {
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={form.activo === 1 || form.activo === true}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, activo: e.target.checked ? 1 : 0 }))
                  }
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  Activo
                </Typography>
              }
            />

            <TextField
              label="Asignaciones"
              name="asignaciones_text"
              value={form.asignaciones_text}
              onChange={handleChange}
              size="small"
              fullWidth
              multiline
              rows={5}
              placeholder="Una por linea: centro, sector, almacen"
              autoComplete="off"
              InputLabelProps={{
                sx: {
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                },
              }}
            />

            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Formato: centro, sector, almacen_virtual (una por linea)
              </Typography>
            </Paper>

            <Stack
              direction="row"
              spacing={1}
              sx={{
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Button
                variant="outlined"
                onClick={() => setDrawerOpen(false)}
                disabled={submitting}
                fullWidth
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.75rem",
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                fullWidth
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.75rem",
                }}
              >
                {submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
