import React, { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { ModernDataTable as DataTable } from "../components/features/DataTable";
import { TableSkeleton } from "../components/ui/Skeleton";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { planner, solicitudes } from "../services/spm";
import api from "../services/api";
import { cachedGet, invalidateCache } from "../services/cachedApi";
import { formatCurrency } from "../utils/formatters";
import {
  Plus,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "../components/ui/Icons";
import { useI18n } from "../context/i18n";
import { toNumber } from "../utils/formatters";
import clsx from "clsx";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { getTableColumns } from "./DashboardShared";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Button } from "../components/ui/Button";
import { WeeklyRequestsKpiCard } from "../components/dashboard/WeeklyRequestsKpiCard";
import Slider from '@mui/material/Slider';
// Componentes Canvas (más ligeros que MUI X Charts)
import { CanvasDonutChart } from '../components/canvas/CanvasDonutChart';
import { CanvasGauge } from '../components/canvas/CanvasGauge';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';

// MenuProps para los multiselect
const ITEM_HEIGHT = 32;
const ITEM_PADDING_TOP = 4;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 160,
    },
  },
};

// ============================================================================
// KPI CHART COMPONENTS
// ============================================================================

// Componente Donut Chart con Canvas - mucho más ligero que MUI X Charts
function DonutChartComponent({ data, colors, labels }) {
  const total = data.reduce((sum, val) => sum + val, 0) || 0;

  return (
    <div className="flex items-center gap-4 w-full h-full">
      {/* Leyendas a la izquierda */}
      <div className="flex flex-col gap-1.5">
        {labels.map((label, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[idx] }}
            />
            <span className="text-[11px] text-slate-600">{label}</span>
            <span className="text-[11px] font-semibold text-slate-800">{data[idx]}</span>
          </div>
        ))}
      </div>
      {/* Donut a la derecha - Canvas version */}
      <div className="relative flex-shrink-0 ml-auto">
        <CanvasDonutChart
          data={data}
          colors={colors}
          labels={labels}
          width={100}
          height={100}
          innerRadius={30}
          outerRadius={45}
        />
        {/* Total en el centro */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-slate-800">{total}</span>
        </div>
      </div>
    </div>
  );
}

// Componente de círculo de progreso - tamaño ajustado para mejor proporción
function ProgressCircle({ percentage, color = "#3b82f6", size = "md" }) {
  const sizes = {
    sm: { container: "w-16 h-16", viewBox: "0 0 64 64", cx: 32, radius: 24, stroke: 6, text: "text-sm" },
    md: { container: "w-20 h-20", viewBox: "0 0 80 80", cx: 40, radius: 30, stroke: 7, text: "text-base" },
    lg: { container: "w-24 h-24", viewBox: "0 0 96 96", cx: 48, radius: 36, stroke: 8, text: "text-lg" },
  };
  const s = sizes[size] || sizes.md;
  const circumference = 2 * Math.PI * s.radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative ${s.container}`}>
      <svg viewBox={s.viewBox} className="w-full h-full -rotate-90">
        <circle cx={s.cx} cy={s.cx} r={s.radius} stroke="#e2e8f0" strokeWidth={s.stroke} fill="none" />
        <circle
          cx={s.cx}
          cy={s.cx}
          r={s.radius}
          stroke={color}
          strokeWidth={s.stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${s.text} font-bold text-slate-800 dark:text-slate-100`}>{percentage}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD ADMIN COMPONENT
// ============================================================================

export default function DashboardAdmin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Solicitudes state
  const [solicitudesCollapsed, setSolicitudesCollapsed] = useState(true); // Por defecto colapsado
  const [activeTab, setActiveTab] = useState("todas");
  const [stats, setStats] = useState({
    todas: 0,
    pendientes: 0,
    en_proceso: 0,
    completadas: 0,
    rechazadas: 0,
  });
  const [allData, setAllData] = useState({
    todas: [],
    pendientes: [],
    en_proceso: [],
    completadas: [],
    rechazadas: [],
  });
  const [loading, setLoading] = useState(true);

  // Filtros state
  // rangoFechasLocal: para UI inmediata (actualización rápida en slider label)
  // rangoFechas: debounced para filtrado real (evita 5 renders/sec)
  const [rangoFechasLocal, setRangoFechasLocal] = useState([0, 365]); // Por defecto: un año completo
  const rangoFechas = useDebouncedValue(rangoFechasLocal, 300); // Debounce 300ms para filtrado

  const [centrosSeleccionados, setCentrosSeleccionados] = useState([]);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState([]);
  const [sectoresSeleccionados, setSectoresSeleccionados] = useState([]);
  const [solicitantesSeleccionados, setSolicitantesSeleccionados] = useState([]);
  const [filtrosInicializados, setFiltrosInicializados] = useState(false);

  // Función para convertir valor del slider a fecha (formato DD/MM/AA)
  // valor 0 = hace 365 días, valor 365 = hoy
  const sliderAFecha = (valor) => {
    const diasHaciaAtras = 365 - valor;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasHaciaAtras);
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yy = String(fecha.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // Opciones de filtros (extraídas de los datos)
  const [filtrosOpciones, setFiltrosOpciones] = useState({
    centros: [],
    almacenes: [],
    sectores: [],
    solicitantes: [],
  });

  // KPI state
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    solicitudes: { total: 0, aprobadas: 0, rechazadas: 0, pendientes: 0, trend: [0,0,0,0,0,0,0], trendPercentage: 0 },
    presupuesto: { total: 0, utilizado: 0, disponible: 0, percentage: 0, porCentro: [] },
    tiempoAprobacion: { promedio: 0, meta: 3.0, trend: [0,0,0,0,0,0,0] },
    materialesMasSolicitados: [],
    gruposArticulosMasSolicitados: [],
  });

  // Cumplimiento de proveedores
  const [cumplimientoProveedores, setCumplimientoProveedores] = useState([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState([]);

  // Stock inmovilizado
  const [stockInmovilizado, setStockInmovilizado] = useState({ items: [], total: 0, valorTotal: 0, globalTotal: 0, globalValorTotal: 0 });

  // Compras evitadas detalle (para filtrado)
  const [comprasEvitadasDetalle, setComprasEvitadasDetalle] = useState([]);

  // Fetch solicitudes - con AbortController para cleanup
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true; // Flag para tracking de unmount

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch ALL solicitudes for "Todas" tab (no estado filter)
        const [todasRes, pendientesRes, enProcesoRes, completadasRes, rechazadasRes] = await Promise.all([
          solicitudes.listar({ page_size: 500, signal: abortController.signal }).catch(() => null),
          solicitudes.listar({ estado: "submitted", page_size: 500, signal: abortController.signal }).catch(() => null),
          solicitudes.listar({ estado: "processing", page_size: 500, signal: abortController.signal }).catch(() => null),
          solicitudes.listar({ estado: "approved", page_size: 500, signal: abortController.signal }).catch(() => null),
          solicitudes.listar({ estado: "rejected", page_size: 500, signal: abortController.signal }).catch(() => null),
        ]);

        // Verificar que el componente siga montado antes de updatear state
        if (!isMounted) return;

        const todasLista = (todasRes?.data?.solicitudes || todasRes?.data?.items || [])
          .sort((a, b) => new Date(b.fecha_creacion || b.created_at || 0) - new Date(a.fecha_creacion || a.created_at || 0));
        const pendientesLista = pendientesRes?.data?.solicitudes || pendientesRes?.data?.items || [];
        const enProcesoLista = enProcesoRes?.data?.solicitudes || enProcesoRes?.data?.items || [];
        const completadasLista = completadasRes?.data?.solicitudes || completadasRes?.data?.items || [];
        const rechazadasLista = rechazadasRes?.data?.solicitudes || rechazadasRes?.data?.items || [];

        setStats({
          todas: todasLista.length,
          pendientes: pendientesLista.length,
          en_proceso: enProcesoLista.length,
          completadas: completadasLista.length,
          rechazadas: rechazadasLista.length,
        });

        setAllData({
          todas: todasLista,
          pendientes: pendientesLista,
          en_proceso: enProcesoLista,
          completadas: completadasLista,
          rechazadas: rechazadasLista,
        });
      } catch (err) {
        // Ignorar AbortError y errores si componente fue unmounted
        if (!isMounted || err?.name === 'AbortError') return;
        console.error("Error fetching solicitudes:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup: abortar fetch y marcar como unmounted
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user]);

  // Fetch KPIs - con AbortController
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchKpis = async () => {
      try {
        setKpiLoading(true);
        // Usar cachedGet para deduplicación automática (evita calls duplicados simultáneos)
        const response = await cachedGet("/kpis");

        if (!isMounted) return;

        if (response.data?.ok && response.data?.data) {
          setKpiData(response.data.data);
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;
        console.error("Error fetching KPIs:", err);
      } finally {
        if (isMounted) setKpiLoading(false);
      }
    };

    fetchKpis();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Fetch cumplimiento de proveedores - con AbortController
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchCumplimiento = async () => {
      try {
        // Intentar obtener datos de cumplimiento (con deduplicación)
        const response = await cachedGet("/procurement/kpis/compliance", {
          params: { min_pedidos: 1 },
        });

        if (!isMounted) return;

        const items = response.data?.items || [];

        if (items.length > 0) {
          setCumplimientoProveedores(items);
          if (proveedoresSeleccionados.length === 0) {
            setProveedoresSeleccionados(items.map(p => p.proveedor_cuit || p.proveedor_nombre));
          }
        } else {
          // Fallback: obtener lista de proveedores externos activos
          const provResponse = await api.get("/admin/proveedores/externos", {
            signal: abortController.signal,
          });

          if (!isMounted) return;

          const proveedores = (provResponse.data?.data || provResponse.data || [])
            .filter(p => p.activo !== false && p.activo !== 0)
            .map(p => ({
              proveedor_cuit: p.cuit,
              proveedor_nombre: p.razon_social || p.nombre || p.cuit,
              total_pedidos: 0,
              entregas_a_tiempo: 0,
              pct_otif: null
            }));
          setCumplimientoProveedores(proveedores);
          if (proveedores.length > 0 && proveedoresSeleccionados.length === 0) {
            setProveedoresSeleccionados(proveedores.map(p => p.proveedor_cuit || p.proveedor_nombre));
          }
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;

        // Si hay error, intentar fallback
        try {
          const provResponse = await api.get("/admin/proveedores/externos", {
            signal: abortController.signal,
          });

          if (!isMounted) return;

          const proveedores = (provResponse.data?.data || provResponse.data || [])
            .filter(p => p.activo !== false && p.activo !== 0)
            .map(p => ({
              proveedor_cuit: p.cuit,
              proveedor_nombre: p.razon_social || p.nombre || p.cuit,
              total_pedidos: 0,
              entregas_a_tiempo: 0,
              pct_otif: null
            }));
          setCumplimientoProveedores(proveedores);
          if (proveedores.length > 0 && proveedoresSeleccionados.length === 0) {
            setProveedoresSeleccionados(proveedores.map(p => p.proveedor_cuit || p.proveedor_nombre));
          }
        } catch {
          if (isMounted) {
            setCumplimientoProveedores([]);
          }
        }
      }
    };

    fetchCumplimiento();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Fetch stock inmovilizado (inicial - datos globales) - con AbortController
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchStockInmovilizado = async () => {
      try {
        // Usar cachedGet para deduplicación
        const response = await cachedGet("/kpis/stock-inmovilizado");

        if (!isMounted) return;

        if (response.data?.ok) {
          setStockInmovilizado({
            items: response.data.items || [],
            total: response.data.total || 0,
            valorTotal: response.data.valorTotal || 0,
            globalTotal: response.data.globalTotal || response.data.total || 0,
            globalValorTotal: response.data.globalValorTotal || response.data.valorTotal || 0,
          });
        } else {
          console.error("Stock inmovilizado - respuesta no ok:", response.data);
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;
        console.error("Error fetching stock inmovilizado:", err.response?.status, err.message);
        setStockInmovilizado({ items: [], total: 0, valorTotal: 0, globalTotal: 0, globalValorTotal: 0 });
      }
    };

    fetchStockInmovilizado();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Refetch stock inmovilizado cuando cambian los filtros de Centro - con AbortController
  // Solo Centro aplica a esta card (no Sector, Solicitante ni Almacén de solicitudes)
  useEffect(() => {
    // Si no hay filtros inicializados, no hacer nada
    if (!filtrosInicializados) return;

    const abortController = new AbortController();
    let isMounted = true;

    const fetchStockFiltrado = async () => {
      try {
        // Construir params - solo centros aplican
        const params = new URLSearchParams();
        if (centrosSeleccionados.length > 0) {
          params.set("centros", centrosSeleccionados.join(","));
        }

        const url = params.toString() ? `/kpis/stock-inmovilizado?${params}` : "/kpis/stock-inmovilizado";
        const response = await api.get(url, { signal: abortController.signal });

        if (!isMounted) return;

        if (response.data?.ok) {
          setStockInmovilizado(prev => ({
            items: response.data.items || [],
            total: response.data.total || 0,
            valorTotal: response.data.valorTotal || 0,
            globalTotal: prev.globalTotal || response.data.globalTotal || 0,
            globalValorTotal: prev.globalValorTotal || response.data.globalValorTotal || 0,
          }));
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;
        console.error("Error fetching stock inmovilizado filtrado:", err.message);
      }
    };

    fetchStockFiltrado();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [centrosSeleccionados, filtrosInicializados]);

  // Fetch compras evitadas detalle - con AbortController
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchComprasEvitadas = async () => {
      try {
        // Usar cachedGet para deduplicación
        const response = await cachedGet("/kpis/compras-evitadas-detalle");

        if (!isMounted) return;

        if (response.data?.ok) {
          setComprasEvitadasDetalle(response.data.items || []);
        }
      } catch (err) {
        if (!isMounted || err?.name === 'AbortError') return;
        console.error("Error fetching compras evitadas:", err.response?.status, err.message);
        setComprasEvitadasDetalle([]);
      }
    };

    fetchComprasEvitadas();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Extraer opciones de filtros de los datos e inicializar con todos seleccionados
  useEffect(() => {
    if (allData.todas.length > 0) {
      const centros = [...new Set(allData.todas.map(s => s.centro).filter(Boolean))].sort();
      const almacenes = [...new Set(allData.todas.map(s => s.almacen_virtual).filter(Boolean))].sort();
      const sectores = [...new Set(allData.todas.map(s => s.sector_nombre || s.sector).filter(Boolean))].sort();
      const solicitantes = [...new Set(allData.todas.map(s => {
        const apellido = s.solicitante_apellido || '';
        const nombre = s.solicitante_nombre || '';
        return [apellido, nombre].filter(Boolean).join(' ').trim() || s.solicitante;
      }).filter(Boolean))].sort();

      setFiltrosOpciones({
        centros,
        almacenes,
        sectores,
        solicitantes,
      });

      // Inicializar filtros con todos seleccionados (solo la primera vez)
      if (!filtrosInicializados) {
        setCentrosSeleccionados(centros);
        setAlmacenesSeleccionados(almacenes);
        setSectoresSeleccionados(sectores);
        setSolicitantesSeleccionados(solicitantes);
        setFiltrosInicializados(true);
      }
    }
  }, [allData.todas, filtrosInicializados]);

  // Función para convertir valor del slider a fecha Date
  const sliderAFechaDate = (valor) => {
    const diasHaciaAtras = 365 - valor;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasHaciaAtras);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  };

  // Crear índices de filtrado O(1) para búsqueda rápida
  const filterIndices = useMemo(() => ({
    centros: new Set(centrosSeleccionados),
    almacenes: new Set(almacenesSeleccionados),
    sectores: new Set(sectoresSeleccionados),
    solicitantes: new Set(solicitantesSeleccionados),
    fechaDesde: sliderAFechaDate(rangoFechas[0]),
    fechaHasta: (() => {
      const d = sliderAFechaDate(rangoFechas[1]);
      d.setHours(23, 59, 59, 999);
      return d;
    })(),
  }), [rangoFechas, centrosSeleccionados, almacenesSeleccionados, sectoresSeleccionados, solicitantesSeleccionados]);

  // Datos filtrados - UNA SOLA PASADA O(n) en lugar de 4-5 pasadas O(n²)
  const datosFiltrados = useMemo(() => {
    // Si no hay ningún filtro seleccionado, no mostrar datos
    const hayFiltrosSeleccionados = centrosSeleccionados.length > 0 ||
                                     almacenesSeleccionados.length > 0 ||
                                     sectoresSeleccionados.length > 0 ||
                                     solicitantesSeleccionados.length > 0;

    if (!hayFiltrosSeleccionados) {
      return [];
    }

    // UNA SOLA PASADA: todas las condiciones en un solo filter()
    return allData.todas.filter(s => {
      // Filtro por rango de fechas
      const fechaCreacion = new Date(s.created_at || s.fecha_creacion);
      if (fechaCreacion < filterIndices.fechaDesde || fechaCreacion > filterIndices.fechaHasta) {
        return false;
      }

      // Filtro por centros - O(1) con Set.has()
      if (filterIndices.centros.size > 0 && !filterIndices.centros.has(s.centro)) {
        return false;
      }

      // Filtro por almacenes - O(1) con Set.has()
      if (filterIndices.almacenes.size > 0 && !filterIndices.almacenes.has(s.almacen_virtual)) {
        return false;
      }

      // Filtro por sectores - O(1) con Set.has()
      if (filterIndices.sectores.size > 0) {
        const sectorSolicitud = s.sector_nombre || s.sector;
        if (!filterIndices.sectores.has(sectorSolicitud)) {
          return false;
        }
      }

      // Filtro por solicitantes - O(1) con Set.has()
      if (filterIndices.solicitantes.size > 0) {
        const apellido = s.solicitante_apellido || '';
        const nombre = s.solicitante_nombre || '';
        const solicitanteCompleto = [apellido, nombre]
          .filter(Boolean)
          .join(' ')
          .trim() || s.solicitante;
        if (!filterIndices.solicitantes.has(solicitanteCompleto)) {
          return false;
        }
      }

      return true;
    });
  }, [allData.todas, filterIndices]);

  // Stock inmovilizado - los datos ya vienen filtrados del endpoint
  // Solo el filtro Centro aplica. Sector, Solicitante y Almacén NO aplican a esta card.
  const stockInmovilizadoFiltrado = useMemo(() => {
    return {
      items: stockInmovilizado.items.slice(0, 10),
      total: stockInmovilizado.total,
      valorTotal: stockInmovilizado.valorTotal,
      globalTotal: stockInmovilizado.globalTotal || 0,
      globalValorTotal: stockInmovilizado.globalValorTotal || 0,
      hayDatos: stockInmovilizado.items.length > 0,
    };
  }, [stockInmovilizado]);

  // Estadísticas filtradas
  const statsFiltrados = useMemo(() => {
    const todas = datosFiltrados.length;
    const pendientes = datosFiltrados.filter(s => {
      const estado = (s.estado || s.status || '').toLowerCase();
      return estado === 'enviada' || estado === 'submitted' || estado === 'pendiente';
    }).length;
    const en_proceso = datosFiltrados.filter(s => {
      const estado = (s.estado || s.status || '').toLowerCase();
      return estado.includes('progreso') || estado === 'processing' || estado === 'in_progress';
    }).length;
    const completadas = datosFiltrados.filter(s => {
      const estado = (s.estado || s.status || '').toLowerCase();
      return estado.includes('aprobada') || estado === 'approved';
    }).length;
    const rechazadas = datosFiltrados.filter(s => {
      const estado = (s.estado || s.status || '').toLowerCase();
      return estado.includes('rechazada') || estado === 'rejected';
    }).length;
    return { todas, pendientes, en_proceso, completadas, rechazadas };
  }, [datosFiltrados]);

  const columns = useMemo(() => getTableColumns(t), [t]);

  // Tabs configuration
  const tabs = [
    { key: "todas", label: t("dash_todas", "Todas"), count: stats.todas },
    { key: "pendientes", label: t("dash_pendientes", "Pendientes"), count: stats.pendientes },
    { key: "en_proceso", label: t("dash_en_proceso", "En Proceso"), count: stats.en_proceso },
    { key: "completadas", label: t("dash_completadas", "Completadas"), count: stats.completadas },
    { key: "rechazadas", label: t("dash_rechazadas", "Rechazadas"), count: stats.rechazadas },
    { key: "crear", label: t("btn_crear_solicitud", "+ Crear Solicitud"), isAction: true },
  ];

  const currentData = allData[activeTab] || [];

  const handleTabChange = (value) => {
    if (value === "crear") {
      navigate("/solicitudes/nueva");
    } else {
      setActiveTab(value);
    }
  };

  const getTableTitle = () => {
    switch (activeTab) {
      case "todas":
        return t("dash_all_requests", "Todas las Solicitudes");
      case "pendientes":
        return t("dash_pending_review", "Solicitudes Pendientes de Revisión");
      case "en_proceso":
        return t("dash_in_progress", "Solicitudes En Proceso");
      case "completadas":
        return t("dash_completed", "Solicitudes Completadas");
      case "rechazadas":
        return t("dash_rejected", "Solicitudes Rechazadas");
      default:
        return t("dash_solicitudes", "Solicitudes");
    }
  };

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* SOLICITUDES SECTION - Contenedor colapsable */}
      {/* ================================================================== */}
      <Card className="overflow-hidden">
        {/* Header con botón de colapsar/expandir y crear solicitud */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSolicitudesCollapsed(!solicitudesCollapsed)}
            className="flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-md px-2 py-1 -ml-2 z-10"
          >
            {solicitudesCollapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Solicitudes
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              ({stats.todas} total)
            </span>
          </button>
                  </div>

        {/* Contenido colapsable */}
        <div
          className={clsx(
            "transition-all duration-300 ease-in-out origin-top-left",
            solicitudesCollapsed ? "max-h-0 opacity-0 scale-y-0" : "max-h-[2000px] opacity-100 scale-y-100"
          )}
        >
          <CardContent className="p-0">
            {/* Header con tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      sx={tab.isAction ? { color: '#2196f3', fontWeight: 600 } : undefined}
                    >
                      {tab.isAction ? tab.label : `${tab.label} (${tab.count})`}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Tabla */}
            <div className="p-4">
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : currentData.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-60" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {activeTab === "pendientes"
                      ? t("dash_no_pending", "No hay solicitudes pendientes de revisión")
                      : t("dash_no_requests_category", "No hay solicitudes en esta categoría")}
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  rows={currentData}
                  emptyMessage={t("dash_no_requests", "No hay solicitudes")}
                  onRowClick={(row) => navigate(`/solicitudes/${row.id}`)}
                />
              )}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* ================================================================== */}
      {/* FILTROS SECTION */}
      {/* ================================================================== */}
      <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30">
        <CardContent className="py-2 px-6" style={{ height: '73px', maxWidth: '1850px' }}>
          <div className="flex items-center gap-6 h-full">
            {/* Slider de rango de fechas - con debounce */}
            <div className="flex flex-col gap-0 min-w-[320px] ml-[180px]">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
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
                getAriaLabel={() => 'Rango de fechas'}
                sx={{
                  color: '#2196f3',
                  '& .MuiSlider-thumb': {
                    width: 14,
                    height: 14,
                  },
                  '& .MuiSlider-valueLabel': {
                    fontSize: 10,
                  },
                }}
              />
              <div className="flex justify-between text-[10px] text-slate-400 -mt-1">
                <span>Hace 1 año</span>
                <span>Hoy</span>
              </div>
            </div>

            {/* Separador vertical */}
            <div className="h-16 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Centro Multiselect */}
            <FormControl size="small" sx={{ minWidth: 160, ml: '40px' }}>
              <InputLabel id="centro-label" sx={{ fontSize: '0.75rem' }}>Centro</InputLabel>
              <Select
                labelId="centro-label"
                multiple
                value={centrosSeleccionados}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes('__todos__')) {
                    if (centrosSeleccionados.length === filtrosOpciones.centros.length) {
                      setCentrosSeleccionados([]);
                    } else {
                      setCentrosSeleccionados([...filtrosOpciones.centros]);
                    }
                  } else {
                    setCentrosSeleccionados(typeof value === 'string' ? value.split(',') : value);
                  }
                }}
                input={<OutlinedInput label="Centro" />}
                renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(', ')}
                MenuProps={MenuProps}
                sx={{ fontSize: '0.75rem' }}
              >
                <MenuItem value="__todos__">
                  <Checkbox checked={centrosSeleccionados.length === filtrosOpciones.centros.length && filtrosOpciones.centros.length > 0} size="small" />
                  <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
                </MenuItem>
                {filtrosOpciones.centros.map((centro) => (
                  <MenuItem key={centro} value={centro}>
                    <Checkbox checked={centrosSeleccionados.includes(centro)} size="small" />
                    <ListItemText primary={centro} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Almacén Multiselect */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="almacen-label" sx={{ fontSize: '0.75rem' }}>Almacén</InputLabel>
              <Select
                labelId="almacen-label"
                multiple
                value={almacenesSeleccionados}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes('__todos__')) {
                    if (almacenesSeleccionados.length === filtrosOpciones.almacenes.length) {
                      setAlmacenesSeleccionados([]);
                    } else {
                      setAlmacenesSeleccionados([...filtrosOpciones.almacenes]);
                    }
                  } else {
                    setAlmacenesSeleccionados(typeof value === 'string' ? value.split(',') : value);
                  }
                }}
                input={<OutlinedInput label="Almacén" />}
                renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(', ')}
                MenuProps={MenuProps}
                sx={{ fontSize: '0.75rem' }}
              >
                <MenuItem value="__todos__">
                  <Checkbox checked={almacenesSeleccionados.length === filtrosOpciones.almacenes.length && filtrosOpciones.almacenes.length > 0} size="small" />
                  <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
                </MenuItem>
                {filtrosOpciones.almacenes.map((almacen) => (
                  <MenuItem key={almacen} value={almacen}>
                    <Checkbox checked={almacenesSeleccionados.includes(almacen)} size="small" />
                    <ListItemText primary={almacen} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sector Multiselect */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="sector-label" sx={{ fontSize: '0.75rem' }}>Sector</InputLabel>
              <Select
                labelId="sector-label"
                multiple
                value={sectoresSeleccionados}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes('__todos__')) {
                    if (sectoresSeleccionados.length === filtrosOpciones.sectores.length) {
                      setSectoresSeleccionados([]);
                    } else {
                      setSectoresSeleccionados([...filtrosOpciones.sectores]);
                    }
                  } else {
                    setSectoresSeleccionados(typeof value === 'string' ? value.split(',') : value);
                  }
                }}
                input={<OutlinedInput label="Sector" />}
                renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(', ')}
                MenuProps={MenuProps}
                sx={{ fontSize: '0.75rem' }}
              >
                <MenuItem value="__todos__">
                  <Checkbox checked={sectoresSeleccionados.length === filtrosOpciones.sectores.length && filtrosOpciones.sectores.length > 0} size="small" />
                  <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
                </MenuItem>
                {filtrosOpciones.sectores.map((sector) => (
                  <MenuItem key={sector} value={sector}>
                    <Checkbox checked={sectoresSeleccionados.includes(sector)} size="small" />
                    <ListItemText primary={sector} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Solicitante Multiselect */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="solicitante-label" sx={{ fontSize: '0.75rem' }}>Solicitante</InputLabel>
              <Select
                labelId="solicitante-label"
                multiple
                value={solicitantesSeleccionados}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.includes('__todos__')) {
                    if (solicitantesSeleccionados.length === filtrosOpciones.solicitantes.length) {
                      setSolicitantesSeleccionados([]);
                    } else {
                      setSolicitantesSeleccionados([...filtrosOpciones.solicitantes]);
                    }
                  } else {
                    setSolicitantesSeleccionados(typeof value === 'string' ? value.split(',') : value);
                  }
                }}
                input={<OutlinedInput label="Solicitante" />}
                renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected.join(', ')}
                MenuProps={MenuProps}
                sx={{ fontSize: '0.75rem' }}
              >
                <MenuItem value="__todos__">
                  <Checkbox checked={solicitantesSeleccionados.length === filtrosOpciones.solicitantes.length && filtrosOpciones.solicitantes.length > 0} size="small" />
                  <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
                </MenuItem>
                {filtrosOpciones.solicitantes.map((solicitante) => (
                  <MenuItem key={solicitante} value={solicitante}>
                    <Checkbox checked={solicitantesSeleccionados.includes(solicitante)} size="small" />
                    <ListItemText primary={solicitante} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Botón limpiar filtros (deseleccionar todos) */}
            <button
              type="button"
              onClick={() => {
                setRangoFechasLocal([0, 365]); // Un año completo
                setCentrosSeleccionados([]);
                setAlmacenesSeleccionados([]);
                setSectoresSeleccionados([]);
                setSolicitantesSeleccionados([]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-600 rounded-md hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* KPI SECTION */}
      {/* ================================================================== */}

      {kpiLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Grid principal - 4 columnas consistentes */}
          {/* Fila superior: Solicitudes Creadas + Cumplimiento Proveedores */}
          <ScrollReveal delay={100}>
            <div className="flex gap-4 flex-wrap">
              {/* Solicitudes Creadas - Sparkline */}
              {(() => {
                const fechaDesde = sliderAFechaDate(rangoFechas[0]);
                const fechaHasta = sliderAFechaDate(rangoFechas[1]);
                fechaHasta.setHours(23, 59, 59, 999);

                const diasTotales = Math.max(1, Math.ceil((fechaHasta - fechaDesde) / (1000 * 60 * 60 * 24)));
                const segmentos = 7;
                const diasPorSegmento = Math.max(1, Math.ceil(diasTotales / segmentos));

                const datosSparkline = [];
                const labelsSparkline = [];

                const formatFecha = (date) => {
                  const dd = String(date.getDate()).padStart(2, '0');
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const yy = String(date.getFullYear()).slice(-2);
                  return `${dd}/${mm}/${yy}`;
                };

                for (let i = 0; i < segmentos; i++) {
                  const inicioSegmento = new Date(fechaDesde);
                  inicioSegmento.setDate(fechaDesde.getDate() + (i * diasPorSegmento));

                  const finSegmento = new Date(inicioSegmento);
                  finSegmento.setDate(inicioSegmento.getDate() + diasPorSegmento - 1);
                  finSegmento.setHours(23, 59, 59, 999);

                  const finReal = finSegmento > fechaHasta ? fechaHasta : finSegmento;

                  const count = datosFiltrados.filter(s => {
                    const fechaCreacion = new Date(s.created_at || s.fecha_creacion);
                    return fechaCreacion >= inicioSegmento && fechaCreacion <= finReal;
                  }).length;

                  datosSparkline.push(count);
                  labelsSparkline.push(formatFecha(inicioSegmento));
                }

                return (
                  <div style={{ width: '475px', height: '165px' }}>
                    <WeeklyRequestsKpiCard
                      data={datosSparkline}
                      labels={labelsSparkline}
                      previousWeekTotal={null}
                      trendPercentage={null}
                      compact={false}
                    />
                  </div>
                );
              })()}

              {/* Cumplimiento de Proveedores - Diseño original */}
              {(() => {
                const totalPedidos = cumplimientoProveedores.reduce((sum, p) => sum + (p.total_pedidos || 0), 0);
                const entregasATiempo = cumplimientoProveedores.reduce((sum, p) => sum + (p.entregas_a_tiempo || 0), 0);
                const pctCumplimiento = totalPedidos > 0 ? Math.round((entregasATiempo / totalPedidos) * 100) : 0;

                // Filtrar proveedores seleccionados
                const proveedoresFiltrados = cumplimientoProveedores.filter(p =>
                  proveedoresSeleccionados.includes(p.proveedor_cuit || p.proveedor_nombre)
                );

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ width: '475px', height: '165px' }}>
                    <CardContent className="p-4">
                      <div className="flex gap-6 h-full">
                        {/* Lado izquierdo - KPI */}
                        <div className="flex-shrink-0">
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Cumplimiento Proveedores
                            </p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                              {totalPedidos > 0 ? `${pctCumplimiento}%` : 'N/A'}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {totalPedidos > 0 ? `${entregasATiempo}/${totalPedidos} a tiempo` : `${cumplimientoProveedores.length} proveedores`}
                          </p>
                        </div>

                        {/* Separador */}
                        <div className="w-px bg-slate-200 dark:bg-slate-600 self-stretch" />

                        {/* Lado derecho - Selector y datos */}
                        <div className="flex-1">
                          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                            <InputLabel id="proveedores-label" sx={{ fontSize: '0.75rem' }}>Proveedores</InputLabel>
                            <Select
                              labelId="proveedores-label"
                              multiple
                              value={proveedoresSeleccionados}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value.includes('__todos__')) {
                                  const todosIds = cumplimientoProveedores.map(p => p.proveedor_cuit || p.proveedor_nombre);
                                  if (proveedoresSeleccionados.length === todosIds.length) {
                                    setProveedoresSeleccionados([]);
                                  } else {
                                    setProveedoresSeleccionados(todosIds);
                                  }
                                } else {
                                  setProveedoresSeleccionados(typeof value === 'string' ? value.split(',') : value);
                                }
                              }}
                              input={<OutlinedInput label="Proveedores" />}
                              renderValue={(selected) => selected.length > 1 ? `${selected.length} seleccionados` : selected[0] || ''}
                              MenuProps={MenuProps}
                              sx={{ fontSize: '0.75rem' }}
                            >
                              <MenuItem value="__todos__">
                                <Checkbox checked={proveedoresSeleccionados.length === cumplimientoProveedores.length && cumplimientoProveedores.length > 0} size="small" />
                                <ListItemText primary="Seleccionar todos" primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 600 }} />
                              </MenuItem>
                              {cumplimientoProveedores.map((p) => (
                                <MenuItem key={p.proveedor_cuit || p.proveedor_nombre} value={p.proveedor_cuit || p.proveedor_nombre}>
                                  <Checkbox checked={proveedoresSeleccionados.includes(p.proveedor_cuit || p.proveedor_nombre)} size="small" />
                                  <ListItemText primary={p.proveedor_nombre || 'Proveedor'} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {proveedoresFiltrados.length > 0 ? (
                            <div className="space-y-1 max-h-[80px] overflow-auto">
                              {proveedoresFiltrados.slice(0, 5).map((p, idx) => {
                                const pct = p.pct_otif !== null && p.pct_otif !== undefined
                                  ? Math.round(p.pct_otif)
                                  : p.total_pedidos > 0
                                    ? Math.round((p.entregas_a_tiempo / p.total_pedidos) * 100)
                                    : null;
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 truncate flex-1">{p.proveedor_nombre || 'Proveedor'}</span>
                                    {pct !== null ? (
                                      <span className={`font-semibold ml-2 ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {pct}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 ml-2 text-[10px]">Sin datos</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-2">No hay datos de proveedores disponibles</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Tiempo Promedio de Aprobación */}
              {(() => {
                // Calcular tiempo promedio de aprobación desde datos filtrados
                const solicitudesAprobadas = datosFiltrados.filter(s => {
                  const estado = (s.estado || s.status || '').toLowerCase();
                  return estado.includes('aprobada') || estado === 'approved';
                });

                let tiempoAprobacion = 0;
                let tiempoMin = 0;
                let tiempoMax = 0;
                if (solicitudesAprobadas.length > 0) {
                  const tiempos = solicitudesAprobadas.map(s => {
                    const fechaCreacion = new Date(s.created_at || s.fecha_creacion);
                    const fechaAprobacion = new Date(s.fecha_aprobacion || s.updated_at || s.fecha_actualizacion || fechaCreacion);
                    const diffMs = fechaAprobacion - fechaCreacion;
                    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))); // días
                  });
                  tiempoAprobacion = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
                  tiempoMin = Math.min(...tiempos);
                  tiempoMax = Math.max(...tiempos);
                }

                const metaTiempo = 3; // Meta en días
                const cumpleMeta = tiempoAprobacion <= metaTiempo;

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ width: '395px', height: '165px' }}>
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Tiempo Promedio de Aprobación
                        </p>
                      </div>

                      {/* KPI Principal */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-bold ${cumpleMeta ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {solicitudesAprobadas.length > 0 ? tiempoAprobacion : '-'}
                            </span>
                            <span className="text-lg text-slate-500">días</span>
                          </div>
                          {solicitudesAprobadas.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              Rango: {tiempoMin}d - {tiempoMax}d · {solicitudesAprobadas.length} solicitudes
                            </p>
                          )}
                        </div>

                        {/* Indicador de meta */}
                        <div className="flex flex-col items-center">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${cumpleMeta ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {cumpleMeta ? (
                              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            ) : (
                              <Clock className="w-8 h-8 text-amber-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Meta: {metaTiempo}d</p>
                        </div>
                      </div>

                      {/* Barra de progreso vs meta */}
                      {solicitudesAprobadas.length > 0 && (
                        <div className="mt-3">
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${cumpleMeta ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, (tiempoAprobacion / (metaTiempo * 2)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Compras Evitadas */}
              {(() => {
                // Filtrar compras evitadas según filtros seleccionados
                const fechaDesde = sliderAFechaDate(rangoFechas[0]);
                const fechaHasta = sliderAFechaDate(rangoFechas[1]);
                fechaHasta.setHours(23, 59, 59, 999);

                // Siempre filtrar por los criterios seleccionados
                const comprasFiltradas = comprasEvitadasDetalle.filter(item => {
                  // Filtro por fecha
                  if (item.fecha) {
                    const fechaItem = new Date(item.fecha);
                    if (fechaItem < fechaDesde || fechaItem > fechaHasta) return false;
                  }

                  // Filtro por centro - siempre aplicar si hay centros seleccionados
                  if (centrosSeleccionados.length > 0) {
                    if (!centrosSeleccionados.includes(item.centro)) return false;
                  } else {
                    // Si no hay centros seleccionados, no mostrar nada
                    return false;
                  }

                  // Filtro por sector - siempre aplicar si hay sectores seleccionados
                  if (sectoresSeleccionados.length > 0) {
                    if (!sectoresSeleccionados.includes(item.sector)) return false;
                  } else {
                    // Si no hay sectores seleccionados, no mostrar nada
                    return false;
                  }

                  return true;
                });

                const itemsMostrar = comprasFiltradas.length;
                const valorMostrar = comprasFiltradas.reduce((sum, item) => sum + (item.valor || 0), 0);

                // Verificar si hay filtros activos
                const todosLosCentros = centrosSeleccionados.length === filtrosOpciones.centros.length;
                const todosLosSectores = sectoresSeleccionados.length === filtrosOpciones.sectores.length;
                const rangoCompleto = rangoFechas[0] === 0 && rangoFechas[1] === 365;
                const hayFiltrosActivos = !todosLosCentros || !todosLosSectores || !rangoCompleto;

                // Formatear monto como KUSD o MUSD
                const formatMontoResumido = (val) => {
                  if (val >= 1000000) return `MUSD ${(val / 1000000).toFixed(2).replace('.', ',')}`;
                  if (val >= 1000) return `KUSD ${(val / 1000).toFixed(2).replace('.', ',')}`;
                  return `USD ${val.toFixed(2).replace('.', ',')}`;
                };

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ flex: 1, minWidth: '200px', height: '165px' }}>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          Compras Evitadas
                          {hayFiltrosActivos && <span className="text-[9px] text-blue-500">(filtrado)</span>}
                        </p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatMontoResumido(valorMostrar)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {itemsMostrar} ítems abastecidos internamente
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {comprasEvitadasDetalle.length === 0
                          ? 'Sin datos de abastecimiento interno'
                          : 'Ahorro por uso de stock y transferencias'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </ScrollReveal>

          {/* Fila: Donuts + otras cards */}
          <ScrollReveal delay={200}>
            <div className="flex flex-wrap" style={{ gap: '13px' }}>

              {/* Distribución de Estados */}
              {(() => {
                const estados = {
                  borrador: 0,
                  enviadas: 0,
                  aprobadas: 0,
                  enProceso: 0,
                  rechazadas: 0,
                  cerradas: 0
                };

                datosFiltrados.forEach(s => {
                  const estado = (s.estado || s.status || '').toLowerCase();
                  if (estado.includes('draft') || estado.includes('borrador')) {
                    estados.borrador++;
                  } else if (estado.includes('submitted') || estado.includes('enviada') || estado.includes('pendiente')) {
                    estados.enviadas++;
                  } else if (estado.includes('approved') || estado.includes('aprobada')) {
                    estados.aprobadas++;
                  } else if (estado.includes('processing') || estado.includes('proceso')) {
                    estados.enProceso++;
                  } else if (estado.includes('rejected') || estado.includes('rechazada')) {
                    estados.rechazadas++;
                  } else if (estado.includes('closed') || estado.includes('cerrada') || estado.includes('dispatched')) {
                    estados.cerradas++;
                  }
                });

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ width: '280px', height: '191px' }}>
                    <CardHeader className="px-4 pt-3 pb-1">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribución de Estados</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 flex items-center">
                      <DonutChartComponent
                        data={[estados.borrador, estados.enviadas, estados.aprobadas, estados.enProceso, estados.rechazadas, estados.cerradas]}
                        colors={["#94a3b8", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"]}
                        labels={["Borrador", "Enviadas", "Aprobadas", "En Proceso", "Rechazadas", "Cerradas"]}
                      />
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Solicitudes Abiertas por Criticidad */}
              {(() => {
                const solicitudesAbiertas = datosFiltrados.filter(s => {
                  const estado = (s.estado || s.status || '').toLowerCase();
                  const esAbierta = estado.includes('proceso') || estado.includes('enviada') || estado.includes('pendiente') || estado === 'en progreso' || estado === 'submitted' || estado === 'processing';
                  const noBorrador = !estado.includes('borrador') && !estado.includes('draft');
                  return esAbierta && noBorrador;
                });

                const criticidades = { Alta: 0, Media: 0, Normal: 0, Baja: 0 };
                solicitudesAbiertas.forEach(s => {
                  const crit = s.criticidad || 'Normal';
                  if (criticidades.hasOwnProperty(crit)) {
                    criticidades[crit]++;
                  } else {
                    criticidades['Normal']++;
                  }
                });

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ width: '280px', height: '191px' }}>
                    <CardHeader className="px-4 pt-3 pb-1">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitudes Abiertas</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 flex items-center">
                      <DonutChartComponent
                        data={[criticidades.Alta, criticidades.Media, criticidades.Normal, criticidades.Baja]}
                        colors={["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]}
                        labels={["Alta", "Media", "Normal", "Baja"]}
                      />
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Presupuesto - Filtrable por Centro/Sector */}
              {(() => {
                // Filtrar topCentros y topSectores según selección
                const topCentros = (kpiData.presupuesto.topCentros || []);
                const topSectores = (kpiData.presupuesto.topSectores || []);

                // Filtrar centros seleccionados
                const centrosFiltrados = centrosSeleccionados.length > 0
                  ? topCentros.filter(c => centrosSeleccionados.includes(c.nombre))
                  : topCentros;

                // Filtrar sectores seleccionados
                const sectoresFiltrados = sectoresSeleccionados.length > 0
                  ? topSectores.filter(s => sectoresSeleccionados.includes(s.nombre))
                  : topSectores;

                // Calcular presupuesto filtrado desde topCentros si hay filtros
                let presupuestoFiltrado = {
                  total: kpiData.presupuesto.total,
                  utilizado: kpiData.presupuesto.utilizado,
                  disponible: kpiData.presupuesto.disponible,
                  percentage: kpiData.presupuesto.percentage,
                };

                // Si hay centros seleccionados Y tenemos datos de esos centros, recalcular
                if (centrosSeleccionados.length > 0 && centrosFiltrados.length > 0) {
                  const utilizadoFiltrado = centrosFiltrados.reduce((sum, c) => sum + (c.utilizado || 0), 0);
                  const totalFiltrado = centrosFiltrados.reduce((sum, c) => sum + (c.monto || 0), 0);
                  presupuestoFiltrado = {
                    total: totalFiltrado,
                    utilizado: utilizadoFiltrado,
                    disponible: totalFiltrado - utilizadoFiltrado,
                    percentage: totalFiltrado > 0 ? Math.round((utilizadoFiltrado / totalFiltrado) * 100) : 0,
                  };
                }

                const hayFiltrosActivos = centrosSeleccionados.length > 0 && centrosSeleccionados.length < filtrosOpciones.centros.length;
                const mostrandoGlobal = !hayFiltrosActivos || centrosFiltrados.length === 0;

                return (
                  <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30" style={{ width: '590px', height: '191px', marginLeft: 'auto' }}>
                    <CardHeader className="px-4 pt-3 pb-1">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        Presupuesto {mostrandoGlobal ? 'Global' : 'Filtrado'}
                        {!mostrandoGlobal && (
                          <span className="text-[9px] font-normal text-blue-500">({centrosFiltrados.length} centros)</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="flex items-center gap-6">
                        {/* Medidores con Gauge MUI */}
                        <div className="flex gap-2">
                          <div className="flex flex-col items-center" style={{ width: '70px' }}>
                            <CanvasGauge
                              value={100}
                              valueMax={100}
                              width={70}
                              height={70}
                              color="#3b82f6"
                              text="100%"
                            />
                            <p className="text-[9px] text-slate-500 -mt-2 text-center">Total</p>
                            <p className="text-[10px] font-bold text-slate-700 text-center">MUSD {(presupuestoFiltrado.total / 1000000).toFixed(2).replace('.', ',')}</p>
                          </div>
                          <div className="flex flex-col items-center" style={{ width: '70px' }}>
                            <CanvasGauge
                              value={presupuestoFiltrado.percentage}
                              valueMax={100}
                              width={70}
                              height={70}
                              color="#f59e0b"
                              text={`${Math.round(presupuestoFiltrado.percentage)}%`}
                            />
                            <p className="text-[9px] text-slate-500 -mt-2 text-center">Utilizado</p>
                            <p className="text-[10px] font-bold text-amber-600 text-center">MUSD {(presupuestoFiltrado.utilizado / 1000000).toFixed(2).replace('.', ',')}</p>
                          </div>
                          <div className="flex flex-col items-center" style={{ width: '70px' }}>
                            <CanvasGauge
                              value={100 - presupuestoFiltrado.percentage}
                              valueMax={100}
                              width={70}
                              height={70}
                              color="#10b981"
                              text={`${Math.round(100 - presupuestoFiltrado.percentage)}%`}
                            />
                            <p className="text-[9px] text-slate-500 -mt-2 text-center">Disponible</p>
                            <p className="text-[10px] font-bold text-emerald-600 text-center">MUSD {(presupuestoFiltrado.disponible / 1000000).toFixed(2).replace('.', ',')}</p>
                          </div>
                        </div>
                        {/* Separador vertical */}
                        <div className="w-px h-20 bg-slate-200 dark:bg-slate-600"></div>
                        {/* Top 3 en dos columnas */}
                        <div className="flex-1">
                          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
                            {mostrandoGlobal ? 'Consumido sobre Global' : 'Centros/Sectores Seleccionados'}
                          </p>
                          <div className="flex gap-6">
                            {/* Top Centros (filtrados o top 3) */}
                            <div className="flex-1">
                              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1 text-center">
                                {mostrandoGlobal ? 'Top Centros' : 'Centros'}
                              </p>
                              <div className="divide-y divide-slate-200">
                                {(mostrandoGlobal ? topCentros : centrosFiltrados).slice(0, 3).map((centro, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-1">
                                    <span className="text-[10px] text-slate-600 truncate flex-1">{centro.nombre}</span>
                                    <span className="text-[10px] font-semibold text-blue-600">{centro.porcentaje}%</span>
                                  </div>
                                ))}
                                {(mostrandoGlobal ? topCentros : centrosFiltrados).length === 0 && (
                                  <p className="text-[9px] text-slate-400 text-center py-1">Sin datos</p>
                                )}
                              </div>
                            </div>
                            {/* Top Sectores (filtrados o top 3) */}
                            <div className="flex-1">
                              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1 text-center">
                                {mostrandoGlobal ? 'Top Sectores' : 'Sectores'}
                              </p>
                              <div className="divide-y divide-slate-200">
                                {(mostrandoGlobal ? topSectores : sectoresFiltrados).slice(0, 3).map((sector, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-1">
                                    <span className="text-[10px] text-slate-600 truncate flex-1">{sector.nombre}</span>
                                    <span className="text-[10px] font-semibold text-emerald-600">{sector.porcentaje}%</span>
                                  </div>
                                ))}
                                {(mostrandoGlobal ? topSectores : sectoresFiltrados).length === 0 && (
                                  <p className="text-[9px] text-slate-400 text-center py-1">Sin datos</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

            </div>
          </ScrollReveal>

          {/* Fila inferior: Materiales y Stock */}
          <ScrollReveal delay={300}>
            <div className="flex flex-wrap" style={{ gap: '13px' }}>

              {/* Materiales Más Solicitados - Lista simple top 10 */}
              {(() => {
                const materialesCount = {};
                datosFiltrados.forEach(s => {
                  (s.items || []).forEach(item => {
                    // Campos correctos según estructura de BD: material, precio_usd, subtotal
                    const codigo = item.material || item.codigo || item.codigo_sap || '';
                    const nombre = item.descripcion || item.nombre || item.material_nombre || `Material ${item.material_id || codigo}`;
                    const cantidad = item.cantidad || 1;
                    const precio = item.precio_usd || item.precio_unitario || item.precio || item.precio_estimado || 0;
                    const subtotal = item.subtotal || (cantidad * precio);
                    const key = codigo || nombre;
                    if (!materialesCount[key]) {
                      materialesCount[key] = { codigo, nombre, cantidad: 0, monto: 0, precioUnitario: precio };
                    }
                    materialesCount[key].cantidad += cantidad;
                    materialesCount[key].monto += subtotal;
                    // Actualizar precio unitario si es mayor (para tener el más reciente o mayor)
                    if (precio > materialesCount[key].precioUnitario) {
                      materialesCount[key].precioUnitario = precio;
                    }
                  });
                });

                const materialesList = Object.values(materialesCount)
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .slice(0, 10);

                // Verificar si hay algún monto > 0 para decidir si mostrar la columna
                const hayMontos = materialesList.some(m => m.monto > 0);

                const formatMonto = (val) => {
                  if (val >= 1000000) return `MUSD ${(val / 1000000).toFixed(2).replace('.', ',')}`;
                  if (val >= 1000) return `KUSD ${(val / 1000).toFixed(2).replace('.', ',')}`;
                  return `USD ${val.toFixed(2).replace('.', ',')}`;
                };

                return (
                  <Card className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30">
                    <CardHeader className="px-4 pt-3 pb-2">
                      <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materiales Más Solicitados</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 ">
                      <div className="divide-y divide-slate-200">
                        {materialesList.length > 0 ? (
                          materialesList.map((material, idx) => (
                            <div key={idx} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-1 -mx-1">
                              <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{material.codigo || '-'}</span>
                              <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">
                                {material.nombre}
                              </span>
                              <span className="text-xs text-slate-600 font-semibold w-12 text-right">{material.cantidad}</span>
                              {hayMontos && (
                                <span className="text-xs text-slate-600 font-mono w-28 text-right">{formatMonto(material.monto)}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">No hay datos</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Stock Inmovilizado - Lista top 10 */}
              {(() => {
                const formatMontoStock = (val) => {
                  if (val >= 1000000) return `MUSD ${(val / 1000000).toFixed(2).replace('.', ',')}`;
                  if (val >= 1000) return `KUSD ${(val / 1000).toFixed(2).replace('.', ',')}`;
                  return `USD ${(val || 0).toFixed(2).replace('.', ',')}`;
                };

                // Verificar si hay algún monto > 0
                const hayMontosStock = stockInmovilizadoFiltrado.items.some(item => (item.valor || 0) > 0);

                // Datos globales para el tooltip
                const globalTotal = stockInmovilizadoFiltrado.globalTotal || stockInmovilizado.globalTotal || stockInmovilizado.total || 0;
                const globalValor = stockInmovilizadoFiltrado.globalValorTotal || stockInmovilizado.globalValorTotal || stockInmovilizado.valorTotal || 0;

                return (
                  <Card className="flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border-white/30 dark:border-slate-700/30">
                    <CardHeader className="px-4 pt-3 pb-2">
                      <CardTitle
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-help"
                        title={`Global: ${globalTotal.toLocaleString()} materiales · ${formatMontoStock(globalValor)}\nFiltrado por Centro (Sector y Solicitante no aplican)`}
                      >
                        Stock Inmovilizado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 ">
                      <div className="divide-y divide-slate-200">
                        {stockInmovilizadoFiltrado.items.length > 0 ? (
                          stockInmovilizadoFiltrado.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-1 -mx-1">
                              <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}.</span>
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{item.codigo || '-'}</span>
                              <span className="text-xs text-slate-700 dark:text-slate-300 flex-1">
                                {item.descripcion}
                              </span>
                              <span className="text-xs text-slate-600 font-semibold w-12 text-right">{item.stock || 0}</span>
                              {hayMontosStock && (
                                <span className="text-xs text-slate-600 font-mono w-28 text-right">{formatMontoStock(item.valor || 0)}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                            {kpiLoading ? 'Cargando...' : 'No hay stock inmovilizado disponible'}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

            </div>
          </ScrollReveal>

        </>
      )}
    </div>
  );
}
