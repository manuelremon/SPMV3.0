import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/i18n";
import api from "../services/api";
import { exportToExcel } from "../utils/formatters";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  SvgIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  OutlinedInput,
  Slider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { ArrowBack } from "@mui/icons-material";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
// Lazy load PieChart to reduce initial bundle
const PieChart = lazy(() => import("@mui/x-charts/PieChart").then(m => ({ default: m.PieChart })));

// Icono de descarga personalizado
const DownloadIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z" />
  </SvgIcon>
);

// Estados de alerta
const ESTADOS_OPTIONS = [
  { value: "quiebre", label: "Quiebre de Stock" },
  { value: "bajo punto", label: "Bajo Punto de Pedido" },
  { value: "bajo stock", label: "Bajo Stock de Seguridad" },
  { value: "exceso", label: "Exceso/Sobrestock" },
  { value: "normal", label: "Normal" },
];

// Colores para estados
const estadoColors = {
  danger: { color: "#b71c1c", bg: "#ffebee" },
  warning: { color: "#e65100", bg: "#fff3e0" },
  success: { color: "#1b5e20", bg: "#e8f5e9" },
  info: { color: "#0d47a1", bg: "#e3f2fd" },
};

export default function MRPTableroAlertas() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [resumen, setResumen] = useState({});
  const [exporting, setExporting] = useState(false);

  // Filtros multiselect
  const [filtros, setFiltros] = useState({
    centros: [],
    almacenes: [],
    sectores: [],
    estados: [],
  });
  const [catalogos, setCatalogos] = useState({ centros: [], almacenes: [], sectores: [] });

  // Búsqueda local
  const [searchTerm, setSearchTerm] = useState("");

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

  // MenuProps para los multiselect
  const MenuProps = {
    PaperProps: { style: { maxHeight: 32 * 6 + 4, width: 200 } },
  };

  // Cargar catálogos y seleccionar todos por defecto
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const res = await api.get("/mrp/catalogos");
        if (res.data?.ok) {
          setCatalogos(res.data);
          // Seleccionar todos por defecto (guardar como arrays de strings)
          setFiltros({
            centros: (res.data.centros || []).map(c => c.codigo),
            almacenes: (res.data.almacenes || []).map(a => a.codigo),
            sectores: (res.data.sectores || []).map(s => s.nombre),
            estados: ESTADOS_OPTIONS.map(e => e.value),
          });
        }
      } catch (err) {
        console.error("Error loading catalogos:", err);
      }
    };
    fetchCatalogos();
  }, []);

  // Handlers para filtros (Select multiselect estilo Dashboard)
  const handleFiltroChange = (campo, opciones, keyField = "codigo") => (event) => {
    const value = event.target.value;
    if (value.includes("__todos__")) {
      const currentValues = filtros[campo];
      const allValues = opciones.map((o) => o[keyField] || o.value || o);
      if (currentValues.length === opciones.length) {
        setFiltros((prev) => ({ ...prev, [campo]: [] }));
      } else {
        setFiltros((prev) => ({ ...prev, [campo]: allValues }));
      }
    } else {
      setFiltros((prev) => ({ ...prev, [campo]: typeof value === "string" ? value.split(",") : value }));
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltros({ centros: [], almacenes: [], sectores: [], estados: [] });
    setSearchTerm("");
    setRangoFechasLocal([0, 365]);
  };

  // Cargar alertas
  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Solo enviar filtros si NO están todos seleccionados
      const allCentros = catalogos.centros || [];
      const allAlmacenes = catalogos.almacenes || [];
      const allSectores = catalogos.sectores || [];

      if (filtros.centros.length > 0 && filtros.centros.length < allCentros.length) {
        filtros.centros.forEach(c => params.append("centro", c));
      }
      if (filtros.almacenes.length > 0 && filtros.almacenes.length < allAlmacenes.length) {
        filtros.almacenes.forEach(a => params.append("almacen", a));
      }
      if (filtros.sectores.length > 0 && filtros.sectores.length < allSectores.length) {
        filtros.sectores.forEach(s => params.append("sector", s));
      }
      if (filtros.estados.length > 0 && filtros.estados.length < ESTADOS_OPTIONS.length) {
        filtros.estados.forEach(e => params.append("estado", e));
      }
      params.append("limit", "500");

      const res = await api.get(`/mrp/alertas?${params.toString()}`);
      if (res.data?.ok) {
        setAlertas(res.data.data || []);
        setResumen(res.data.resumen || {});
      } else {
        setError(res.data?.error?.message || "Error al cargar alertas");
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtros, catalogos]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  // Filtrar por búsqueda local
  const filteredAlertas = useMemo(() => {
    if (!searchTerm) return alertas;
    const term = searchTerm.toLowerCase();
    return alertas.filter(
      (alerta) =>
        alerta.codigo?.toLowerCase().includes(term) ||
        alerta.descripcion?.toLowerCase().includes(term)
    );
  }, [alertas, searchTerm]);

  // Exportar a XLSX
  const handleExportXLSX = useCallback(() => {
    if (filteredAlertas.length === 0) return;
    setExporting(true);

    const dataToExport = filteredAlertas.map((row) => ({
      "Material": row.codigo || "",
      "Descripción": row.descripcion || "",
      "Demanda Est. Anual": Math.round(row.demanda_estimada_anual || 0),
      "Cons. Prom. Anual": Math.round(row.consumo_promedio_anual || 0),
      "Stock Seguridad": row.stock_seguridad || 0,
      "Punto Pedido": row.punto_pedido || 0,
      "Stock Máximo": row.stock_maximo || 0,
      "Stock Actual": row.stock_actual || 0,
      "Pedidos en Curso": row.pedidos_en_curso || 0,
      "Rotación %": Math.round(row.rotacion_pct || 0),
      "Estado": row.estado || "",
      "Sugerencia": row.sugerencia || "",
    }));

    try {
      exportToExcel(dataToExport, `alertas_mrp_${new Date().toISOString().split("T")[0]}.xls`);
    } finally {
      setExporting(false);
    }
  }, [filteredAlertas]);

  // Exportar a PDF con cards como encabezado
  const handleExportPDF = useCallback(() => {
    if (filteredAlertas.length === 0) return;
    setExporting(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor permite ventanas emergentes para exportar a PDF");
      setExporting(false);
      return;
    }

    // Generar HTML para las cards de resumen
    const cardsData = [
      { titulo: "Total", valor: resumen.total || 0, color: "#1565c0" },
      { titulo: "Quiebre de Stock", valor: resumen.quiebre_stock || 0, color: "#b71c1c" },
      { titulo: "Bajo Stock Seg.", valor: resumen.bajo_stock_seguridad || 0, color: "#aa00ff" },
      { titulo: "Bajo Punto Pedido", valor: resumen.bajo_punto_pedido || 0, color: "#3e2723" },
      { titulo: "Sobrestock", valor: resumen.sobrestock || 0, color: "#ff3d00" },
      { titulo: "Normal", valor: resumen.normal || 0, color: "#2e7d32" },
    ];

    const cardsHtml = cardsData.map((card) => `
      <div style="flex: 1; text-align: center; padding: 8px; border-right: 1px solid #dce0e6;">
        <div style="font-size: 24px; font-weight: 700; color: ${card.color};">${card.valor}</div>
        <div style="font-size: 10px; text-transform: uppercase; color: #606d80; font-weight: 600;">${card.titulo}</div>
      </div>
    `).join("");

    // Generar tabla
    const headers = ["Material", "Descripción", "Demanda", "Cons. Prom.", "SS", "PP", "SM", "Stock", "Ped. Curso", "Rot. %", "Estado", "Sugerencia"];
    const headerCells = headers.map((h) => `<th style="border: 1px solid #dce0e6; padding: 6px 4px; background: #f5f7fa; color: #1f1f20; font-size: 9px; text-align: center; font-weight: 600;">${h}</th>`).join("");

    const tableRows = filteredAlertas.map((row) => {
      const stockColor = (row.stock_actual || 0) <= 0 ? "#b71c1c" : (row.stock_actual || 0) < (row.punto_pedido || 0) ? "#e65100" : "#1b5e20";
      const rotColor = (row.rotacion_pct || 0) > 300 ? "#1b5e20" : (row.rotacion_pct || 0) > 100 ? "#e65100" : "#b71c1c";

      return `<tr>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${row.codigo || ""}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px;">${row.descripcion || ""}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${Math.round(row.demanda_estimada_anual || 0)}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${Math.round(row.consumo_promedio_anual || 0)}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${row.stock_seguridad || 0}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${row.punto_pedido || 0}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${row.stock_maximo || 0}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center; color: ${stockColor}; font-weight: 600;">${row.stock_actual || 0}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center;">${row.pedidos_en_curso || 0}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center; color: ${rotColor}; font-weight: 600;">${Math.round(row.rotacion_pct || 0)}%</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px; text-align: center; text-transform: uppercase;">${row.estado || ""}</td>
        <td style="border: 1px solid #dce0e6; padding: 4px; font-size: 9px;">${row.sugerencia || ""}</td>
      </tr>`;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tablero de Alertas MRP</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          @media print {
            .header-section {
              position: running(header);
            }
            thead { display: table-header-group; }
          }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header-section { margin-bottom: 20px; }
          h1 { margin: 0 0 15px 0; font-size: 20px; color: #1f1f20; }
          .cards-container { display: flex; border: 1px solid #dce0e6; border-radius: 8px; margin-bottom: 15px; }
          .cards-container > div:last-child { border-right: none; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .fecha { font-size: 11px; color: #606d80; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header-section">
          <h1>Tablero de Alertas MRP</h1>
          <div class="fecha">Fecha de exportación: ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          <div class="cards-container">${cardsHtml}</div>
        </div>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setExporting(false);
  }, [filteredAlertas, resumen]);

  // Columnas del DataGrid
  const columns = useMemo(
    () => [
      {
        field: "codigo",
        headerName: "Material",
        flex: 0.7,
        minWidth: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "descripcion",
        headerName: "Descripción",
        flex: 1.5,
        minWidth: 200,
        headerAlign: "center",
      },
      {
        field: "demanda_estimada_anual",
        flex: 0.5,
        minWidth: 70,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Demanda Estimada Anual" arrow>
            <span style={{ fontWeight: 700 }}>Demanda</span>
          </Tooltip>
        ),
        valueFormatter: (value) => Math.round(value || 0).toLocaleString("es-AR"),
      },
      {
        field: "consumo_promedio_anual",
        headerName: "Cons. Prom. Anual",
        flex: 0.6,
        minWidth: 80,
        headerAlign: "center",
        align: "center",
        valueFormatter: (value) => Math.round(value || 0).toLocaleString("es-AR"),
      },
      {
        field: "stock_seguridad",
        flex: 0.4,
        minWidth: 50,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock de Seguridad" arrow>
            <span style={{ fontWeight: 700 }}>SS</span>
          </Tooltip>
        ),
      },
      {
        field: "punto_pedido",
        flex: 0.4,
        minWidth: 50,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Punto de Pedido" arrow>
            <span style={{ fontWeight: 700 }}>PP</span>
          </Tooltip>
        ),
      },
      {
        field: "stock_maximo",
        flex: 0.4,
        minWidth: 50,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock Máximo" arrow>
            <span style={{ fontWeight: 700 }}>SM</span>
          </Tooltip>
        ),
      },
      {
        field: "stock_actual",
        flex: 0.4,
        minWidth: 60,
        headerAlign: "center",
        align: "center",
        renderHeader: () => (
          <Tooltip title="Stock HOY" arrow>
            <span style={{ fontWeight: 700 }}>Stock</span>
          </Tooltip>
        ),
        renderCell: (params) => {
          const stock = params.value || 0;
          const pp = params.row.punto_pedido || 0;
          let color = "#1b5e20"; // green
          if (stock <= 0) color = "#b71c1c"; // red
          else if (stock < pp) color = "#e65100"; // orange
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {stock}
            </Typography>
          );
        },
      },
      {
        field: "pedidos_en_curso",
        headerName: "Pedidos Curso",
        flex: 0.5,
        minWidth: 70,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "rotacion_pct",
        headerName: "Rotación %",
        flex: 0.5,
        minWidth: 70,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const rot = Math.round(params.value || 0);
          let color = "#b71c1c"; // red
          if (rot > 300) color = "#1b5e20"; // green
          else if (rot > 100) color = "#e65100"; // orange
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rot}%
            </Typography>
          );
        },
      },
      {
        field: "estado",
        headerName: "Estado",
        flex: 0.6,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const clase = params.row.estado_clase || "info";
          const colors = estadoColors[clase] || estadoColors.info;
          return (
            <Typography
              variant="caption"
              sx={{
                color: colors.color,
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
        field: "sugerencia",
        headerName: "Sugerencia",
        flex: 1,
        minWidth: 150,
        headerAlign: "center",
      },
    ],
    []
  );

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t("mrp_alertas_titulo", "TABLERO DE ALERTAS MRP")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Descargar XLSX">
              <IconButton
                onClick={handleExportXLSX}
                disabled={loading || exporting || filteredAlertas.length === 0}
                size="small"
                sx={{
                  color: '#388e3c',
                  border: '1px solid #388e3c',
                  borderRadius: 1,
                  padding: '4px 8px',
                  '&:hover': {
                    backgroundColor: '#388e3c',
                    color: '#fff'
                  },
                  '&.Mui-disabled': {
                    border: '1px solid rgba(0, 0, 0, 0.26)',
                  }
                }}
              >
                <DownloadIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>XLSX</span>
              </IconButton>
            </Tooltip>
            <Tooltip title="Descargar PDF">
              <IconButton
                onClick={handleExportPDF}
                disabled={loading || exporting || filteredAlertas.length === 0}
                size="small"
                sx={{
                  color: '#d32f2f',
                  border: '1px solid #d32f2f',
                  borderRadius: 1,
                  padding: '4px 8px',
                  '&:hover': {
                    backgroundColor: '#d32f2f',
                    color: '#fff'
                  },
                  '&.Mui-disabled': {
                    border: '1px solid rgba(0, 0, 0, 0.26)',
                  }
                }}
              >
                <DownloadIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>PDF</span>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Resumen Cards */}
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "stretch",
          mb: 2,
          border: "1px solid #dce0e6",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {[
          { titulo: "Total", valor: resumen.total || 0, color: "#1565c0", showChart: false },
          { titulo: "Quiebre de Stock", valor: resumen.quiebre_stock || 0, color: "#b71c1c", showChart: true },
          { titulo: "Bajo Stock Seg.", valor: resumen.bajo_stock_seguridad || 0, color: "#aa00ff", showChart: true },
          { titulo: "Bajo Punto Pedido", valor: resumen.bajo_punto_pedido || 0, color: "#3e2723", showChart: true },
          { titulo: "Sobrestock", valor: resumen.sobrestock || 0, color: "#ff3d00", showChart: true },
          { titulo: "Normal", valor: resumen.normal || 0, color: "#2e7d32", showChart: true },
        ].map((item, index, arr) => {
          const total = resumen.total || 1;
          const pct = item.showChart ? Math.round((item.valor / total) * 100) : 0;
          return (
            <Box
              key={item.titulo}
              sx={{
                flex: 1,
                textAlign: "center",
                py: 1.5,
                px: 1,
                borderRight: index < arr.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h4" fontWeight={700} sx={{ color: item.color }}>
                {item.valor}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "11px",
                  mb: item.showChart ? 0.5 : 0,
                }}
              >
                {item.titulo}
              </Typography>
              {item.showChart && (
                <Box sx={{ position: "relative", width: 60, height: 35, mt: 0.5 }}>
                  <Suspense fallback={<Box sx={{ width: 60, height: 35, bgcolor: "#f0f0f0", borderRadius: 1 }} />}>
                    <PieChart
                      series={[
                        {
                          startAngle: -90,
                          endAngle: 90,
                          paddingAngle: 2,
                          innerRadius: "55%",
                          outerRadius: "100%",
                          data: [
                            { value: pct, color: item.color },
                            { value: 100 - pct, color: "#e0e0e0" },
                          ],
                        },
                      ]}
                      width={60}
                      height={35}
                      slotProps={{ legend: { hidden: true } }}
                      margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    />
                  </Suspense>
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontWeight: 700,
                      fontSize: "10px",
                      color: item.color,
                    }}
                  >
                    {pct}%
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Paper>

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
              onChange={handleFiltroChange("centros", catalogos.centros || [], "codigo")}
              input={<OutlinedInput label="Centro" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.centros.length === (catalogos.centros || []).length && (catalogos.centros || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.centros || []).map((centro) => (
                <MenuItem key={centro.codigo} value={centro.codigo}>
                  <Checkbox checked={filtros.centros.includes(centro.codigo)} size="small" />
                  <ListItemText primary={`${centro.codigo} - ${centro.nombre}`} primaryTypographyProps={{ fontSize: "0.75rem" }} />
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
              onChange={handleFiltroChange("almacenes", catalogos.almacenes || [], "codigo")}
              input={<OutlinedInput label="Almacén" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.almacenes.length === (catalogos.almacenes || []).length && (catalogos.almacenes || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.almacenes || []).map((almacen) => (
                <MenuItem key={almacen.codigo} value={almacen.codigo}>
                  <Checkbox checked={filtros.almacenes.includes(almacen.codigo)} size="small" />
                  <ListItemText primary={`${almacen.codigo} - ${almacen.nombre}`} primaryTypographyProps={{ fontSize: "0.75rem" }} />
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
              onChange={handleFiltroChange("sectores", catalogos.sectores || [], "nombre")}
              input={<OutlinedInput label="Sector" />}
              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(", ")}
              MenuProps={MenuProps}
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="__todos__">
                <Checkbox checked={filtros.sectores.length === (catalogos.sectores || []).length && (catalogos.sectores || []).length > 0} size="small" />
                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: "0.75rem", fontWeight: 600 }} />
              </MenuItem>
              {(catalogos.sectores || []).map((sector) => (
                <MenuItem key={sector.nombre} value={sector.nombre}>
                  <Checkbox checked={filtros.sectores.includes(sector.nombre)} size="small" />
                  <ListItemText primary={sector.nombre} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Estado */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="estado-label" sx={{ fontSize: "0.75rem" }}>Estado</InputLabel>
            <Select
              labelId="estado-label"
              multiple
              value={filtros.estados}
              onChange={handleFiltroChange("estados", ESTADOS_OPTIONS, "value")}
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
                <MenuItem key={estado.value} value={estado.value}>
                  <Checkbox checked={filtros.estados.includes(estado.value)} size="small" />
                  <ListItemText primary={estado.label} primaryTypographyProps={{ fontSize: "0.75rem" }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Búsqueda */}
          <TextField
            size="small"
            label="Buscar"
            placeholder="Código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 140, "& .MuiInputLabel-root": { fontSize: "0.75rem" } }}
          />

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

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      <Paper elevation={0} sx={{ height: 600, border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={filteredAlertas}
          columns={columns}
          getRowId={(row) => row.codigo}
          loading={loading}
          pageSizeOptions={[20, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          disableRowSelectionOnClick
          rowHeight={52}
          localeText={{
            MuiTablePagination: {
              labelRowsPerPage: "Filas por página:",
            },
            noRowsLabel: "No hay alertas para mostrar",
          }}
          slots={{
            loadingOverlay: () => (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <CircularProgress />
              </Box>
            ),
          }}
          sx={{
            border: "none",
            borderRadius: 2,
            backgroundColor: "#ffffff",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#ffffff !important",
              color: "#1f1f20 !important",
              borderBottom: "2px solid #dce0e6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#ffffff !important",
              color: "#1f1f20 !important",
              borderRight: "1px solid #dce0e6 !important",
              "&:last-of-type": {
                borderRight: "none !important",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 600,
              color: "#1f1f20 !important",
              fontSize: "0.8rem",
            },
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-sortIcon": {
              color: "#606d80 !important",
              opacity: "1 !important",
            },
            "& .MuiDataGrid-menuIconButton": {
              color: "#606d80 !important",
            },
            "& .MuiDataGrid-iconButtonContainer": {
              visibility: "visible !important",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid #dce0e6 !important",
              borderRight: "1px solid #dce0e6 !important",
              color: "#1f1f20",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              "&:last-of-type": {
                borderRight: "none !important",
              },
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f0f2f5",
            },
            "& .MuiDataGrid-row.Mui-selected": {
              backgroundColor: "#e8eef5",
              "&:hover": {
                backgroundColor: "#e8eef5",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid #dce0e6",
              backgroundColor: "#f5f7fa",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          }}
        />
      </Paper>
    </Container>
  );
}
