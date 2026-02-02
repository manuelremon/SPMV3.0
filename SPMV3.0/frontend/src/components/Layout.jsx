/**
 * Layout Component - Header-based navigation
 * Navegacion horizontal en el header (reemplaza sidebar)
 *
 * Inicializa conexion de tiempo real (SSE) para notificaciones
 */

import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Wifi, User, Settings, LogOut, ChevronDown, Bell, Home } from "./ui/Icons";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useRealtimeStore } from "../store/realtimeStore";
import clsx from "clsx";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuthStore } from "../store/authStore";
import { useVertexStore } from "../store/vertexStore";
import { useRealtime } from "../hooks/useRealtime";
import ChatAssistant from "./ChatAssistant";
import HeaderNav from "./HeaderNav";
import ToastContainer from "./ui/ToastContainer";
import SkipLink from "./ui/SkipLink";
import { useI18n } from "../context/i18n";

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const { toggleChat, getUnshownAlertsCount } = useVertexStore();
  const unshownAlertsCount = getUnshownAlertsCount();
  const unreadCount = useRealtimeStore((state) => state.unreadCount);

  // Inicializar conexion de tiempo real (SSE)
  // Solo se conecta si hay usuario autenticado
  const { isConnected, connectionError } = useRealtime({
    enabled: !!user
  });

  // Close user menu on route change
  useEffect(() => {
    setUserMenuAnchor(null);
  }, [location.pathname]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const isPathActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Skip Navigation Link - Accesibilidad WCAG 2.1 AA */}
      <SkipLink targetId="main-content" />

      {/* Header Menu - 43px alto, ancho completo */}
      <header className="fixed top-0 left-0 right-0 h-[43px] z-50 bg-[#212121] border-b border-[#424242] flex items-center">
        {/* Izquierda: Logo SPM */}
        <div className="flex-shrink-0">
          <div className="w-[86px] h-[43px] flex items-center justify-center bg-[#093170] border-r border-[#424242]">
            <span className="text-sm font-bold text-[#bbdefb] uppercase tracking-wide">
              {t("app_name", "SPM")}
            </span>
          </div>
        </div>

        {/* Centro: Dashboard + Navegación (centrado) */}
        <div className="flex-1 flex items-center justify-center h-[43px]">
          <div className="flex items-center">
            {/* Home icon */}
            <NavLink
              to="/dashboard"
              className={clsx(
                "flex items-center justify-center w-[43px] h-[43px] border-l border-r border-[#424242] transition-all duration-200",
                isPathActive("/dashboard")
                  ? "bg-[#1976d2] text-white"
                  : "text-white hover:bg-[#424242]"
              )}
              title={t("nav_dashboard", "Dashboard")}
            >
              <Home className="w-5 h-5" />
            </NavLink>
            {/* Header Navigation */}
            <HeaderNav />
          </div>
        </div>

        {/* Derecha: User Menu + Notificaciones */}
        <div className="flex-shrink-0 flex items-center h-[43px]">
          {/* User Menu - primero, con mismo estilo que botones del menú */}
          <div className="h-[43px] border-l border-[#424242]">
            <button
              type="button"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              className={clsx(
                "flex items-center gap-2 h-[43px] px-4 transition-all duration-200",
                "text-[10px] font-semibold uppercase tracking-wide",
                userMenuAnchor || isPathActive("/mi-cuenta") || isPathActive("/ajustes")
                  ? "bg-[#1976d2] text-white"
                  : "text-white hover:bg-[#424242]"
              )}
            >
              <span className="truncate max-w-[100px]">
                {user?.nombre || t("user_default", "Usuario")}
              </span>
              <ChevronDown
                className={clsx(
                  "w-3 h-3 transition-transform duration-200",
                  userMenuAnchor && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu - MUI Menu */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              disableScrollLock={true}
              MenuListProps={{ sx: { py: 0 } }}
              PaperProps={{
                sx: {
                  minWidth: 150,
                  backgroundColor: '#212121',
                  border: '1px solid #424242',
                }
              }}
            >
              <MenuItem
                component={NavLink}
                to="/mi-cuenta"
                onClick={() => setUserMenuAnchor(null)}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1,
                  px: 2,
                  color: 'white',
                  borderBottom: '1px solid #424242',
                  backgroundColor: isPathActive("/mi-cuenta") ? '#1976d2' : 'transparent',
                  '&:hover': {
                    backgroundColor: isPathActive("/mi-cuenta") ? '#1565c0' : '#424242',
                  },
                }}
              >
                {t("user_mi_cuenta", "Mi Cuenta")}
              </MenuItem>
              <MenuItem
                component={NavLink}
                to="/ajustes"
                onClick={() => setUserMenuAnchor(null)}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1,
                  px: 2,
                  color: 'white',
                  borderBottom: '1px solid #424242',
                  backgroundColor: isPathActive("/ajustes") ? '#1976d2' : 'transparent',
                  '&:hover': {
                    backgroundColor: isPathActive("/ajustes") ? '#1565c0' : '#424242',
                  },
                }}
              >
                {t("user_ajustes", "Ajustes")}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  handleLogout();
                }}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 1,
                  px: 2,
                  color: '#ef5350',
                  '&:hover': {
                    backgroundColor: '#424242',
                  },
                }}
              >
                {t("user_logout", "Cerrar Sesión")}
              </MenuItem>
            </Menu>
          </div>

          {/* Botón Notificaciones */}
          <NavLink
            to="/centro-interaccion"
            className={clsx(
              "flex items-center justify-center w-[43px] h-[43px] border-l border-[#424242] transition-all duration-200",
              isPathActive("/centro-interaccion")
                ? "bg-[#1976d2] text-white"
                : "text-white hover:bg-[#424242]"
            )}
            title={t("nav_notificaciones", "Notificaciones")}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  minWidth: '16px',
                  height: '16px',
                }
              }}
            >
              <Bell className={clsx("w-4 h-4", unreadCount > 0 && "animate-notification-blink")} />
            </Badge>
          </NavLink>

          {/* Foro Icon */}
          <NavLink
            to="/foro"
            className={clsx(
              "flex items-center justify-center w-[43px] h-[43px] border-l border-[#424242] transition-all duration-200",
              isPathActive("/foro")
                ? "bg-[#1976d2] text-white"
                : "text-white hover:bg-[#424242]"
            )}
            title={t("nav_foro", "Foro")}
          >
            <MessageSquare className="w-4 h-4" />
          </NavLink>

          {/* Connection Status Indicator */}
          <div
            className="flex items-center justify-center w-[43px] h-[43px] border-l border-[#424242]"
            title={isConnected ? "Real Time" : "Offline"}
          >
            <div className="relative flex items-center justify-center w-6 h-6">
              <Wifi className="w-4 h-4 text-[#616161] absolute" />
              {isConnected && (
                <Wifi className="w-4 h-4 text-[#4caf50] absolute animate-wifi-fill" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content area - sin sidebar */}
      <div
        className={clsx(
          "min-h-screen transition-all duration-300 ease-spring",
          // Padding top para el header (43px)
          "pt-[43px]"
        )}
      >
        {/* Page content - Responsive padding */}
        <main
          id="main-content"
          className="p-3 sm:p-4 lg:p-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Floating Chat Button - Vertex IA */}
      <button
        type="button"
        onClick={toggleChat}
        className={clsx(
          "fixed z-50",
          // Posición responsive
          isMobile ? "bottom-4 right-4" : "bottom-6 right-6",
          // Tamaño responsive
          isMobile ? "h-12 w-12" : "h-14 w-14",
          "rounded-full grid place-items-center",
          "text-white shadow-lg",
          "hover:shadow-xl",
          "transition-all duration-300 ease-spring",
          "hover:scale-105",
          // Touch target mínimo de 44px
          "min-h-[44px] min-w-[44px]"
        )}
        style={{ backgroundColor: '#093170' }}
        aria-label="Abrir Vertex IA"
        title={t("tooltip_chat", "Vertex IA - Asistente")}
      >
        {/* Avatar V */}
        <span className={clsx("font-bold", isMobile ? "text-base" : "text-lg")}>V</span>
        {/* Badge de alertas */}
        {unshownAlertsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {unshownAlertsCount > 9 ? '9+' : unshownAlertsCount}
          </span>
        )}
      </button>

      {/* Chat Assistant */}
      <ChatAssistant />

      {/* Toast Container for notifications */}
      <ToastContainer />
    </div>
  );
}
