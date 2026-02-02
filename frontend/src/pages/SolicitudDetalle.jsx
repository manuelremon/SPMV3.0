import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { solicitudes } from "../services/spm";
import { useI18n } from "../context/i18n";
import { formatDate, formatCurrency, getSectorNombre, formatAlmacen } from "../utils/formatters";

// MUI Components
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableFooter from "@mui/material/TableFooter";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";

// MUI Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DescriptionIcon from "@mui/icons-material/Description";
import InventoryIcon from "@mui/icons-material/Inventory";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import TagIcon from "@mui/icons-material/Tag";

import StatusBadge from "../components/ui/StatusBadge";

// DetailRow component using MUI
function DetailRow({ icon: Icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box
        sx={{
          height: 36,
          width: 36,
          borderRadius: 2,
          bgcolor: "action.hover",
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18, color: "text.secondary" }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.primary", mt: 0.5, wordBreak: "break-word" }}
        >
          {value || "-"}
        </Typography>
      </Box>
    </Box>
  );
}

// Loading skeleton using MUI
function LoadingSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rounded" width="33%" height={32} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        <Skeleton variant="rounded" height={192} />
        <Skeleton variant="rounded" height={192} />
      </Box>
      <Skeleton variant="rounded" height={256} />
    </Stack>
  );
}

export default function SolicitudDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSolicitud = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await solicitudes.obtener(id);
        if (res.data?.solicitud) {
          setSolicitud(res.data.solicitud);
        } else if (res.data) {
          setSolicitud(res.data);
        } else {
          setError("No se encontro la solicitud");
        }
      } catch (err) {
        console.error("Error fetching solicitud:", err);
        setError(err.response?.data?.error?.message || err.message || "Error al cargar la solicitud");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSolicitud();
    }
  }, [id]);

  // Back button component
  const BackButton = () => (
    <Button
      variant="text"
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate(-1)}
      sx={{ color: "text.secondary" }}
    >
      {t("common_back", "Volver")}
    </Button>
  );

  if (loading) {
    return (
      <Stack spacing={3}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" fontWeight={600}>
            {t("detalle_loading", "Cargando solicitud...")}
          </Typography>
          <BackButton />
        </Box>
        <LoadingSkeleton />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={3}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" fontWeight={600}>
            {t("detalle_error_title", "Error")}
          </Typography>
          <BackButton />
        </Box>
        <Alert severity="error">{error}</Alert>
      </Stack>
    );
  }

  if (!solicitud) {
    return (
      <Stack spacing={3}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" fontWeight={600}>
            {t("detalle_not_found", "Solicitud no encontrada")}
          </Typography>
          <BackButton />
        </Box>
        <Alert severity="warning">
          {t("detalle_not_found_msg", "La solicitud solicitada no existe o fue eliminada.")}
        </Alert>
      </Stack>
    );
  }

  const items = solicitud.items || [];
  const estado = solicitud.estado || solicitud.status || "pendiente";
  const criticidad = solicitud.criticidad || "Normal";
  const isAltaCriticidad = criticidad.toLowerCase().includes("alta");

  // Construir info del aprobador para el tooltip
  const aprobadorNombre = [solicitud.aprobador_nombre, solicitud.aprobador_apellido]
    .filter(Boolean)
    .join(" ") || null;

  const tooltipInfo = {
    aprobador: aprobadorNombre,
    fechaEnvio: solicitud.created_at,
    fechaAprobacion: solicitud.fecha_aprobacion,
    planificador: [solicitud.planner_nombre, solicitud.planner_apellido]
      .filter(Boolean)
      .join(" ") || null,
  };

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" fontWeight={600}>
          {`${t("detalle_title", "Solicitud")} #${solicitud.id}`}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <StatusBadge estado={estado} tooltipInfo={tooltipInfo} />
          <BackButton />
        </Stack>
      </Box>

      {/* Info Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
        {/* Informacion General */}
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t("detalle_info_general", "Informacion General")}
            </Typography>
          </Box>
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <DetailRow
              icon={TagIcon}
              label={t("detalle_id", "ID de Solicitud")}
              value={solicitud.id}
            />
            <DetailRow
              icon={PersonIcon}
              label={t("detalle_solicitante", "Solicitante")}
              value={solicitud.id_usuario || solicitud.solicitante}
            />
            <DetailRow
              icon={CalendarTodayIcon}
              label={t("detalle_fecha_creacion", "Fecha de Creacion")}
              value={formatDate(solicitud.created_at || solicitud.fecha_creacion)}
            />
            <DetailRow
              icon={AccessTimeIcon}
              label={t("detalle_fecha_necesidad", "Fecha de Necesidad")}
              value={formatDate(solicitud.fecha_necesidad)}
            />
            {/* Criticidad row */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box
                sx={{
                  height: 36,
                  width: 36,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <WarningAmberIcon
                  sx={{
                    fontSize: 18,
                    color: isAltaCriticidad ? "error.main" : "text.secondary",
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("detalle_criticidad", "Criticidad")}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={criticidad}
                    size="small"
                    color={isAltaCriticidad ? "error" : "default"}
                    sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem" }}
                  />
                </Box>
              </Box>
            </Box>
          </Stack>
        </Paper>

        {/* Ubicacion y Costos */}
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {t("detalle_ubicacion", "Ubicacion y Costos")}
            </Typography>
          </Box>
          <Stack spacing={2.5} sx={{ p: 3 }}>
            <DetailRow
              icon={BusinessIcon}
              label={t("detalle_centro", "Centro")}
              value={solicitud.centro || solicitud.centro_id}
            />
            <DetailRow
              icon={LocationOnIcon}
              label={t("detalle_sector", "Sector")}
              value={getSectorNombre(solicitud.sector || solicitud.sector_id)}
            />
            <DetailRow
              icon={InventoryIcon}
              label={t("detalle_almacen", "Almacen Virtual")}
              value={formatAlmacen(solicitud.almacen_virtual || solicitud.almacen)}
            />
            <DetailRow
              icon={AttachMoneyIcon}
              label={t("detalle_centro_costos", "Centro de Costos")}
              value={solicitud.centro_costos}
            />
            {/* Monto Total row */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box
                sx={{
                  height: 36,
                  width: 36,
                  borderRadius: 2,
                  bgcolor: "primary.50",
                  border: "1px solid",
                  borderColor: "primary.200",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <AttachMoneyIcon sx={{ fontSize: 18, color: "primary.main" }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("detalle_monto_total", "Monto Total")}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: "primary.main", fontWeight: 700, mt: 0.5 }}
                >
                  {formatCurrency(solicitud.total_monto || 0)}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Justificacion */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t("detalle_justificacion", "Justificacion")}
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Box
              sx={{
                height: 36,
                width: 36,
                borderRadius: 2,
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <DescriptionIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            </Box>
            <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.7, flex: 1 }}>
              {solicitud.justificacion || t("detalle_sin_justificacion", "Sin justificacion proporcionada")}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Items/Materiales */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t("detalle_materiales", "Materiales")} ({items.length})
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          {items.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <InventoryIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary">
                {t("detalle_sin_items", "No hay materiales en esta solicitud")}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      {t("detalle_item_codigo", "Codigo")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      {t("detalle_item_descripcion", "Descripcion")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      {t("detalle_item_cantidad", "Cantidad")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      {t("detalle_item_precio", "Precio Unit.")}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                      {t("detalle_item_subtotal", "Subtotal")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, idx) => {
                    const precio = Number(item.precio_unitario || item.precio || 0);
                    const cantidad = Number(item.cantidad || 0);
                    const subtotal = precio * cantidad;
                    return (
                      <TableRow
                        key={idx}
                        hover
                        sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                      >
                        <TableCell sx={{ fontFamily: "monospace" }}>
                          {item.codigo || item.material_codigo || "-"}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 280 }}>
                            <Typography
                              variant="body2"
                              noWrap
                              title={item.descripcion || item.material_descripcion}
                            >
                              {item.descripcion || item.material_descripcion || "-"}
                            </Typography>
                            {item.comentario && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                component="p"
                                title={item.comentario}
                              >
                                {item.comentario}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          {cantidad} {item.unidad || ""}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                          {formatCurrency(precio)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 500 }}>
                          {formatCurrency(subtotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                      {t("detalle_total", "Total")}:
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem", color: "primary.main" }}>
                      {formatCurrency(solicitud.total_monto || 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Acciones segun estado */}
      {estado.toLowerCase() === "borrador" && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/solicitudes/${solicitud.id}/materiales`)}
          >
            {t("detalle_btn_editar", "Editar Solicitud")}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
