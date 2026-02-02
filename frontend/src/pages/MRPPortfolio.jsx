/**
 * MRPPortfolio - Materials planned by MRP
 * Shows datagrid with material, description, center, warehouse, sector, planning parameters
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/i18n";
import api from "../services/api";

// MUI Components
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Skeleton,
  InputAdornment,
  Chip,
} from "@mui/material";

// MUI Icons
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LayersIcon from "@mui/icons-material/Layers";
import RefreshIcon from "@mui/icons-material/Refresh";
import InboxIcon from "@mui/icons-material/Inbox";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// ============================================================================
// UTILITIES
// ============================================================================

function formatNumber(value) {
  if (value == null || isNaN(value)) return "-";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

/** Summary card */
function SummaryCard({ label, value, subvalue }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "block",
          mb: 0.5,
          fontSize: "11px",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: "text.primary",
        }}
      >
        {value}
      </Typography>
      {subvalue && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            mt: 0.5,
            display: "block",
          }}
        >
          {subvalue}
        </Typography>
      )}
    </Paper>
  );
}

/** Select filter */
function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        IconComponent={KeyboardArrowDownIcon}
        sx={{
          height: 40,
          fontSize: "0.875rem",
          fontWeight: 500,
          bgcolor: "background.paper",
          "& .MuiSelect-select": {
            py: 1,
            px: 1.5,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "grey.300",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "grey.400",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "primary.main",
          },
        }}
      >
        <MenuItem value="">{placeholder}</MenuItem>
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/** Loading skeleton */
function LoadingSkeleton() {
  return (
    <Box>
      {[...Array(10)].map((_, i) => (
        <Stack
          key={i}
          direction="row"
          spacing={2}
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "grey.100",
          }}
        >
          <Skeleton variant="rectangular" width={80} height={16} />
          <Skeleton variant="rectangular" width={192} height={16} />
          <Skeleton variant="rectangular" width={64} height={16} />
          <Skeleton variant="rectangular" width={64} height={16} />
          <Skeleton variant="rectangular" width={80} height={16} />
          <Skeleton variant="rectangular" width={64} height={16} />
          <Skeleton variant="rectangular" width={64} height={16} />
          <Skeleton variant="rectangular" width={64} height={16} />
        </Stack>
      ))}
    </Box>
  );
}

/** Empty state */
function EmptyState({ onClearFilters }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        textAlign: "center",
      }}
    >
      <Box sx={{ color: "grey.300", mb: 2 }}>
        <InboxIcon sx={{ fontSize: 48 }} />
      </Box>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}
      >
        No se encontraron materiales MRP
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Prueba ajustando los filtros de busqueda
      </Typography>
      <Button
        onClick={onClearFilters}
        size="small"
        sx={{
          fontWeight: 600,
          textTransform: "none",
          color: "primary.main",
          bgcolor: "primary.50",
          "&:hover": {
            bgcolor: "primary.100",
          },
        }}
      >
        Limpiar filtros
      </Button>
    </Box>
  );
}

/** Alert wrapper */
function AlertMessage({ type = "error", children, onDismiss }) {
  if (!children) return null;
  return (
    <Alert
      severity={type}
      onClose={onDismiss}
      sx={{
        "& .MuiAlert-message": {
          fontWeight: 500,
        },
      }}
    >
      {children}
    </Alert>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MRPPortfolio() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Data state
  const [data, setData] = useState([]);
  const [filtros, setFiltros] = useState({ centros: [], almacenes: [], sectores: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [search, setSearch] = useState("");
  const [centro, setCentro] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [sector, setSector] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Load MRP portfolio data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        limit: pageSize,
        offset: page * pageSize,
      };

      if (centro) params.centro = centro;
      if (almacen) params.almacen = almacen;
      if (sector) params.sector = sector;
      if (search) {
        if (/^\d+$/.test(search)) {
          params.material = search;
        } else {
          params.descripcion = search;
        }
      }

      const res = await api.get("/mrp/portfolio", { params });

      if (res.data?.ok) {
        setData(res.data.data);
        setTotal(res.data.total);
        setFiltros(res.data.filtros || { centros: [], almacenes: [], sectores: [] });
      } else {
        setError("Error al cargar portfolio MRP");
      }
    } catch (err) {
      console.error("Error loading MRP portfolio:", err);
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [centro, almacen, sector, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [centro, almacen, sector, search]);

  const clearFilters = () => {
    setSearch("");
    setCentro("");
    setAlmacen("");
    setSector("");
    setPage(0);
  };

  const hasActiveFilters = search || centro || almacen || sector;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "grey.200",
          boxShadow: 1,
        }}
      >
        <Box sx={{ maxWidth: 1600, mx: "auto", px: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ height: 56 }}
          >
            {/* Left */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => navigate(-1)}
                size="small"
                sx={{
                  ml: -1,
                  color: "grey.400",
                  "&:hover": {
                    color: "grey.600",
                    bgcolor: "grey.100",
                  },
                }}
                aria-label="Volver"
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: "primary.main",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LayersIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t("mrp_portfolio_titulo", "Portfolio MRP")}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("mrp_portfolio_subtitulo", "Materiales planificados por MRP")}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            {/* Right */}
            <Button
              onClick={loadData}
              disabled={loading}
              variant="outlined"
              size="small"
              startIcon={
                loading ? (
                  <RefreshIcon
                    fontSize="small"
                    sx={{
                      animation: "spin 1s linear infinite",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                ) : (
                  <RefreshIcon fontSize="small" />
                )
              }
              sx={{
                height: 36,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontSize: "0.75rem",
                color: "text.secondary",
                borderColor: "grey.200",
                "&:hover": {
                  bgcolor: "grey.50",
                  borderColor: "grey.300",
                },
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Actualizar
              </Box>
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Main */}
      <Box component="main" sx={{ maxWidth: 1600, mx: "auto", px: 3, py: 3 }}>
        {error && (
          <Box sx={{ mb: 3 }}>
            <AlertMessage type="error" onDismiss={() => setError("")}>
              {error}
            </AlertMessage>
          </Box>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <SummaryCard
              label={t("mrp_total_materiales", "Materiales MRP")}
              value={formatNumber(total)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              label={t("mrp_centros", "Centros")}
              value={formatNumber(filtros.centros?.length || 0)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              label={t("mrp_almacenes", "Almacenes")}
              value={formatNumber(filtros.almacenes?.length || 0)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              label={t("mrp_sectores", "Sectores")}
              value={formatNumber(filtros.sectores?.length || 0)}
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "grey.100",
              bgcolor: "grey.50",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <FilterListIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Filtros
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              flexWrap="wrap"
              alignItems="center"
              gap={2}
            >
              {/* Search */}
              <TextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por codigo o descripcion..."
                size="small"
                sx={{
                  flex: 1,
                  minWidth: 250,
                  maxWidth: 400,
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    bgcolor: "background.paper",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "grey.400" }} />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Centro */}
              <FilterSelect
                value={centro}
                onChange={setCentro}
                options={filtros.centros}
                placeholder="Todos los centros"
              />

              {/* Almacen */}
              <FilterSelect
                value={almacen}
                onChange={setAlmacen}
                options={filtros.almacenes}
                placeholder="Todos los almacenes"
              />

              {/* Sector */}
              <FilterSelect
                value={sector}
                onChange={setSector}
                options={filtros.sectores}
                placeholder="Todos los sectores"
              />

              {/* Counter */}
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      bgcolor: "grey.400",
                      borderRadius: 0,
                    }}
                  />
                }
                label={`${total} materiales`}
                size="small"
                sx={{
                  bgcolor: "grey.100",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  "& .MuiChip-icon": {
                    ml: 1,
                  },
                }}
              />
            </Stack>
          </Box>
        </Paper>

        {/* Data Table */}
        <Paper variant="outlined">
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "grey.200",
              bgcolor: "grey.50",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "text.primary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {t("mrp_lista", "Materiales Planificados MRP")}
            </Typography>
          </Box>

          {loading ? (
            <LoadingSkeleton />
          ) : data.length === 0 ? (
            <EmptyState onClearFilters={clearFilters} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: "grey.50",
                      "& th": {
                        borderBottom: 2,
                        borderColor: "grey.200",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 1.5,
                        px: 1.5,
                      },
                    }}
                  >
                    <TableCell sx={{ borderRight: 1, borderColor: "grey.200" }}>
                      Material
                    </TableCell>
                    <TableCell
                      sx={{
                        borderRight: 1,
                        borderColor: "grey.200",
                        minWidth: 200,
                      }}
                    >
                      Descripcion
                    </TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "grey.200" }}>
                      Centro
                    </TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "grey.200" }}>
                      Almacen
                    </TableCell>
                    <TableCell sx={{ borderRight: 1, borderColor: "grey.200" }}>
                      Sector
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ borderRight: 1, borderColor: "grey.200" }}
                    >
                      Stock Seguridad
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ borderRight: 1, borderColor: "grey.200" }}
                    >
                      Punto Pedido
                    </TableCell>
                    <TableCell align="right">Stock Maximo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item, idx) => (
                    <TableRow
                      key={`${item.codigo_material}-${item.centro}-${item.almacen}-${idx}`}
                      sx={{
                        "&:hover": {
                          bgcolor: "grey.50",
                        },
                        "& td": {
                          borderBottom: 1,
                          borderColor: "grey.100",
                          py: 1.25,
                          px: 1.5,
                          fontSize: "13px",
                        },
                      }}
                    >
                      <TableCell sx={{ borderRight: 1, borderColor: "grey.100" }}>
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: "monospace",
                            color: "text.secondary",
                            fontSize: "13px",
                          }}
                        >
                          {item.codigo_material}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderRight: 1, borderColor: "grey.100" }}>
                        <Typography
                          component="span"
                          sx={{
                            color: "text.primary",
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                          title={item.descripcion}
                        >
                          {item.descripcion}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderRight: 1, borderColor: "grey.100" }}>
                        <Typography
                          component="span"
                          sx={{ color: "text.secondary", fontSize: "13px" }}
                        >
                          {item.centro}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderRight: 1, borderColor: "grey.100" }}>
                        <Typography
                          component="span"
                          sx={{ color: "text.secondary", fontSize: "13px" }}
                        >
                          {item.almacen}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderRight: 1, borderColor: "grey.100" }}>
                        <Typography
                          component="span"
                          sx={{ color: "text.secondary", fontSize: "13px" }}
                        >
                          {item.sector || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ borderRight: 1, borderColor: "grey.100" }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 500,
                            color: "text.primary",
                            fontSize: "13px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatNumber(item.stock_de_seguridad)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ borderRight: 1, borderColor: "grey.100" }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 500,
                            color: "primary.main",
                            fontSize: "13px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatNumber(item.punto_de_pedido)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 500,
                            color: "text.primary",
                            fontSize: "13px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatNumber(item.stock_maximo)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {!loading && data.length > 0 && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderTop: 1,
                borderColor: "grey.200",
                bgcolor: "grey.50",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Mostrando {page * pageSize + 1} -{" "}
                  {Math.min((page + 1) * pageSize, total)} de {total}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: "auto",
                      px: 1.5,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderColor: "grey.200",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "grey.50",
                        borderColor: "grey.300",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    Anterior
                  </Button>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1,
                      color: "text.secondary",
                      fontWeight: 500,
                    }}
                  >
                    {page + 1} / {totalPages || 1}
                  </Typography>
                  <Button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: "auto",
                      px: 1.5,
                      py: 0.75,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderColor: "grey.200",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "grey.50",
                        borderColor: "grey.300",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                      },
                    }}
                  >
                    Siguiente
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
