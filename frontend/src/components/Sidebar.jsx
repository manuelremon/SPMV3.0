/**
 * Sidebar Component - Glass Morphism Style
 * Translucent navigation with blur effect
 * Mobile responsive with hamburger menu
 */

import React, { useState, memo, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import Badge from "@mui/material/Badge";
import {
  FileText,
  FilePlus2,
  CheckCircle2,
  Workflow,
  Package,
  Search,
  GitCompare,
  Users,
  User,
  Building2,
  Boxes,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  AlertTriangle,
  TrendingUp,
  Home,
  Shield,
  Briefcase,
  Building,
  ClipboardList,
  MapPin,
  Server,
  Activity,
  Truck,
  Database,
  Bell,
  Clock,
  BarChart2,
  LineChart,
  Menu,
  X,
  ICON_DEFAULT_COLORS,
  ICON_COLORS,
} from "./ui/Icons";
import { useI18n } from "../context/i18n";
import { useAuthStore } from "../store/authStore";
import { useRealtimeStore } from "../store/realtimeStore";
import { Tooltip } from "./ui/Tooltip";

// Colores semánticos para iconos del sidebar - usa ICON_COLORS del sistema central
const SIDEBAR_ICON_COLORS = {
  // Navegación principal
  Home: ICON_COLORS.subtle,
  Bell: ICON_COLORS.notification,
  FileText: ICON_COLORS.info,
  FilePlus2: ICON_COLORS.primary,
  ClipboardList: ICON_COLORS.info,
  CheckCircle2: ICON_COLORS.success,

  // Materiales
  Package: ICON_COLORS.logistics,
  Search: ICON_COLORS.info,
  GitCompare: ICON_COLORS.info,

  // Planificador
  Workflow: ICON_COLORS.primary,
  Layers: ICON_COLORS.logistics,
  AlertTriangle: ICON_COLORS.warning,
  TrendingUp: ICON_COLORS.success,
  LineChart: ICON_COLORS.charts,
  BarChart2: ICON_COLORS.charts,
  Clock: ICON_COLORS.time,
  Activity: ICON_COLORS.charts,

  // Admin
  Database: ICON_COLORS.secondary,
  Users: ICON_COLORS.users,
  User: ICON_COLORS.users,
  Shield: ICON_COLORS.secondary,
  Briefcase: ICON_COLORS.money,
  Building: ICON_COLORS.secondary,
  Building2: ICON_COLORS.secondary,
  MapPin: ICON_COLORS.danger,
  Boxes: ICON_COLORS.logistics,
  Server: ICON_COLORS.secondary,
  Truck: ICON_COLORS.logistics,

  // Presupuesto
  Wallet: ICON_COLORS.money,

  // Sistema
  Settings: ICON_COLORS.secondary,
  LogOut: ICON_COLORS.danger,
};

// Helper para obtener el color del icono
// Todos los iconos son #212121, incluso cuando están activos (excepto Bell con animación)
const getIconColor = (iconName, isActive, hasNotifications = false) => {
  if (iconName === 'Bell' && hasNotifications) return ''; // Bell con notificaciones usa animación
  return 'text-[#212121]'; // Todos los iconos siempre en negro #212121
};

// Navigation structure
// Base navigation items (without role-specific items)
const getMainNavItems = (canApprove) => [
  {
    key: "solicitudes",
    trKey: "nav_solicitudes",
    label: "Solicitudes",
    icon: FileText,
    iconName: "FileText",
    children: [
      { trKey: "nav_nueva", label: "Nueva Solicitud", to: "/solicitudes/nueva", icon: FilePlus2, iconName: "FilePlus2" },
      { trKey: "nav_mis", label: "Mis Solicitudes", to: "/mis-solicitudes", icon: FileText, iconName: "FileText" },
      { trKey: "nav_todas", label: "Todas las Solicitudes", to: "/solicitudes/todas", icon: ClipboardList, iconName: "ClipboardList" },
      // Aprobaciones - solo visible para aprobadores
      ...(canApprove ? [{ trKey: "nav_aprobaciones", label: "Aprobaciones", to: "/aprobaciones", icon: CheckCircle2, iconName: "CheckCircle2" }] : []),
    ],
  },
  {
    key: "materiales",
    trKey: "nav_materiales",
    label: "Materiales",
    icon: Package,
    iconName: "Package",
    children: [
      { trKey: "nav_catalogo_materiales", label: "Catálogo", to: "/materiales/catalogo", icon: Search, iconName: "Search" },
      { trKey: "nav_equivalencias", label: "Alternativos", to: "/materiales/equivalencias", icon: GitCompare, iconName: "GitCompare" },
    ],
  },
];

const plannerNavItems = [
  {
    key: "planificador",
    trKey: "nav_planificador",
    label: "Planificador",
    icon: Workflow,
    iconName: "Workflow",
    children: [
      { trKey: "nav_panel_tratamiento", label: "Panel", to: "/planificador", icon: CheckCircle2, iconName: "CheckCircle2" },
      { trKey: "nav_asignadas", label: "Mis Asignadas", to: "/planificador/asignadas", icon: FileText, iconName: "FileText" },
      { trKey: "nav_no_asignadas", label: "No Asignadas", to: "/planificador/no-asignadas", icon: FilePlus2, iconName: "FilePlus2" },
      {
        key: "mrp",
        trKey: "nav_mrp",
        label: "MRP",
        icon: Layers,
        iconName: "Layers",
        children: [
          { trKey: "nav_mrp_alertas", label: "Alertas", to: "/planificador/mrp/alertas", icon: AlertTriangle, iconName: "AlertTriangle" },
          { trKey: "nav_mrp_kpis", label: "KPIs", to: "/planificador/mrp/kpis", icon: TrendingUp, iconName: "TrendingUp" },
        ],
      },
      {
        key: "forecast",
        trKey: "nav_forecast",
        label: "Forecast",
        icon: LineChart,
        iconName: "LineChart",
        children: [
          { trKey: "nav_forecast_individual", label: "Individual", to: "/planificador/forecast", icon: BarChart2, iconName: "BarChart2" },
          { trKey: "nav_forecast_masivo", label: "Masivo", to: "/planificador/forecast/masivo", icon: TrendingUp, iconName: "TrendingUp" },
        ],
      },
      {
        key: "procurement",
        trKey: "nav_procurement",
        label: "Compras SAP",
        icon: Truck,
        iconName: "Truck",
        children: [
          { trKey: "nav_procurement_dashboard", label: "Panel General", to: "/procurement", icon: Boxes, iconName: "Boxes" },
          { trKey: "nav_procurement_analytics", label: "Analítica", to: "/procurement/analytics", icon: BarChart2, iconName: "BarChart2" },
        ],
      },
      { trKey: "nav_ai", label: "IA Analytics", to: "/planificador/ai", icon: Activity, iconName: "Activity" },
    ],
  },
];


const adminNavHierarchy = [
  {
    key: "registros",
    trKey: "admin_cat_registros",
    label: "Registros",
    icon: Database,
    iconName: "Database",
    children: [
      { trKey: "admin_usuarios", label: "Usuarios", to: "/admin/usuarios", icon: Users, iconName: "Users" },
      { trKey: "admin_solicitudes_perfil", label: "Solicitudes Perfil", to: "/admin/solicitudes-perfil", icon: User, iconName: "User" },
      { trKey: "admin_planificadores", label: "Planificadores", to: "/admin/planificadores", icon: Workflow, iconName: "Workflow" },
      { trKey: "admin_roles", label: "Roles", to: "/admin/roles", icon: Shield, iconName: "Shield" },
      { trKey: "admin_puestos", label: "Puestos", to: "/admin/puestos", icon: Briefcase, iconName: "Briefcase" },
      { trKey: "admin_sectores", label: "Sectores", to: "/admin/sectores", icon: Building, iconName: "Building" },
      { trKey: "admin_presupuestos", label: "Presupuestos", to: "/admin/presupuestos", icon: ClipboardList, iconName: "ClipboardList" },
      { trKey: "admin_centros", label: "Centros", to: "/admin/centros", icon: Building2, iconName: "Building2" },
      { trKey: "admin_almacenes", label: "Almacenes", to: "/admin/almacenes", icon: Boxes, iconName: "Boxes" },
      { trKey: "admin_proveedores", label: "Proveedores", to: "/admin/proveedores", icon: Truck, iconName: "Truck" },
      { trKey: "admin_bases_datos", label: "Bases de Datos", to: "/admin/bases-datos", icon: Database, iconName: "Database" },
    ],
  },
  {
    key: "sistema",
    trKey: "admin_cat_sistema",
    label: "Sistema",
    icon: Server,
    iconName: "Server",
    children: [
      { trKey: "admin_estado", label: "Estado del Sistema", to: "/admin/estado", icon: Activity, iconName: "Activity" },
      {
        key: "analisis-puntual",
        trKey: "admin_cat_analisis_puntual",
        label: "Análisis Puntual",
        icon: BarChart2,
        iconName: "BarChart2",
        children: [
          { trKey: "admin_ap_importar", label: "Importar Datos", to: "/admin/analisis-puntual", icon: Database, iconName: "Database" },
          { trKey: "admin_ap_mrp", label: "MRP Temporal", to: "/admin/analisis-puntual/mrp", icon: AlertTriangle, iconName: "AlertTriangle" },
          { trKey: "admin_ap_forecast", label: "Forecast Temporal", to: "/admin/analisis-puntual/forecast", icon: LineChart, iconName: "LineChart" },
        ],
      },
    ],
  },
];

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // Obtener unreadCount directamente del store (reactivo)
  const unreadCount = useRealtimeStore((state) => state.unreadCount);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Role helpers
  const getUserRoles = () => {
    if (!user?.rol) return [];
    const rolStr = String(user.rol);
    if (rolStr.startsWith("[")) {
      try {
        const parsed = JSON.parse(rolStr);
        return Array.isArray(parsed) ? parsed : [rolStr];
      } catch {
        return [rolStr];
      }
    }
    return [rolStr];
  };

  const hasRole = (targetRole) => {
    const roles = getUserRoles();
    return roles.some((r) => String(r).toLowerCase().includes(targetRole.toLowerCase()));
  };

  const isAdmin = () => hasRole("admin");
  const isPlanner = () => hasRole("planificador");
  const isJefe = () => hasRole("jefe");
  const isCoordinador = () => hasRole("coordinador");
  const isBudgetApprover = () => hasRole("aprobador presupuestos") || hasRole("aprobador_presupuestos");
  const isRequestApprover = () => hasRole("aprobador solicitudes") || hasRole("aprobador_solicitudes");
  const canSeePlanner = isPlanner() || isAdmin();
  const canSeeBudget = isAdmin() || isJefe() || isCoordinador() || isBudgetApprover();
  const isGerente = () => hasRole("gerente");
  const canApprove = isAdmin() || isJefe() || isCoordinador() || isRequestApprover() || isGerente();

  // Get main nav items with role-based filtering
  const mainNavItems = getMainNavItems(canApprove);

  const toggleMenu = useCallback((key) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isPathActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Render a single nav item
  const renderNavItem = (item, depth = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.key];
    const isActive = item.to ? isPathActive(item.to) : false;
    const label = t(item.trKey, item.label);
    const isNotifications = item.key === "bandeja-entrada";
    const hasNotifications = isNotifications && unreadCount > 0;
    const iconColor = getIconColor(item.iconName, isActive, hasNotifications);

    const baseClass = clsx(
      "flex items-center gap-2 w-full transition-all duration-200",
      "text-[10px] font-semibold uppercase tracking-wide",
      "border-b border-black/20",
      depth === 0 ? "px-2 py-2" : "px-2 py-1.5 pl-6",
      isActive
        ? "bg-[#1976d2] text-white"
        : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
    );

    // Collapsed mode - show only icon with tooltip
    if (collapsed && depth === 0) {
      return (
        <Tooltip key={item.key || item.to} content={`${label}${hasNotifications ? ` (${unreadCount})` : ""}`} position="right" delay={0} className="w-full flex justify-center py-0.5">
          {item.to ? (
            <NavLink to={item.to} className="relative flex items-center justify-center w-8 h-8 rounded-none transition-all duration-200 hover:bg-[#e0e0e0]">
              <Badge
                badgeContent={hasNotifications ? unreadCount : 0}
                color="primary"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    minWidth: '16px',
                    height: '16px',
                  }
                }}
              >
                <Icon className={clsx("w-5 h-5 flex-shrink-0", iconColor, hasNotifications && "animate-notification-blink")} />
              </Badge>
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={() => hasChildren && toggleMenu(item.key)}
              className="flex items-center justify-center w-8 h-8 rounded-none transition-all duration-200 hover:bg-[#e0e0e0]"
            >
              <Icon className={clsx("w-5 h-5 flex-shrink-0", iconColor)} />
            </button>
          )}
        </Tooltip>
      );
    }

    // Expanded mode
    if (item.to && !hasChildren) {
      return (
        <Badge
          key={item.to}
          badgeContent={hasNotifications ? unreadCount : 0}
          color="primary"
          max={99}
          sx={{
            width: '100%',
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              minWidth: '18px',
              height: '18px',
              top: 4,
              right: 8,
            }
          }}
        >
          <NavLink to={item.to} className={clsx(baseClass, "w-full")}>
            <Icon className={clsx("w-3.5 h-3.5 flex-shrink-0", iconColor, hasNotifications && "animate-notification-blink")} />
            <span className="truncate">{label}</span>
          </NavLink>
        </Badge>
      );
    }

    // Parent item with children
    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={() => toggleMenu(item.key)}
          className={clsx(baseClass, "justify-between")}
        >
          <div className="flex items-center gap-2">
            <Icon className={clsx("w-3.5 h-3.5 flex-shrink-0", iconColor)} />
            <span className="truncate">{label}</span>
          </div>
          <ChevronDown
            className={clsx("w-3 h-3 transition-transform duration-200 text-black", isExpanded && "rotate-180")}
          />
        </button>

        {/* Children */}
        {isExpanded && (
          <div className="mt-1 space-y-0.5 animate-fade-in">
            {item.children.map((child) => {
              // Nested children (like MRP)
              if (child.children) {
                return renderNavItem(child, depth + 1);
              }

              const ChildIcon = child.icon;
              const childActive = isPathActive(child.to);
              const childLabel = t(child.trKey, child.label);
              const childIconColor = getIconColor(child.iconName, childActive);

              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-1.5 pl-6 transition-all duration-200",
                    "text-[10px] font-semibold uppercase tracking-wide",
                    "border-b border-black/20",
                    childActive
                      ? "bg-[#1976d2] text-white"
                      : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
                  )}
                >
                  <ChildIcon className={clsx("w-3 h-3 flex-shrink-0", childIconColor)} />
                  <span className="truncate">{childLabel}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile hamburger button - visible only on small screens */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className={clsx(
          "fixed top-[52px] left-3 z-50 md:hidden",
          // Touch target mínimo de 44x44px para accesibilidad
          "h-11 w-11 min-h-[44px] min-w-[44px]",
          "rounded-none grid place-items-center",
          "bg-[#bdbdbd] shadow-lg border border-[#9e9e9e]",
          "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]",
          "transition-all duration-150",
          // Efecto activo para feedback táctil
          "active:scale-95"
        )}
        aria-label={mobileOpen ? t("menu_close", "Cerrar menú") : t("menu_open", "Abrir menú")}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="w-5 h-5 text-[#212121]" /> : <Menu className="w-5 h-5 text-[#212121]" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed left-0 top-[43px] h-[calc(100vh-43px)] z-40",
          // MUI Grey A400 background
          "bg-[#bdbdbd]",
          "border-r border-[#9e9e9e]",
          "shadow-xl",
          "flex flex-col transition-all duration-300 ease-spring",
          // Width responsive:
          // - Móvil: w-72 (288px) para mejor usabilidad táctil
          // - Desktop collapsed: w-[43px]
          // - Desktop expanded: w-[160px]
          "w-72",
          collapsed ? "md:w-[43px]" : "md:w-[160px]",
          // Mobile: hidden by default, slide in when open
          "md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1 space-y-0.5" style={{ maxHeight: 'calc(100vh - 43px - 100px)' }}>
        {/* Section: Principal */}
        {!collapsed ? (
          <div className="pb-1 px-2 flex items-center justify-between">
            <span className="text-[8px] font-semibold uppercase tracking-wider text-[#616161]">
              {t("nav_principal", "Principal")}
            </span>
            <button
              type="button"
              onClick={onToggle}
              className="h-5 w-5 rounded-none grid place-items-center text-[#616161] hover:text-[#1976d2] hover:bg-[#e0e0e0] transition-all duration-150"
              title={t("tooltip_colapsar", "Colapsar")}
              aria-label={t("tooltip_colapsar", "Colapsar")}
            >
              <ChevronLeft className="w-3 h-3 text-black" />
            </button>
          </div>
        ) : (
          <div className="pb-1 px-1 flex justify-center">
            <button
              type="button"
              onClick={onToggle}
              className="h-6 w-6 rounded-none grid place-items-center text-[#616161] hover:text-[#1976d2] hover:bg-[#e0e0e0] transition-all duration-150"
              title={t("tooltip_expandir", "Expandir")}
              aria-label={t("tooltip_expandir", "Expandir")}
            >
              <ChevronRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        )}
        {/* Section: Operaciones */}
        {!collapsed && (
          <div className="pt-2 pb-1 px-2">
            <span className="text-[8px] font-semibold uppercase tracking-wider text-[#616161]">
              {t("nav_operaciones", "Operaciones")}
            </span>
          </div>
        )}
        {/* Solicitudes y Materiales */}
        {mainNavItems.map((item) => renderNavItem(item))}

        {/* Presupuesto - ahora en Operaciones */}
        {canSeeBudget && (
          collapsed ? (
            <Tooltip content={t("nav_presupuesto", "Presupuesto")} position="right" delay={0} className="w-full flex justify-center py-0.5">
              <NavLink
                to="/presupuestos"
                className={clsx(
                  "flex items-center justify-center w-7 h-7 rounded-none transition-all duration-150",
                  isPathActive("/presupuestos")
                    ? "bg-[#1976d2]"
                    : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
                )}
              >
                <Wallet className="w-3.5 h-3.5 flex-shrink-0 text-[#212121]" />
              </NavLink>
            </Tooltip>
          ) : (
            <NavLink
              to="/presupuestos"
              className={clsx(
                "flex items-center gap-2 w-full rounded-none transition-all duration-150",
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-2",
                "border-b border-black/20",
                isPathActive("/presupuestos")
                  ? "bg-[#1976d2] text-white"
                  : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
              )}
            >
              <Wallet className="w-3.5 h-3.5 flex-shrink-0 text-[#212121]" />
              <span className="truncate">{t("nav_presupuesto", "Presupuesto")}</span>
            </NavLink>
          )
        )}

        {/* Section: Planificación */}
        {canSeePlanner && (
          <>
            {!collapsed && (
              <div className="pt-2 pb-1 px-2">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-[#616161]">
                  {t("nav_planificacion", "Planificación")}
                </span>
              </div>
            )}
            {plannerNavItems.map((item) => renderNavItem(item))}
          </>
        )}

        {/* Section: Administración */}
        {isAdmin() && (
          <>
            {!collapsed && (
              <div className="pt-2 pb-1 px-2">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-[#616161]">
                  {t("nav_admin", "Administración")}
                </span>
              </div>
            )}
            {adminNavHierarchy.map((item) => renderNavItem(item))}
          </>
        )}

      </nav>
    </aside>
    </>
  );
}

// Memoizar para evitar re-renders innecesarios cuando cambian props no relacionadas
export default memo(Sidebar);
