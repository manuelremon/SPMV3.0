/**
 * Layout Component - Sidebar-based navigation
 * Glass Morphism Design (Apple/iOS Style)
 * Gradient background with glass effects
 *
 * Inicializa conexion de tiempo real (SSE) para notificaciones
 */

import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Wifi, WifiOff, User, Settings, LogOut, ChevronDown, Bell, Home } from "./ui/Icons";
import Badge from "@mui/material/Badge";
import { useRealtimeStore } from "../store/realtimeStore";
import clsx from "clsx";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAuthStore } from "../store/authStore";
import { useVertexStore } from "../store/vertexStore";
import { useRealtime } from "../hooks/useRealtime";
import ChatAssistant from "./ChatAssistant";
import Sidebar from "./Sidebar";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { toggleChat, getUnshownAlertsCount } = useVertexStore();
  const unshownAlertsCount = getUnshownAlertsCount();
  const unreadCount = useRealtimeStore((state) => state.unreadCount);

  // Inicializar conexion de tiempo real (SSE)
  // Solo se conecta si hay usuario autenticado
  const { isConnected, connectionError } = useRealtime({
    enabled: !!user
  });

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("spm-sidebar-collapsed");
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Save sidebar state
  const handleSidebarToggle = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("spm-sidebar-collapsed", JSON.stringify(newState));
  };

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
      <header className="fixed top-0 left-0 right-0 h-[43px] z-50 bg-[#bdbdbd] border-b border-[#9e9e9e] flex items-center justify-between pr-4">
        {/* App name izquierda - 43x43px box + Home icon */}
        <div className="flex items-center">
          <div className="w-[43px] h-[43px] flex items-center justify-center bg-[#093170] border-r border-[#757575] -ml-px">
            <span className="text-sm font-bold text-[#bbdefb] uppercase tracking-wide">
              {t("app_name", "SPM")}
            </span>
          </div>
          {/* Home icon */}
          <NavLink
            to="/dashboard"
            className={clsx(
              "flex items-center justify-center w-10 h-[43px] transition-all duration-200",
              isPathActive("/dashboard")
                ? "bg-[#1976d2] text-white"
                : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
            )}
            title={t("nav_dashboard", "Dashboard")}
          >
            <Home className={clsx("w-5 h-5", isPathActive("/dashboard") ? "text-white" : "text-[#212121]")} />
          </NavLink>
        </div>

        {/* Notificaciones + User Menu derecha */}
        <div className="flex items-center gap-2">
          {/* Botón Notificaciones */}
          <NavLink
            to="/centro-interaccion"
            className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-none transition-all duration-200",
              isPathActive("/centro-interaccion")
                ? "bg-[#1976d2] text-white"
                : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
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
              <Bell className={clsx("w-4 h-4", unreadCount > 0 && "animate-notification-blink", isPathActive("/centro-interaccion") ? "text-white" : "text-[#212121]")} />
            </Badge>
          </NavLink>

          {/* Foro Icon */}
          <NavLink
            to="/foro"
            className={clsx(
              "flex items-center justify-center w-8 h-8 rounded-none transition-all duration-200",
              isPathActive("/foro")
                ? "bg-[#1976d2] text-white"
                : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
            )}
            title={t("nav_foro", "Foro")}
          >
            <MessageSquare className={clsx("w-4 h-4", isPathActive("/foro") ? "text-white" : "text-[#212121]")} />
          </NavLink>

          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-none transition-all duration-200 text-[10px] font-medium px-2 py-1.5 text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
            >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-[8px] shadow-md">
                {user?.nombre?.[0]?.toUpperCase() || "U"}
              </div>
              <p className="text-[10px] font-medium text-[#212121] truncate max-w-[80px]">
                {user?.nombre || t("user_default", "Usuario")}
              </p>
            </div>
            <ChevronDown
              className={clsx(
                "w-3 h-3 transition-transform duration-200 text-black",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-[#bdbdbd] border border-[#9e9e9e] shadow-lg animate-fade-in">
              <NavLink
                to="/mi-cuenta"
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 transition-all duration-200",
                  "text-[10px] font-medium uppercase tracking-wide",
                  isPathActive("/mi-cuenta")
                    ? "bg-[#1976d2] text-white"
                    : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
                )}
              >
                <User className="w-3 h-3 text-[#212121]" />
                <span>{t("user_mi_cuenta", "Mi Cuenta")}</span>
              </NavLink>
              <NavLink
                to="/ajustes"
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 transition-all duration-200",
                  "text-[10px] font-medium uppercase tracking-wide",
                  isPathActive("/ajustes")
                    ? "bg-[#1976d2] text-white"
                    : "text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
                )}
              >
                <Settings className="w-3 h-3 text-[#212121]" />
                <span>{t("user_ajustes", "Ajustes")}</span>
              </NavLink>
              <div className="border-t border-[#9e9e9e]" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 w-full transition-all duration-200 text-[10px] font-medium uppercase tracking-wide text-[#212121] hover:text-[#1976d2] hover:bg-[#e0e0e0]"
              >
                <LogOut className="w-3 h-3 text-[#212121]" />
                <span>{t("user_logout", "Cerrar Sesión")}</span>
              </button>
            </div>
          )}
          </div>

          {/* Connection Status Indicator - Wifi icon with fill animation */}
          <div
            className="relative flex items-center justify-center w-6 h-6"
            title={isConnected ? "Real Time" : "Offline"}
          >
            {/* Base icon (gray) */}
            <Wifi className="w-4 h-4 text-[#9e9e9e] absolute" />
            {/* Animated fill icon (white) - only visible when connected */}
            {isConnected && (
              <Wifi className="w-4 h-4 text-white absolute animate-wifi-fill" />
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      {/* Main content area */}
      <div
        className={clsx(
          "min-h-screen transition-all duration-300 ease-spring",
          // Padding top para el header (43px)
          "pt-[43px]",
          // En móvil (<768px): sin margin-left (sidebar está oculto)
          // En desktop: margin según estado del sidebar (160px expandido)
          isMobile ? "ml-0" : (sidebarCollapsed ? "ml-[43px]" : "ml-[160px]")
        )}
      >
        {/* Page content - Responsive padding */}
        <main
          id="main-content"
          className={clsx(
            "p-3 sm:p-4 lg:p-6",
            // Padding top extra en móvil para el hamburger button
            isMobile && "pt-16"
          )}
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
          "bg-gradient-to-r from-violet-500 to-purple-600",
          "text-white shadow-lg shadow-violet-500/30",
          "hover:shadow-xl hover:shadow-violet-500/40",
          "hover:from-violet-600 hover:to-purple-700",
          "transition-all duration-300 ease-spring",
          "hover:scale-105",
          // Touch target mínimo de 44px
          "min-h-[44px] min-w-[44px]"
        )}
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
