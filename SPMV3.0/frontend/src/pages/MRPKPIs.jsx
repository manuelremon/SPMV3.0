import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/i18n";
import api from "../services/api";
import { TempDataBanner } from "../components/ui/TempDataBanner";
// MUI Components
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Slider from "@mui/material/Slider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import OutlinedInput from "@mui/material/OutlinedInput";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WarningIcon from "@mui/icons-material/Warning";
import InventoryIcon from "@mui/icons-material/Inventory";
import SpeedIcon from "@mui/icons-material/Speed";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PieChartIcon from "@mui/icons-material/PieChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
// MUI X Charts
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";

// Colores del sistema SPM
const COLORS = {
  primary: "#567ebb",
  success: "#2e7d32",
  warning: "#ed6c02",
  error: "#d32f2f",
  info: "#0288d1",
};

// Icon mapping for KPIs
const kpiIcons = {
  materiales_en_riesgo: WarningIcon,
  materiales_sobrestock: InventoryIcon,
  rotacion_promedio: SpeedIcon,
  lead_time_promedio: AccessTimeIcon,
  cumplimiento_mrp: CheckCircleIcon,
  pedidos_vencidos: ErrorIcon,
  pct_pedidos_vencidos: ErrorIcon,
  velocidad_respuesta: SpeedIcon,
};

const kpiColors = {
  materiales_en_riesgo: COLORS.error,
  materiales_sobrestock: COLORS.warning,
  rotacion_promedio: COLORS.info,
  lead_time_promedio: COLORS.primary,
  cumplimiento_mrp: COLORS.success,
  pedidos_vencidos: COLORS.error,
  pct_pedidos_vencidos: COLORS.error,
  velocidad_respuesta: COLORS.info,
};

// KPI Card component
function KPICard({ titulo, valor, unidad, tendencia, objetivo, descripcion, icon: Icon, color = COLORS.primary }) {
  const getTendenciaIcon = () => {
    switch (tendencia) {
      case "up": return <TrendingUpIcon sx={{ fontSize: 16, color: COLORS.success }} />;
      case "down": return <TrendingDownIcon sx={{ fontSize: 16, color: COLORS.error }} />;
      default: return <TrendingFlatIcon sx={{ fontSize: 16, color: COLORS.warning }} />;
    }
  };

  const getTendenciaLabel = () => {
    switch (tendencia) {
      case "up": return "Subiendo";
      case "down": return "Bajando";
      default: return "Estable";
    }
  };

  const getTendenciaBg = () => {
    switch (tendencia) {
      case "up": return "#e8f5e9";
      case "down": return "#ffebee";
      default: return "#fff3e0";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box
          sx={{
            p: 1,
            borderRadius: 1.5,
            backgroundColor: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 2,
            backgroundColor: getTendenciaBg(),
          }}
        >
          {getTendenciaIcon()}
          <Typography variant="caption" sx={{ fontWeight: 500, fontSize: "0.7rem" }}>
            {getTendenciaLabel()}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 0.5, flex: 1 }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 700, color: "#1f1f20" }}>
          {valor}
        </Typography>
        {unidad && (
          <Typography variant="body2" component="span" sx={{ color: "#606d80", ml: 0.5 }}>
            {unidad}
          </Typography>
        )}
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 600, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {titulo}
      </Typography>
      {descripcion && (
        <Typography variant="caption" sx={{ color: "#9ca3af", fontSize: "0.65rem", mt: 0.25 }}>
          {descripcion}
        </Typography>
      )}

      {objetivo && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "#9ca3af" }}>
              Objetivo:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: valor <= objetivo ? COLORS.success : COLORS.error,
              }}
            >
              {objetivo} {unidad}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// Donut Chart component
function DonutChart({ data = [], t }) {
  const total = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, item) => sum + (item.valor || 0), 0);
  }, [data]);

  let currentAngle = 0;

  const createArc = (startAngle, endAngle) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const radius = 70;
    const cx = 90;
    const cy = 90;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  if (!data || data.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" py={4}>
        Sin datos disponibles
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
      <svg viewBox="0 0 180 180" width={160} height={160}>
        {data.map((item, idx) => {
          const angle = total > 0 ? (item.valor / total) * 360 : 0;
          const path = createArc(currentAngle, currentAngle + angle);
          currentAngle += angle;
          return (
            <path key={idx} d={path} fill={item.color} style={{ transition: "all 0.3s ease" }} />
          );
        })}
        <circle cx="90" cy="90" r="45" fill="white" />
        <text x="90" y="85" textAnchor="middle" fontSize="11" fill="#606d80">
          {t("mrp_total", "Total")}
        </text>
        <text x="90" y="105" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1f1f20">
          {total.toFixed(0)}%
        </text>
      </svg>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {data.map((item, idx) => (
          <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ color: "#606d80" }}>
              {item.nombre}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#1f1f20" }}>
              {(item.valor || 0).toFixed(1)}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Bar Chart component
function SimpleBarChart({ data = [], height = 160 }) {
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => Math.max(d.alertas || 0, d.resueltas || 0)), 1);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" py={4}>
        Sin datos disponibles
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, justifyContent: "space-between", height }}>
      {data.map((item, idx) => (
        <Box key={idx} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-end", height: "100%" }}>
            <Tooltip title={`Alertas: ${item.alertas || 0}`}>
              <Box
                sx={{
                  width: 14,
                  backgroundColor: COLORS.error,
                  borderRadius: "3px 3px 0 0",
                  transition: "all 0.5s ease",
                  height: `${((item.alertas || 0) / maxValue) * 100}%`,
                  minHeight: 3,
                }}
              />
            </Tooltip>
            <Tooltip title={`Resueltas: ${item.resueltas || 0}`}>
              <Box
                sx={{
                  width: 14,
                  backgroundColor: COLORS.success,
                  borderRadius: "3px 3px 0 0",
                  transition: "all 0.5s ease",
                  height: `${((item.resueltas || 0) / maxValue) * 100}%`,
                  minHeight: 3,
                }}
              />
            </Tooltip>
          </Box>
          <Typography variant="caption" sx={{ color: "#9ca3af", whiteSpace: "nowrap", fontSize: "0.65rem" }}>
            {new Date(item.fecha).toLocaleDateString("es", { day: "2-digit", month: "short" })}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// Gauge Chart using MUI X Charts
function GaugeChartMUI({ value, label }) {
  const getColor = () => {
    if (value >= 80) return COLORS.success;
    if (value >= 50) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Gauge
        value={value}
        valueMin={0}
        valueMax={100}
        height={140}
        width={140}
        startAngle={-110}
        endAngle={110}
        text={({ value }) => `${value}%`}
        sx={{
          [`& .${gaugeClasses.valueText}`]: {
            fontSize: 20,
            fontWeight: "bold",
          },
          [`& .${gaugeClasses.valueArc}`]: {
            fill: getColor(),
          },
        }}
      />
      <Typography variant="caption" sx={{ color: "#606d80", mt: -1 }}>
        {label}
      </Typography>
    </Box>
  );
}

// Estados posibles para filtro
const ESTADOS_OPTIONS = [
  { id: "critico", label: "Crítico" },
  { id: "bajo_stock", label: "Bajo Stock" },
  { id: "sobrestock", label: "Sobrestock" },
  { id: "normal", label: "Normal" },
];

export default function MRPKPIs() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpisData, setKpisData] = useState(null);

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    centros: [],
    almacenes: [],
    sectores: [],
    estados: [],
  });
  const [catalogos, setCatalogos] = useState({ centros: [], almacenes: [], sectores: [] });

  // Estados para slider de fechas (0 = hace 1 año, 365 = hoy)
  const [rangoFechasLocal, setRangoFechasLocal] = useState([0, 365]);
  const rangoFechas = useDebouncedValue(rangoFechasLocal, 300);

  // Función para convertir valor del slider a fecha (formato DD/MM/AA)
  const sliderAFecha = (valor) => {
    const diasHaciaAtras = 365 - valor;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasHaciaAtras);
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const yy = String(fecha.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Función para convertir valor del slider a fecha ISO (YYYY-MM-DD)
  const sliderAFechaISO = (valor) => {
    const diasHaciaAtras = 365 - valor;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasHaciaAtras);
    return fecha.toISOString().split("T")[0];
  };

  // Cargar catálogos al montar y seleccionar todos por defecto
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await api.get("/mrp/catalogos");
        if (res.data?.ok) {
          const centros = res.data.centros || [];
          const almacenes = res.data.almacenes || [];
          const sectores = res.data.sectores || [];
          setCatalogos({ centros, almacenes, sectores });
          // Seleccionar todos los filtros por defecto
          setFiltros({
            centros: centros.map((c) => c.id),
            almacenes: almacenes.map((a) => a.id),
            sectores: sectores.map((s) => s.id),
            estados: ESTADOS_OPTIONS.map((e) => e.id),
          });
        }
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };
    fetchCatalogos();
  }, []);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      // Agregar fechas del slider
      params.append("fecha_desde", sliderAFechaISO(rangoFechas[0]));
      params.append("fecha_hasta", sliderAFechaISO(rangoFechas[1]));
      if (filtros.centros.length) params.append("centros", filtros.centros.join(","));
      if (filtros.almacenes.length) params.append("almacenes", filtros.almacenes.join(","));
      if (filtros.sectores.length) params.append("sectores", filtros.sectores.join(","));
      if (filtros.estados.length) params.append("estados", filtros.estados.join(","));

      const res = await api.get(`/mrp/kpis?${params.toString()}`);
      if (res.data?.ok) {
        setKpisData(res.data);
      } else {
        setError(res.data?.error?.message || "Error al cargar KPIs");
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtros, rangoFechas]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  // Handlers para filtros (Select multiselect)
  const handleFiltroChange = (campo, opciones) => (event) => {
    const value = event.target.value;
    if (value.includes("__todos__")) {
      const currentValues = filtros[campo];
      if (currentValues.length === opciones.length) {
        setFiltros((prev) => ({ ...prev, [campo]: [] }));
      } else {
        setFiltros((prev) => ({ ...prev, [campo]: opciones.map((o) => o.id || o) }));
      }
    } else {
      setFiltros((prev) => ({ ...prev, [campo]: typeof value === "string" ? value.split(",") : value }));
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltros({ centros: [], almacenes: [], sectores: [], estados: [] });
    setRangoFechasLocal([0, 365]);
  };

  // MenuProps para los multiselect
  const MenuProps = {
    PaperProps: { style: { maxHeight: 32 * 6 + 4, width: 160 } },
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {t("mrp_kpis_titulo", "KPI'S MRP")}
        </Typography>
      </Box>

      {/* Temp Data Banner */}
      <TempDataBanner />

      {/* Filtros - estilo Dashboard */}
      <Paper elevation={0} sx={{ mb: 3, border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        <div className="py-3 px-6" style={{ height: "73px" }}>
          <div className="flex items-center gap-6 h-full">
          {/* Slider de fechas */}
          <div className="flex flex-col gap-0 min-w-[320px]">
            <label className="text-xs font-medium text-slate-600 mt-2">
              Desde <span className="text-blue-600 font-semibold">{sliderAFecha(rangoFechasLocal[0])}</span> hasta <span className="text-blue-600 font-semibold">{sliderAFecha(rangoFechasLocal[1])}</span>
            </label>
            <Slider
              size="small"
              value={rangoFechasLocal}
              onChange={(_, value) => setRangoFechasLocal(value)}
              min={0}
              max={365}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => sliderAFecha(value)}
              getAriaLabel={() => "Rango de fechas"}
              sx={{ color: "#2196f3", "& .MuiSlider-thumb": { width: 14, height: 14 }, "& .MuiSlider-valueLabel": { fontSize: 10 } }}
            />
            <div className="flex justify-between text-[10px] text-slate-400 -mt-1">
              <span>Hace 1 año</span>
              <span>Hoy</span>
            </div>
          </div>

          {/* Separador */}
          <div className="h-16 w-px bg-slate-200" />

          {/* Centro */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="centro-label" sx={{ fontSize: "0.75rem" }}>Centro</InputLabel>
            <Select
              labelId="centro-label"
              multiple
              value={filtros.centros}
              onChange={handleFiltroChange("centros", catalogos.centros)}
              input={<OutlinedInput label="Centro" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.centros.length === catalogos.centros.length && catalogos.centros.length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {catalogos.centros.map((centro) => (
                <MenuItem key={centro.id} value={centro.id}>
                  <Checkbox checked={filtros.centros.includes(centro.id)} size="small" />
                  <ListItemText primary={centro.nombre} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Almacén */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="almacen-label" sx={{ fontSize: "0.75rem" }}>Almacén</InputLabel>
            <Select
              labelId="almacen-label"
              multiple
              value={filtros.almacenes}
              onChange={handleFiltroChange("almacenes", catalogos.almacenes)}
              input={<OutlinedInput label="Almacén" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.almacenes.length === catalogos.almacenes.length && catalogos.almacenes.length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {catalogos.almacenes.map((almacen) => (
                <MenuItem key={almacen.id} value={almacen.id}>
                  <Checkbox checked={filtros.almacenes.includes(almacen.id)} size="small" />
                  <ListItemText primary={almacen.nombre} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sector */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sector-label" sx={{ fontSize: "0.75rem" }}>Sector</InputLabel>
            <Select
              labelId="sector-label"
              multiple
              value={filtros.sectores}
              onChange={handleFiltroChange("sectores", catalogos.sectores)}
              input={<OutlinedInput label="Sector" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.sectores.length === catalogos.sectores.length && catalogos.sectores.length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {catalogos.sectores.map((sector) => (
                <MenuItem key={sector.id} value={sector.id}>
                  <Checkbox checked={filtros.sectores.includes(sector.id)} size="small" />
                  <ListItemText primary={sector.nombre} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Estado */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="estado-label" sx={{ fontSize: "0.75rem" }}>Estado</InputLabel>
            <Select
              labelId="estado-label"
              multiple
              value={filtros.estados}
              onChange={handleFiltroChange("estados", ESTADOS_OPTIONS)}
              input={<OutlinedInput label="Estado" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.estados.length === ESTADOS_OPTIONS.length} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {ESTADOS_OPTIONS.map((estado) => (
                <MenuItem key={estado.id} value={estado.id}>
                  <Checkbox checked={filtros.estados.includes(estado.id)} size="small" />
                  <ListItemText primary={estado.label} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

            {/* Limpiar Filtros */}
            <button
              type="button"
              onClick={handleLimpiarFiltros}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-md hover:border-blue-300 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : kpisData ? (
        <>
          {/* KPI Cards Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            {Object.entries(kpisData.kpis || {}).map(([key, kpi]) => (
              <KPICard
                key={key}
                titulo={key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                valor={kpi.valor}
                unidad={kpi.unidad}
                tendencia={kpi.tendencia}
                objetivo={kpi.objetivo}
                descripcion={kpi.descripcion}
                icon={kpiIcons[key] || BarChartIcon}
                color={kpiColors[key] || COLORS.primary}
              />
            ))}
          </Box>

          {/* Charts Row */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            {/* Distribution Chart */}
            <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
                <PieChartIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1f1f20" }}>
                  {t("mrp_distribucion_estados", "Distribución de Estados")}
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                {kpisData.graficos?.distribucion_estados && (
                  <DonutChart data={kpisData.graficos.distribucion_estados} t={t} />
                )}
              </Box>
            </Paper>

            {/* Cumplimiento Gauge */}
            <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
                <CheckCircleIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1f1f20" }}>
                  {t("mrp_cumplimiento", "Cumplimiento MRP")}
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                <GaugeChartMUI
                  value={kpisData.kpis?.cumplimiento_mrp?.valor || 0}
                  label={t("mrp_nivel_cumplimiento", "Nivel de Cumplimiento")}
                />
              </Box>
            </Paper>
          </Box>

          {/* Evolution Chart */}
          <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
              <ShowChartIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1f1f20" }}>
                {t("mrp_evolucion_alertas", "Evolución de Alertas")}
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, backgroundColor: COLORS.error }} />
                  <Typography variant="caption" sx={{ color: "#606d80" }}>
                    {t("mrp_alertas_generadas", "Alertas Generadas")}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, backgroundColor: COLORS.success }} />
                  <Typography variant="caption" sx={{ color: "#606d80" }}>
                    {t("mrp_alertas_resueltas", "Alertas Resueltas")}
                  </Typography>
                </Box>
              </Box>
              {kpisData.graficos?.evolucion_alertas && (
                <SimpleBarChart data={kpisData.graficos.evolucion_alertas} height={160} />
              )}
            </Box>
          </Paper>

          {/* Top Materials at Risk */}
          <Paper elevation={0} sx={{ border: "1px solid #e0e0e0", borderRadius: 2, overflow: "hidden", mb: 3 }}>
            <Box sx={{ p: 1.5, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 1 }}>
              <WarningIcon sx={{ color: COLORS.warning, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1f1f20" }}>
                {t("mrp_top_riesgo", "Top Materiales en Riesgo")}
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {(kpisData.graficos?.top_materiales_riesgo || []).length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: COLORS.success, opacity: 0.6, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: "#606d80" }}>
                    No hay materiales en riesgo
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(kpisData.graficos?.top_materiales_riesgo || []).map((mat, idx) => (
                    <Box
                      key={mat.codigo}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.5,
                        borderRadius: 1.5,
                        border: "1px solid #e0e0e0",
                        "&:hover": { borderColor: COLORS.primary, backgroundColor: "#fafafa" },
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 12,
                            backgroundColor: idx === 0 ? "#ffebee" : idx === 1 ? "#fff3e0" : "#e3f2fd",
                            color: idx === 0 ? COLORS.error : idx === 1 ? COLORS.warning : COLORS.primary,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace", color: COLORS.primary }}>
                            {mat.codigo}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#606d80" }}>
                            {mat.descripcion}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.error }}>
                          {mat.dias_sin_stock} {t("mrp_dias", "días")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                          {t("mrp_sin_stock", "sin stock")}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>

          {/* Info footer */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              backgroundColor: "#fafafa",
            }}
          >
            <Box sx={{ display: "flex", gap: 4 }}>
              <Typography variant="body2" sx={{ color: "#606d80" }}>
                <strong>{t("mrp_periodo", "Período:")}</strong> {kpisData.fecha_inicio} a {kpisData.fecha_fin}
              </Typography>
              <Typography variant="body2" sx={{ color: "#606d80" }}>
                <strong>{t("mrp_total_materiales", "Total materiales:")}</strong> {kpisData.total_materiales}
              </Typography>
            </Box>
          </Paper>
        </>
      ) : null}
    </Container>
  );
}
