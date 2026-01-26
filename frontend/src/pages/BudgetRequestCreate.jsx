import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { budget } from "../services/spm";
import api from "../services/api";
import { useI18n } from "../context/i18n";
import { formatCurrency } from "../utils/formatters";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

const UMBRAL_L1 = 200000;
const UMBRAL_L2 = 1000000;

export default function BudgetRequestCreate() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    centro: "",
    sector: "",
    monto_solicitado: "",
    justificacion: "",
    importancia: "normal",
  });
  const [showUrgentWarning, setShowUrgentWarning] = useState(false);

  // Catalogs
  const [centros, setCentros] = useState([]);
  const [sectores, setSectores] = useState([]);
  const [presupuestoInfo, setPresupuestoInfo] = useState(null);

  // Load catalogs
  useEffect(() => {
    const loadCatalogos = async () => {
      setLoading(true);
      try {
        const [centrosRes, sectoresRes] = await Promise.all([
          api.get("/catalogos/centros"),
          api.get("/catalogos/sectores"),
        ]);
        setCentros(centrosRes.data || []);
        setSectores(sectoresRes.data || []);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    loadCatalogos();
  }, []);

  // Load budget info when centro/sector changes
  useEffect(() => {
    const loadPresupuesto = async () => {
      if (!form.centro || !form.sector) {
        setPresupuestoInfo(null);
        return;
      }
      try {
        const res = await budget.getInfo(form.centro, form.sector);
        setPresupuestoInfo(res.data.presupuesto || null);
      } catch {
        setPresupuestoInfo(null);
      }
    };
    loadPresupuesto();
  }, [form.centro, form.sector]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const getNivelAprobacion = useCallback((monto) => {
    const m = parseFloat(monto) || 0;
    if (m > UMBRAL_L2) return "Admin (más de $1M)";
    if (m > UMBRAL_L1) return "Nivel 2 (hasta $1M)";
    return "Nivel 1 (hasta $200K)";
  }, []);

  const validateForm = useCallback(() => {
    setError("");
    setMsg("");

    if (!form.centro || !form.sector) {
      setError(t("admin_required_fields", "Faltan campos obligatorios"));
      return false;
    }
    const monto = parseFloat(form.monto_solicitado);
    if (!monto || monto <= 0) {
      setError(t("bur_create_error", "Monto debe ser mayor a 0"));
      return false;
    }
    if ((form.justificacion || "").trim().length < 10) {
      setError(t("bur_campo_justificacion", "Justificación debe tener al menos 10 caracteres"));
      return false;
    }
    return true;
  }, [form, t]);

  const submitRequest = useCallback(async () => {
    setSubmitting(true);
    try {
      const monto = parseFloat(form.monto_solicitado);
      await budget.crear({
        centro: form.centro,
        sector: form.sector,
        monto_solicitado: monto,
        justificacion: form.justificacion.trim(),
        importancia: form.importancia,
      });
      setMsg(t("bur_create_success", "Solicitud creada exitosamente"));
      setTimeout(() => navigate("/presupuestos"), 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  }, [form, navigate, t]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (form.importancia === "urgente") {
      setShowUrgentWarning(true);
    } else {
      submitRequest();
    }
  }, [form.importancia, validateForm, submitRequest]);

  const handleConfirmUrgent = useCallback(() => {
    setShowUrgentWarning(false);
    submitRequest();
  }, [submitRequest]);

  const montoNum = parseFloat(form.monto_solicitado) || 0;
  const nuevoSaldo = presupuestoInfo ? (presupuestoInfo.saldo_usd || 0) + montoNum : null;

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <IconButton onClick={() => navigate("/presupuestos")} size="small" sx={{ color: "text.secondary" }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h5" component="h1" fontWeight={700} sx={{ textTransform: "uppercase" }}>
            {t("bur_create_title", "Nueva solicitud de presupuesto")}
          </Typography>
        </Box>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {msg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>
          {msg}
        </Alert>
      )}

      {/* Formulario */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                name="centro"
                label={t("bur_campo_centro", "Centro")}
                value={form.centro}
                onChange={handleChange}
                required
                disabled={loading}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <MenuItem value="" disabled>
                  {t("crud_select", "Selecciona")}...
                </MenuItem>
                {centros.map((c) => (
                  <MenuItem key={c.codigo || c.id} value={c.codigo || c.id}>
                    {c.codigo || c.id} - {c.nombre || c.descripcion || ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                name="sector"
                label={t("bur_campo_sector", "Sector")}
                value={form.sector}
                onChange={handleChange}
                required
                disabled={loading}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <MenuItem value="" disabled>
                  {t("crud_select", "Selecciona")}...
                </MenuItem>
                {sectores.map((s) => (
                  <MenuItem key={s.id || s.codigo} value={s.nombre}>
                    {s.nombre || s.descripcion || ""}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Info de presupuesto actual */}
          {presupuestoInfo && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Presupuesto</Typography>
                  <Typography variant="body1" fontFamily="monospace" fontWeight={600}>
                    {formatCurrency(presupuestoInfo.monto_usd)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">Saldo actual</Typography>
                  <Typography variant="body1" fontFamily="monospace" fontWeight={600} color="success.main">
                    {formatCurrency(presupuestoInfo.saldo_usd)}
                  </Typography>
                </Grid>
                {montoNum > 0 && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" color="text.secondary">Nuevo saldo (si se aprueba)</Typography>
                    <Typography variant="body1" fontFamily="monospace" fontWeight={600} color="primary.main">
                      {formatCurrency(nuevoSaldo)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          <Divider sx={{ my: 3 }} />

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                name="monto_solicitado"
                label={t("bur_campo_monto", "Monto solicitado (USD)")}
                value={form.monto_solicitado}
                onChange={handleChange}
                required
                placeholder="0.00"
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: 1, step: 0.01 }
                }}
                sx={{ "& input": { fontFamily: "monospace" } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                name="importancia"
                label={t("bur_campo_importancia", "Importancia")}
                value={form.importancia}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="urgente">Urgente</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {montoNum > 0 && (
                <Box sx={{ pt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Nivel de aprobación requerido
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="primary.main">
                    {getNivelAprobacion(form.monto_solicitado)}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <TextField
            fullWidth
            multiline
            rows={4}
            name="justificacion"
            label={t("bur_campo_justificacion", "Justificación")}
            value={form.justificacion}
            onChange={handleChange}
            required
            placeholder={t("bur_campo_justificacion_placeholder", "Explica el motivo del aumento de presupuesto...")}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={`${(form.justificacion || "").length}/10 mínimo`}
            sx={{ mb: 3 }}
          />

          <Divider sx={{ my: 3 }} />

          {/* Botones */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate("/presupuestos")}
              disabled={submitting}
              sx={{
                minWidth: 120,
                textTransform: "uppercase",
                color: "text.secondary",
                borderColor: "divider",
              }}
            >
              {t("bur_btn_cancelar", "Cancelar")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || loading}
              startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{ minWidth: 180, textTransform: "uppercase" }}
            >
              {submitting ? t("common_cargando", "Enviando...") : t("bur_btn_enviar", "Enviar solicitud")}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Modal de advertencia para solicitudes urgentes */}
      <Dialog
        open={showUrgentWarning}
        onClose={() => setShowUrgentWarning(false)}
      >
        <DialogTitle sx={{ textTransform: "uppercase", fontWeight: 700, color: "warning.main" }}>
          {t("bur_urgente_title", "Solicitud urgente")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("bur_urgente_warning", "Al marcar esta solicitud como URGENTE, se enviará una notificación y correo electrónico al aprobador cada 2 horas hasta que sea procesada.")}
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, fontWeight: 600 }}>
            {t("bur_urgente_confirm", "¿Estás seguro de continuar?")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setShowUrgentWarning(false)}
            sx={{ textTransform: "uppercase", color: "text.secondary", borderColor: "divider" }}
          >
            {t("common_cancelar", "Cancelar")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmUrgent}
            sx={{ textTransform: "uppercase" }}
          >
            {t("bur_urgente_enviar", "Enviar como urgente")}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
