/**
 * Configuración de estilos unificados para el sistema SPM
 * Incluye: Estados, Criticidad, y estilos de botones
 */

import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Package,
  Truck,
  Archive,
  AlertTriangle,
  AlertCircle,
  FileText,
  Pause,
  Play
} from "../components/ui/Icons";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTADOS
// ═══════════════════════════════════════════════════════════════
export const estadoConfig = {
  // Estados de Solicitudes
  "Borrador": {
    color: "#f57c00",
    icon: FileText,
    label: "Borrador"
  },
  "Draft": {
    color: "#f57c00",
    icon: FileText,
    label: "Borrador"
  },
  "Enviada": {
    color: "#757575",
    icon: Send,
    label: "Enviada"
  },
  "Submitted": {
    color: "#757575",
    icon: Send,
    label: "Enviada"
  },
  "Pendiente": {
    color: "#757575",
    icon: Clock,
    label: "Pendiente"
  },
  "Pending": {
    color: "#757575",
    icon: Clock,
    label: "Pendiente"
  },
  "Pendiente_de_Aprobacion": {
    color: "#757575",
    icon: Clock,
    label: "Pendiente"
  },
  "En Proceso": {
    color: "#c2185b",
    icon: Play,
    label: "En Proceso"
  },
  "Processing": {
    color: "#c2185b",
    icon: Play,
    label: "En Proceso"
  },
  "En Progreso": {
    color: "#c2185b",
    icon: Play,
    label: "En Proceso"
  },
  "Aprobada": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Aprobada"
  },
  "Approved": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Aprobada"
  },
  "Completada": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Completada"
  },
  "Completed": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Completada"
  },
  "Rechazada": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Rechazada"
  },
  "Rejected": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Rechazada"
  },
  "En Despacho": {
    color: "#c2185b",
    icon: Package,
    label: "En Despacho"
  },
  "Dispatching": {
    color: "#c2185b",
    icon: Package,
    label: "En Despacho"
  },
  "Despachada": {
    color: "#689f38",
    icon: Truck,
    label: "Despachada"
  },
  "Dispatched": {
    color: "#689f38",
    icon: Truck,
    label: "Despachada"
  },
  "Cerrada": {
    color: "#689f38",
    icon: Archive,
    label: "Cerrada"
  },
  "Closed": {
    color: "#689f38",
    icon: Archive,
    label: "Cerrada"
  },
  "Cancelada": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Cancelada"
  },
  "Cancelled": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Cancelada"
  },
  "En Pausa": {
    color: "#757575",
    icon: Pause,
    label: "En Pausa"
  },
  "On Hold": {
    color: "#757575",
    icon: Pause,
    label: "En Pausa"
  },

  // Estados genéricos
  "Activo": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Activo"
  },
  "Active": {
    color: "#689f38",
    icon: CheckCircle,
    label: "Activo"
  },
  "Inactivo": {
    color: "#757575",
    icon: Pause,
    label: "Inactivo"
  },
  "Inactive": {
    color: "#757575",
    icon: Pause,
    label: "Inactivo"
  },
  "Suspendido": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Suspendido"
  },
  "Suspended": {
    color: "#d32f2f",
    icon: XCircle,
    label: "Suspendido"
  },
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CRITICIDAD
// ═══════════════════════════════════════════════════════════════
export const criticidadConfig = {
  "Urgente": {
    color: "#d32f2f",
    icon: AlertTriangle,
    label: "Urgente"
  },
  "Urgent": {
    color: "#d32f2f",
    icon: AlertTriangle,
    label: "Urgente"
  },
  "Alta": {
    color: "#d32f2f",
    icon: AlertCircle,
    label: "Alta"
  },
  "High": {
    color: "#d32f2f",
    icon: AlertCircle,
    label: "Alta"
  },
  "Normal": {
    color: "#1976d2",
    icon: Clock,
    label: "Normal"
  },
  "Medium": {
    color: "#1976d2",
    icon: Clock,
    label: "Normal"
  },
  "Baja": {
    color: "#689f38",
    icon: Clock,
    label: "Baja"
  },
  "Low": {
    color: "#689f38",
    icon: Clock,
    label: "Baja"
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Obtener configuración de estado
// ═══════════════════════════════════════════════════════════════
export function getEstadoConfig(estado) {
  if (!estado) return estadoConfig["Pendiente"];
  return estadoConfig[estado] || estadoConfig["Pendiente"];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Obtener configuración de criticidad
// ═══════════════════════════════════════════════════════════════
export function getCriticidadConfig(criticidad) {
  if (!criticidad) return criticidadConfig["Normal"];
  return criticidadConfig[criticidad] || criticidadConfig["Normal"];
}
