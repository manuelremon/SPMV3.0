import { useEffect, useState, useCallback, useMemo } from "react";
import { materiales, equivalencias } from "../services/spm";
import { formatCurrency, formatAlmacen } from "../utils/formatters";
import { useI18n } from "../context/i18n";
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
  Alert,
  Chip,
  CircularProgress,
  Collapse,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Search,
  Close,
  ExpandMore,
  ExpandLess,
  Inventory,
  TrendingUp,
  History,
  Description,
  SwapHoriz,
  ArrowBack,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 500;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export default function CatalogoMateriales() {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Search state
  const [searchCodigo, setSearchCodigo] = useState("");
  const [searchDesc, setSearchDesc] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchGrupo, setSearchGrupo] = useState(null);
  const [grupoInputValue, setGrupoInputValue] = useState("");
  const [gruposOptions, setGruposOptions] = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  const debouncedCodigo = useDebouncedValue(searchCodigo, DEBOUNCE_MS);
  const debouncedDesc = useDebouncedValue(searchDesc, DEBOUNCE_MS);
  const debouncedKeyword = useDebouncedValue(searchKeyword, DEBOUNCE_MS);
  const debouncedGrupoInput = useDebouncedValue(grupoInputValue, DEBOUNCE_MS);

  // Results state
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Detail state
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Additional detail data
  const [solicitudesData, setSolicitudesData] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [equivalenciasData, setEquivalenciasData] = useState([]);
  const [loadingEquivalencias, setLoadingEquivalencias] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    stock: true,
    mrp: true,
    consumo: true,
    solicitudes: true,
    equivalencias: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Load grupos options for Autocomplete
  useEffect(() => {
    // Load initial grupos on mount and when search changes
    setLoadingGrupos(true);
    materiales
      .grupos(debouncedGrupoInput, 100)
      .then((res) => {
        const data = res.data?.data || [];
        setGruposOptions(data);
      })
      .catch((err) => {
        console.error("Error loading grupos:", err);
        setGruposOptions([]);
      })
      .finally(() => setLoadingGrupos(false));
  }, [debouncedGrupoInput]);

  // Search materials
  useEffect(() => {
    const shouldSearch =
      debouncedCodigo.trim() !== "" ||
      debouncedDesc.trim() !== "" ||
      debouncedKeyword.trim() !== "" ||
      searchGrupo !== null;

    if (!shouldSearch) {
      if (hasSearched) {
        setResults([]);
        setHasSearched(false);
      }
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);

    const searchTerms = [debouncedDesc.trim(), debouncedKeyword.trim()]
      .filter(Boolean)
      .join(" ");

    materiales
      .buscar({
        codigo: debouncedCodigo.trim(),
        descripcion: searchTerms,
        grupo: searchGrupo || "",
        limit: MAX_RESULTS,
      })
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setResults(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("search materiales", err);
        setError(err.response?.data?.error?.message || err.message);
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedCodigo, debouncedDesc, debouncedKeyword, searchGrupo, hasSearched]);

  // Load material detail
  const loadDetail = useCallback(async (mat) => {
    setSelectedMaterial(mat);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setDetail(null);
    setSolicitudesData([]);
    setEquivalenciasData([]);

    try {
      const res = await materiales.detalle(mat.codigo);
      setDetail(res.data || {});
    } catch (err) {
      console.error("detalle material", err);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }

    // Load solicitudes
    setLoadingSolicitudes(true);
    try {
      const res = await materiales.solicitudes(mat.codigo);
      setSolicitudesData(res.data?.solicitudes || []);
    } catch (err) {
      console.error("solicitudes material", err);
      setSolicitudesData([]);
    } finally {
      setLoadingSolicitudes(false);
    }

    // Load equivalencias
    setLoadingEquivalencias(true);
    try {
      const res = await equivalencias.porMaterial(mat.codigo);
      setEquivalenciasData(res.data?.equivalencias || []);
    } catch (err) {
      console.error("equivalencias material", err);
      setEquivalenciasData([]);
    } finally {
      setLoadingEquivalencias(false);
    }
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchCodigo("");
    setSearchDesc("");
    setSearchKeyword("");
    setSearchGrupo(null);
    setGrupoInputValue("");
    setResults([]);
    setHasSearched(false);
    setSelectedMaterial(null);
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedMaterial(null);
    setDetail(null);
  }, []);

  // DataGrid columns
  const columns = useMemo(
    () => [
      {
        field: "codigo",
        headerName: "Código",
        flex: 0.6,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, color: "primary.main" }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: "descripcion",
        headerName: "Descripción",
        flex: 1.5,
        minWidth: 250,
        headerAlign: "center",
        renderCell: (params) => (
          <Box>
            <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
              {params.value}
            </Typography>
            {params.row.descripcion_larga &&
              params.row.descripcion_larga !== params.value && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {params.row.descripcion_larga.substring(0, 60)}...
                </Typography>
              )}
          </Box>
        ),
      },
      {
        field: "unidad_medida",
        headerName: "Unidad",
        flex: 0.4,
        minWidth: 80,
        headerAlign: "center",
        align: "center",
        valueGetter: (value, row) => row.unidad_medida || row.unidad || "-",
      },
      {
        field: "precio_usd",
        headerName: "Precio USD",
        flex: 0.5,
        minWidth: 100,
        headerAlign: "center",
        align: "right",
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {formatCurrency(params.value || 0)}
          </Typography>
        ),
      },
      {
        field: "acciones",
        headerName: "Acciones",
        flex: 0.5,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        sortable: false,
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => loadDetail(params.row)}
            sx={{ textTransform: "uppercase", fontSize: "11px" }}
          >
            Ver Detalle
          </Button>
        ),
      },
    ],
    [loadDetail]
  );

  const dataGridSx = {
    border: "1px solid",
    borderColor: "divider",
    "& .MuiDataGrid-columnHeaders": {
      bgcolor: "grey.100",
    },
    "& .MuiDataGrid-columnHeader": {
      borderRight: "1px solid",
      borderBottom: "1px solid",
      borderColor: "divider",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    "& .MuiDataGrid-columnHeaderTitleContainer": {
      justifyContent: "center",
    },
    "& .MuiDataGrid-cell": {
      borderRight: "1px solid",
      borderColor: "divider",
      display: "flex",
      alignItems: "center",
    },
    "& .MuiDataGrid-row:hover": {
      bgcolor: "action.hover",
      cursor: "pointer",
    },
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, maxWidth: 1600 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "text.secondary" }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
            {t("catalogo_materiales_titulo", "Catálogo de Materiales")}
          </Typography>
        </Box>
      </Box>

      {/* Search Card */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-end" }}>
          <Box sx={{ minWidth: 150 }}>
            <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
              {t("catalogo_codigo_sap", "Código SAP")}
            </Typography>
            <TextField
              size="small"
              value={searchCodigo}
              onChange={(e) => setSearchCodigo(e.target.value)}
              placeholder="Ej: 100012345"
              slotProps={{ input: { sx: { fontFamily: "monospace" } } }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
              {t("catalogo_descripcion", "Descripción")}
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={searchDesc}
              onChange={(e) => setSearchDesc(e.target.value)}
              placeholder={t("catalogo_buscar_desc", "Buscar por descripción...")}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
              {t("catalogo_palabra_clave", "Palabra clave")}
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t("catalogo_buscar_keyword", "Filtro adicional...")}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
              {t("catalogo_grupo_articulos", "Grupo de Artículos")}
            </Typography>
            <Autocomplete
              size="small"
              options={gruposOptions}
              value={searchGrupo}
              onChange={(event, newValue) => setSearchGrupo(newValue)}
              inputValue={grupoInputValue}
              onInputChange={(event, newInputValue) => setGrupoInputValue(newInputValue)}
              loading={loadingGrupos}
              freeSolo={false}
              clearOnBlur
              handleHomeEndKeys
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={t("catalogo_buscar_grupo", "Buscar grupo...")}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingGrupos ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
              noOptionsText={t("catalogo_sin_grupos", "Sin grupos encontrados")}
              loadingText={t("common_cargando", "Cargando...")}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", height: 40 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">{t("common_buscando", "Buscando...")}</Typography>
              </Box>
            ) : hasSearched ? (
              <>
                <Chip
                  label={`${results.length} ${t("common_resultados", "resultados")}`}
                  color={results.length > 0 ? "primary" : "default"}
                  variant="outlined"
                  sx={{ height: 40 }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleClearSearch}
                  startIcon={<Close />}
                  sx={{ height: 40, textTransform: "uppercase" }}
                >
                  {t("common_limpiar", "Limpiar")}
                </Button>
              </>
            ) : (searchCodigo || searchDesc || searchKeyword || searchGrupo) ? (
              <IconButton size="small" onClick={handleClearSearch} sx={{ height: 40 }}>
                <Close fontSize="small" sx={{ color: "error.main" }} />
              </IconButton>
            ) : null}
          </Box>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Results */}
      <Paper elevation={2} sx={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
        {!hasSearched ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "text.secondary" }}>
            <Search sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography>{t("catalogo_instruccion", "Ingresa un código SAP, descripción o palabra clave para buscar materiales")}</Typography>
          </Box>
        ) : results.length === 0 && !loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "text.secondary" }}>
            <Inventory sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography>{t("catalogo_sin_resultados", "No se encontraron materiales con los criterios de búsqueda")}</Typography>
          </Box>
        ) : (
          <DataGrid
            rows={results}
            columns={columns}
            getRowId={(row) => row.codigo}
            loading={loading}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
            disableRowSelectionOnClick
            rowHeight={67}
            localeText={{ MuiTablePagination: { labelRowsPerPage: "Filas por página:" } }}
            onRowClick={(params) => loadDetail(params.row)}
            sx={{
              ...dataGridSx,
              "& .MuiDataGrid-row": { cursor: "pointer" },
              "& .MuiDataGrid-row:hover": { backgroundColor: "action.hover" },
            }}
          />
        )}
      </Paper>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontFamily: "monospace", color: "primary.main", mr: 2 }}>
              {selectedMaterial?.codigo}
            </Typography>
            <Typography variant="h6" component="span">
              {selectedMaterial?.descripcion}
            </Typography>
          </Box>
          <IconButton onClick={handleCloseModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetail ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedMaterial ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Basic Info */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                    {t("catalogo_desc_larga", "Descripción larga")}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedMaterial.descripcion_larga || selectedMaterial.descripcion || "N/D"}
                  </Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                      {t("catalogo_unidad", "Unidad")}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{selectedMaterial.unidad || "N/D"}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                      {t("catalogo_precio_usd", "Precio USD")}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(selectedMaterial.precio_usd || 0)}</Typography>
                  </Box>
                </Paper>
              </Box>

              {/* Stock Section */}
              <CollapsibleSection
                title={t("catalogo_stock", "Stock")}
                icon={<Inventory fontSize="small" />}
                expanded={expandedSections.stock}
                onToggle={() => toggleSection("stock")}
                color="info"
              >
                <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Stock Total</Typography>
                    <Typography variant="h6" fontWeight={600}>{detail?.stock_total ?? "N/D"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Pedidos en Curso</Typography>
                    <Typography variant="h6" fontWeight={600}>{detail?.pedidos_en_curso ?? "N/D"}</Typography>
                  </Box>
                </Box>
                {detail?.stock_detalle?.length > 0 && (
                  <Box sx={{ maxHeight: 150, overflow: "auto" }}>
                    {detail.stock_detalle.map((row, idx) => (
                      <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1, bgcolor: idx % 2 ? "grey.50" : "transparent", borderRadius: 1 }}>
                        <Typography variant="body2">Centro {row.centro}</Typography>
                        <Typography variant="body2" color="text.secondary">/ Almacén {formatAlmacen(row.almacen_consultado || row.almacen)}</Typography>
                        {row.lote && <Typography variant="body2" color="text.secondary">/ Lote {row.lote}</Typography>}
                        <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ ml: "auto" }}>Stock: {row.stock}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CollapsibleSection>

              {/* MRP Section */}
              <CollapsibleSection
                title={t("catalogo_mrp", "Parámetros MRP")}
                icon={<TrendingUp fontSize="small" />}
                expanded={expandedSections.mrp}
                onToggle={() => toggleSection("mrp")}
                color="warning"
                badge={detail?.mrp_list?.length}
              >
                {detail?.mrp_list?.length > 0 ? (
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {detail.mrp_list.map((mrp, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>Centro: {mrp.centro}</Typography>
                          <Typography variant="body2" color="text.secondary">| Almacén: {mrp.almacen}</Typography>
                          {mrp.sector && <Chip label={mrp.sector} size="small" />}
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, textAlign: "center" }}>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Stock Seg.</Typography>
                            <Typography variant="body2" fontWeight={600}>{mrp.stock_seguridad ?? 0}</Typography>
                          </Box>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Pto. Pedido</Typography>
                            <Typography variant="body2" fontWeight={600}>{mrp.punto_pedido ?? 0}</Typography>
                          </Box>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Stock Máx.</Typography>
                            <Typography variant="body2" fontWeight={600}>{mrp.stock_maximo ?? 0}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">{t("catalogo_sin_mrp", "Este material no está planificado en MRP")}</Typography>
                )}
              </CollapsibleSection>

              {/* Consumo Section */}
              <CollapsibleSection
                title={t("catalogo_consumo", "Consumo Histórico")}
                icon={<History fontSize="small" />}
                expanded={expandedSections.consumo}
                onToggle={() => toggleSection("consumo")}
                color="success"
                badge={detail?.consumo_list?.length}
              >
                {detail?.consumo_list?.length > 0 ? (
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {detail.consumo_list.map((c, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>Centro: {c.centro}</Typography>
                          <Typography variant="body2" color="text.secondary">| Almacén: {c.almacen}</Typography>
                        </Box>
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, textAlign: "center" }}>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Prom. Anual</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.main">{c.promedio_anual}</Typography>
                          </Box>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Total</Typography>
                            <Typography variant="body2" fontWeight={600}>{c.total}</Typography>
                          </Box>
                          <Box sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Años</Typography>
                            <Typography variant="body2" fontWeight={600}>{c.anio_desde}-{c.anio_hasta}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">{t("catalogo_sin_consumo", "No hay consumo histórico registrado")}</Typography>
                )}
              </CollapsibleSection>

              {/* Solicitudes Section */}
              <CollapsibleSection
                title={t("catalogo_solicitudes_spm", "Solicitudes SPM Activas")}
                icon={<Description fontSize="small" />}
                expanded={expandedSections.solicitudes}
                onToggle={() => toggleSection("solicitudes")}
                color="primary"
                badge={solicitudesData.length}
                loading={loadingSolicitudes}
              >
                {solicitudesData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t("catalogo_sin_solicitudes", "No hay solicitudes SPM activas para este material")}</Typography>
                ) : (
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {solicitudesData.map((sol) => (
                      <Paper key={sol.id} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2" fontWeight={600} color="primary.main">SPM #{sol.id}</Typography>
                          <Chip label={sol.estado} size="small" color={getStatusColor(sol.estado)} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Solicitante: {sol.solicitante}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Cantidad: {sol.cantidad_solicitada}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Fecha: {new Date(sol.fecha).toLocaleDateString()}</Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </CollapsibleSection>

              {/* Equivalencias Section */}
              <CollapsibleSection
                title={t("catalogo_equivalencias", "Materiales Equivalentes")}
                icon={<SwapHoriz fontSize="small" />}
                expanded={expandedSections.equivalencias}
                onToggle={() => toggleSection("equivalencias")}
                color="secondary"
                badge={equivalenciasData.length}
                loading={loadingEquivalencias}
              >
                {equivalenciasData.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t("catalogo_sin_equivalencias", "No hay materiales equivalentes registrados")}</Typography>
                ) : (
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                    {equivalenciasData.map((eq, idx) => (
                      <Paper key={eq.codigo_equivalente || idx} variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, color: "secondary.main" }}>
                            {eq.codigo_equivalente}
                          </Typography>
                          {eq.tipo_equivalencia && <Chip label={eq.tipo_equivalencia} size="small" variant="outlined" />}
                        </Box>
                        <Typography variant="body2">{eq.descripcion_equivalente}</Typography>
                        {eq.criterio && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            Criterio: {eq.criterio}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </CollapsibleSection>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </Container>
  );
}

// Helper Components
function CollapsibleSection({ title, icon, expanded, onToggle, color = "default", badge, loading, children }) {
  const colorMap = {
    default: "grey.200",
    primary: "primary.light",
    secondary: "secondary.light",
    success: "success.light",
    warning: "warning.light",
    info: "info.light",
  };

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", borderColor: expanded ? `${color}.main` : "divider" }}>
      <Box
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 2,
          cursor: "pointer",
          bgcolor: colorMap[color] || colorMap.default,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {icon}
        <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
        {badge !== undefined && badge > 0 && (
          <Chip label={badge} size="small" color={color !== "default" ? color : "primary"} />
        )}
        {loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
        <Box sx={{ ml: "auto" }}>{expanded ? <ExpandLess /> : <ExpandMore />}</Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

function getStatusColor(status) {
  const colors = {
    submitted: "warning",
    approved: "success",
    processing: "info",
    dispatched: "primary",
    rejected: "error",
    closed: "default",
    draft: "default",
  };
  return colors[status] || "default";
}
