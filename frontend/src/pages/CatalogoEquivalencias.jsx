import { useEffect, useState, useCallback, useMemo } from "react";
import { equivalencias, materiales } from "../services/spm";
import { formatCurrency } from "../utils/formatters";
import { useI18n } from "../context/i18n";
import { useAuthStore } from "../store/authStore";
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
  Alert,
  CircularProgress,
  Chip,
  Slider,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { SwapHoriz, Search, Close, ArrowForward, Check } from "@mui/icons-material";

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export default function CatalogoEquivalencias() {
  const { t } = useI18n();
  const { user } = useAuthStore();

  // Check if user can manage (Admin or Planificador)
  const canManage =
    user?.rol?.toLowerCase().includes("admin") ||
    user?.rol?.toLowerCase().includes("planificador");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, DEBOUNCE_MS);

  // Results state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pagination, setPagination] = useState({ total: 0, offset: 0, hasMore: false });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    codigo_original: "",
    codigo_equivalente: "",
    compatibilidad_pct: 80,
    descripcion: "",
    notas: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Material search for form
  const [searchOriginal, setSearchOriginal] = useState("");
  const [searchEquivalente, setSearchEquivalente] = useState("");
  const [originalResults, setOriginalResults] = useState([]);
  const [equivalenteResults, setEquivalenteResults] = useState([]);
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [loadingEquivalente, setLoadingEquivalente] = useState(false);
  const [selectedOriginal, setSelectedOriginal] = useState(null);
  const [selectedEquivalente, setSelectedEquivalente] = useState(null);

  const debouncedOriginal = useDebouncedValue(searchOriginal, DEBOUNCE_MS);
  const debouncedEquivalente = useDebouncedValue(searchEquivalente, DEBOUNCE_MS);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Load equivalencias
  const loadEquivalencias = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError("");

      try {
        const res = await equivalencias.listar({
          q: debouncedQuery,
          limit: PAGE_SIZE,
          offset,
        });
        const data = res.data;

        setResults(
          (data.data || []).map((eq, idx) => ({
            ...eq,
            _id: eq.id ?? idx,
          }))
        );
        setPagination({
          total: data.pagination?.total || 0,
          offset: data.pagination?.offset || 0,
          hasMore: data.pagination?.has_more || false,
        });
      } catch (err) {
        console.error("load equivalencias", err);
        setError(err.response?.data?.error?.message || err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery]
  );

  useEffect(() => {
    loadEquivalencias(0);
  }, [loadEquivalencias]);

  // Search materials for form (original)
  useEffect(() => {
    if (!debouncedOriginal.trim()) {
      setOriginalResults([]);
      return;
    }

    setLoadingOriginal(true);
    materiales
      .buscar({ descripcion: debouncedOriginal, limit: 10 })
      .then((res) => setOriginalResults(res.data?.data || res.data || []))
      .catch(() => setOriginalResults([]))
      .finally(() => setLoadingOriginal(false));
  }, [debouncedOriginal]);

  // Search materials for form (equivalente)
  useEffect(() => {
    if (!debouncedEquivalente.trim()) {
      setEquivalenteResults([]);
      return;
    }

    setLoadingEquivalente(true);
    materiales
      .buscar({ descripcion: debouncedEquivalente, limit: 10 })
      .then((res) => setEquivalenteResults(res.data?.data || res.data || []))
      .catch(() => setEquivalenteResults([]))
      .finally(() => setLoadingEquivalente(false));
  }, [debouncedEquivalente]);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Columns
  const columns = useMemo(
    () => [
      {
        field: "codigo_original",
        headerName: "Material Original",
        flex: 0.8,
        minWidth: 180,
        headerAlign: "center",
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "primary.main" }}>
              {params.value}
            </Typography>
            {params.row.descripcion_original && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                {params.row.descripcion_original.substring(0, 40)}...
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: "arrow",
        headerName: "",
        flex: 0.2,
        minWidth: 50,
        headerAlign: "center",
        align: "center",
        sortable: false,
        renderCell: () => <ArrowForward sx={{ color: "text.secondary" }} />,
      },
      {
        field: "codigo_equivalente",
        headerName: "Material Equivalente",
        flex: 0.8,
        minWidth: 180,
        headerAlign: "center",
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "secondary.main" }}>
              {params.value}
            </Typography>
            {params.row.descripcion_equivalente && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                {params.row.descripcion_equivalente.substring(0, 40)}...
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: "tipo_equivalencia",
        headerName: "Tipo",
        flex: 0.5,
        minWidth: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const colorMap = {
            SUSTITUTO: "#1b5e20",
            ALTERNATIVO: "#f57c00",
            SIMILAR: "#1976d2",
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
      {
        field: "compatibilidad_pct",
        headerName: "Compatibilidad",
        flex: 0.5,
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const pct = params.value || 0;
          const color = pct >= 80 ? "#1b5e20" : pct >= 50 ? "#f57c00" : "#b71c1c";
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 60,
                  height: 6,
                  bgcolor: "grey.200",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    height: "100%",
                    bgcolor: color,
                    transition: "width 0.3s",
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                {pct}%
              </Typography>
            </Box>
          );
        },
      },
      ...(canManage
        ? [
            {
              field: "acciones",
              headerName: "Acciones",
              flex: 0.5,
              minWidth: 150,
              headerAlign: "center",
              align: "center",
              sortable: false,
              renderCell: (params) => (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    width: "100%",
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => openEditModal(params.row)}
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
          ]
        : []),
    ],
    [canManage]
  );

  // Handlers
  const resetForm = useCallback(() => {
    setFormData({
      codigo_original: "",
      codigo_equivalente: "",
      compatibilidad_pct: 80,
      descripcion: "",
      notas: "",
    });
    setSearchOriginal("");
    setSearchEquivalente("");
    setOriginalResults([]);
    setEquivalenteResults([]);
    setSelectedOriginal(null);
    setSelectedEquivalente(null);
    setFormError("");
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setEditingId(null);
    setShowForm(true);
  }, [resetForm]);

  const openEditModal = useCallback((eq) => {
    setEditingId(eq.id);
    setFormData({
      codigo_original: eq.codigo_original,
      codigo_equivalente: eq.codigo_equivalente,
      compatibilidad_pct: eq.compatibilidad_pct,
      descripcion: eq.descripcion || "",
      notas: eq.notas || "",
    });
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setFormError("");
      setFormLoading(true);

      try {
        if (editingId !== null) {
          await equivalencias.actualizar(editingId, {
            compatibilidad_pct: formData.compatibilidad_pct,
            descripcion: formData.descripcion,
            notas: formData.notas,
          });
          setSuccess(t("equivalencias_actualizada", "Equivalencia actualizada correctamente"));
        } else {
          await equivalencias.crear({
            codigo_original: formData.codigo_original,
            codigo_equivalente: formData.codigo_equivalente,
            compatibilidad_pct: formData.compatibilidad_pct,
            descripcion: formData.descripcion,
            notas: formData.notas,
          });
          setSuccess(t("equivalencias_creada", "Equivalencia creada correctamente"));
        }

        setShowForm(false);
        resetForm();
        loadEquivalencias(0);
      } catch (err) {
        setFormError(err.response?.data?.error?.message || err.message);
      } finally {
        setFormLoading(false);
      }
    },
    [formData, editingId, resetForm, loadEquivalencias, t]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item) return;
    setFormLoading(true);

    try {
      await equivalencias.eliminar(deleteDialog.item.id);
      setSuccess(t("equivalencias_eliminada", "Equivalencia eliminada correctamente"));
      setDeleteDialog({ open: false, item: null });
      loadEquivalencias(0);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  }, [deleteDialog.item, loadEquivalencias, t]);

  const selectOriginal = useCallback((mat) => {
    setSelectedOriginal(mat);
    setFormData((prev) => ({ ...prev, codigo_original: mat.codigo }));
    setSearchOriginal("");
    setOriginalResults([]);
  }, []);

  const selectEquivalente = useCallback((mat) => {
    setSelectedEquivalente(mat);
    setFormData((prev) => ({ ...prev, codigo_equivalente: mat.codigo }));
    setSearchEquivalente("");
    setEquivalenteResults([]);
  }, []);

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
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1600 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
            {t("equivalencias_titulo", "Catálogo de Materiales Alternativos")}
          </Typography>
          {canManage && (
            <Button variant="contained" onClick={openCreateModal} sx={{ textTransform: "uppercase" }}>
              Nueva Equivalencia
            </Button>
          )}
        </Box>
      </Box>

      {/* Search */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Typography
              variant="caption"
              sx={{
                textTransform: "uppercase",
                fontWeight: 600,
                color: "text.secondary",
                mb: 0.5,
                display: "block",
              }}
            >
              {t("equivalencias_buscar", "Buscar por código o descripción")}
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("equivalencias_placeholder", "Código SAP o descripción...")}
              slotProps={{
                input: {
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                  endAdornment: searchQuery && (
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <Close fontSize="small" sx={{ color: "error.main" }} />
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
          {!loading && (
            <Chip
              label={`${pagination.total} ${t("common_resultados", "resultados")}`}
              color={pagination.total > 0 ? "primary" : "default"}
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

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
        {results.length === 0 && !loading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "text.secondary",
            }}
          >
            <SwapHoriz sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography>
              {searchQuery
                ? t("equivalencias_sin_resultados", "No se encontraron equivalencias con los criterios de búsqueda")
                : t("equivalencias_vacio", "No hay equivalencias registradas")}
            </Typography>
            {canManage && !searchQuery && (
              <Button variant="outlined" sx={{ mt: 2, textTransform: "uppercase" }} onClick={openCreateModal}>
                Crear la primera equivalencia
              </Button>
            )}
          </Box>
        ) : (
          <DataGrid
            rows={results}
            columns={columns}
            getRowId={(row) => row._id}
            loading={loading}
            pageSizeOptions={[20, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
            disableRowSelectionOnClick
            rowHeight={67}
            localeText={{ MuiTablePagination: { labelRowsPerPage: "Filas por página:" } }}
            sx={dataGridSx}
          />
        )}
      </Paper>

      {/* Modal Formulario */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700 }}>
          {editingId !== null
            ? t("equivalencias_editar_titulo", "Editar Equivalencia")
            : t("equivalencias_crear_titulo", "Crear Nueva Equivalencia")}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError("")}>
                {formError}
              </Alert>
            )}

            <Grid container spacing={2}>
              {/* Material Original */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="caption"
                  sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}
                >
                  {t("equivalencias_material_original", "Material Original")} *
                </Typography>
                {editingId !== null ? (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: 600 }}>
                      {formData.codigo_original}
                    </Typography>
                  </Paper>
                ) : selectedOriginal ? (
                  <Paper variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <Check sx={{ color: "success.main" }} />
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: 600 }}>
                      {selectedOriginal.codigo}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {selectedOriginal.descripcion}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedOriginal(null);
                        setFormData((prev) => ({ ...prev, codigo_original: "" }));
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Paper>
                ) : (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={searchOriginal}
                      onChange={(e) => setSearchOriginal(e.target.value)}
                      placeholder={t("equivalencias_buscar_material", "Buscar material...")}
                      slotProps={{
                        input: {
                          endAdornment: loadingOriginal && <CircularProgress size={20} />,
                        },
                      }}
                    />
                    {originalResults.length > 0 && (
                      <Paper
                        elevation={4}
                        sx={{
                          position: "absolute",
                          zIndex: 10,
                          width: "100%",
                          mt: 0.5,
                          maxHeight: 200,
                          overflow: "auto",
                        }}
                      >
                        {originalResults.map((mat) => (
                          <Box
                            key={mat.codigo}
                            onClick={() => selectOriginal(mat)}
                            sx={{
                              p: 1.5,
                              cursor: "pointer",
                              "&:hover": { bgcolor: "action.hover" },
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "primary.main" }}>
                              {mat.codigo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {mat.descripcion}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    )}
                  </Box>
                )}
              </Grid>

              {/* Material Equivalente */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="caption"
                  sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}
                >
                  {t("equivalencias_material_equivalente", "Material Equivalente")} *
                </Typography>
                {editingId !== null ? (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "secondary.main", fontWeight: 600 }}>
                      {formData.codigo_equivalente}
                    </Typography>
                  </Paper>
                ) : selectedEquivalente ? (
                  <Paper variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    <Check sx={{ color: "success.main" }} />
                    <Typography variant="body2" sx={{ fontFamily: "monospace", color: "secondary.main", fontWeight: 600 }}>
                      {selectedEquivalente.codigo}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {selectedEquivalente.descripcion}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedEquivalente(null);
                        setFormData((prev) => ({ ...prev, codigo_equivalente: "" }));
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Paper>
                ) : (
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={searchEquivalente}
                      onChange={(e) => setSearchEquivalente(e.target.value)}
                      placeholder={t("equivalencias_buscar_material", "Buscar material...")}
                      slotProps={{
                        input: {
                          endAdornment: loadingEquivalente && <CircularProgress size={20} />,
                        },
                      }}
                    />
                    {equivalenteResults.length > 0 && (
                      <Paper
                        elevation={4}
                        sx={{
                          position: "absolute",
                          zIndex: 10,
                          width: "100%",
                          mt: 0.5,
                          maxHeight: 200,
                          overflow: "auto",
                        }}
                      >
                        {equivalenteResults.map((mat) => (
                          <Box
                            key={mat.codigo}
                            onClick={() => selectEquivalente(mat)}
                            sx={{
                              p: 1.5,
                              cursor: "pointer",
                              "&:hover": { bgcolor: "action.hover" },
                              borderBottom: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontFamily: "monospace", color: "secondary.main" }}>
                              {mat.codigo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {mat.descripcion}
                            </Typography>
                          </Box>
                        ))}
                      </Paper>
                    )}
                  </Box>
                )}
              </Grid>

              {/* Compatibilidad */}
              <Grid size={{ xs: 12 }}>
                <Typography
                  variant="caption"
                  sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}
                >
                  {t("equivalencias_compatibilidad", "Porcentaje de Compatibilidad")} *
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Slider
                    value={formData.compatibilidad_pct}
                    onChange={(e, val) => setFormData((prev) => ({ ...prev, compatibilidad_pct: val }))}
                    min={0}
                    max={100}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={formData.compatibilidad_pct}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compatibilidad_pct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                      }))
                    }
                    sx={{ width: 80 }}
                    slotProps={{ input: { sx: { textAlign: "center" } } }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color:
                        formData.compatibilidad_pct >= 80
                          ? "#1b5e20"
                          : formData.compatibilidad_pct >= 50
                          ? "#f57c00"
                          : "#b71c1c",
                    }}
                  >
                    {formData.compatibilidad_pct}%
                  </Typography>
                </Box>
              </Grid>

              {/* Descripción */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t("equivalencias_descripcion", "Descripción")}
                  value={formData.descripcion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder={t("equivalencias_desc_placeholder", "Descripción de la equivalencia...")}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              {/* Notas */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t("equivalencias_notas", "Notas")}
                  value={formData.notas}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notas: e.target.value }))}
                  placeholder={t("equivalencias_notas_placeholder", "Notas adicionales...")}
                  multiline
                  rows={2}
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
              disabled={formLoading}
              sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                formLoading ||
                (editingId === null && (!formData.codigo_original || !formData.codigo_equivalente))
              }
              startIcon={formLoading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ textTransform: "uppercase" }}
            >
              {formLoading ? "Guardando..." : editingId !== null ? "Actualizar" : "Crear"}
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
            ¿Eliminar la equivalencia entre{" "}
            <strong style={{ fontFamily: "monospace" }}>{deleteDialog.item?.codigo_original}</strong> y{" "}
            <strong style={{ fontFamily: "monospace" }}>{deleteDialog.item?.codigo_equivalente}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDeleteDialog({ open: false, item: null })}
            disabled={formLoading}
            sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ textTransform: "uppercase" }}
          >
            {formLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
