import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { fetchCsrfToken } from "../services/csrf";
import { useI18n } from "../context/i18n";
import logo from "../assets/spm-logo.svg";

// MUI Components
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import SvgIcon from "@mui/material/SvgIcon";
import { styled } from "@mui/material/styles";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

// Styled Components
const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "100dvh",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
  },
}));

// Google Icon Component
function GoogleIcon() {
  return (
    <SvgIcon>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15.68 8.18182C15.68 7.61455 15.6291 7.06909 15.5345 6.54545H8V9.64364H12.3055C12.1164 10.64 11.5491 11.4836 10.6982 12.0509V14.0655H13.2945C14.8073 12.6691 15.68 10.6182 15.68 8.18182Z"
          fill="#4285F4"
        />
        <path
          d="M8 16C10.16 16 11.9709 15.2873 13.2945 14.0655L10.6982 12.0509C9.98545 12.5309 9.07636 12.8218 8 12.8218C5.92 12.8218 4.15273 11.4182 3.52 9.52727H0.858182V11.5927C2.17455 14.2036 4.87273 16 8 16Z"
          fill="#34A853"
        />
        <path
          d="M3.52 9.52C3.36 9.04 3.26545 8.53091 3.26545 8C3.26545 7.46909 3.36 6.96 3.52 6.48V4.41455H0.858182C0.312727 5.49091 0 6.70545 0 8C0 9.29455 0.312727 10.5091 0.858182 11.5855L2.93091 9.97091L3.52 9.52Z"
          fill="#FBBC05"
        />
        <path
          d="M8 3.18545C9.17818 3.18545 10.2255 3.59273 11.0618 4.37818L13.3527 2.08727C11.9636 0.792727 10.16 0 8 0C4.87273 0 2.17455 1.79636 0.858182 4.41455L3.52 6.48C4.15273 4.58909 5.92 3.18545 8 3.18545Z"
          fill="#EA4335"
        />
      </svg>
    </SvgIcon>
  );
}

// Forgot Password Dialog Component
function ForgotPasswordDialog({ open, handleClose, t }) {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setFeedback(
      t(
        "login_recover_info",
        "Si el correo está registrado, enviaremos un enlace para restablecer la contraseña."
      )
    );
    setTimeout(() => {
      setEmail("");
      setFeedback("");
      handleClose();
    }, 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit,
          sx: { backgroundImage: "none" },
        },
      }}
    >
      <DialogTitle>{t("login_recover_title", "Recuperar contraseña")}</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}
      >
        <DialogContentText>
          {t(
            "login_recover_desc",
            "Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña."
          )}
        </DialogContentText>
        {feedback && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {feedback}
          </Alert>
        )}
        <OutlinedInput
          autoFocus
          required
          margin="dense"
          id="recover-email"
          name="email"
          placeholder={t("login_email_placeholder", "correo@empresa.com")}
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </DialogContent>
      <DialogActions sx={{ pb: 3, px: 3 }}>
        <Button onClick={handleClose}>{t("login_cancel", "Cancelar")}</Button>
        <Button variant="contained" type="submit">
          {t("login_send_link", "Enviar")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Register Dialog Component
function RegisterDialog({ open, handleClose, t, onRegister, isSubmitting, registerError }) {
  const [formData, setFormData] = useState({ email: "", nombre: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onRegister(formData);
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit,
          sx: { backgroundImage: "none", minWidth: 400 },
        },
      }}
    >
      <DialogTitle>{t("login_register_title", "Crear cuenta")}</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}
      >
        {registerError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {registerError}
          </Alert>
        )}
        <FormControl>
          <FormLabel htmlFor="register-email">
            {t("login_email_label", "Correo electrónico")}
          </FormLabel>
          <TextField
            id="register-email"
            type="email"
            name="email"
            placeholder={t("login_email_placeholder", "correo@empresa.com")}
            autoComplete="email"
            required
            fullWidth
            variant="outlined"
            size="small"
            value={formData.email}
            onChange={handleChange("email")}
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="register-name">
            {t("login_name", "Nombre completo")}
          </FormLabel>
          <TextField
            id="register-name"
            type="text"
            name="nombre"
            placeholder="Juan Pérez"
            autoComplete="name"
            required
            fullWidth
            variant="outlined"
            size="small"
            value={formData.nombre}
            onChange={handleChange("nombre")}
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="register-password">
            {t("login_pass_label", "Contraseña")}
          </FormLabel>
          <OutlinedInput
            id="register-password"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            fullWidth
            size="small"
            value={formData.password}
            onChange={handleChange("password")}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ pb: 3, px: 3 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          {t("login_cancel", "Cancelar")}
        </Button>
        <Button variant="contained" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("register_loading", "Creando cuenta...")
            : t("login_register", "Crear cuenta")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Main Login Component
export default function Login() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError, user } = useAuthStore();
  const { t } = useI18n();

  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openForgotPassword, setOpenForgotPassword] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const validateInputs = () => {
    const identifier = document.getElementById("email");
    const password = document.getElementById("password");

    let isValid = true;

    // Validar: debe ser email válido O número de ID (solo dígitos)
    const isEmail = /\S+@\S+\.\S+/.test(identifier.value);
    const isNumericId = /^\d+$/.test(identifier.value);

    if (!identifier.value || (!isEmail && !isNumericId)) {
      setEmailError(true);
      setEmailErrorMessage(
        t("login_error_identifier", "Ingresa un correo electrónico o número de ID válido.")
      );
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage(
        t("login_error_password", "La contraseña debe tener al menos 6 caracteres.")
      );
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();

    if (!validateInputs()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = data.get("email");
    const password = data.get("password");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setEmailError(true);
      setEmailErrorMessage(error || t("login_error_default", "Error en el login"));
    }
  };

  const handleRegister = async (formData) => {
    setRegisterError("");
    clearError();

    if (!formData.email || !formData.nombre || !formData.password) {
      setRegisterError(t("register_error_required", "Todos los campos son obligatorios"));
      return;
    }

    try {
      setIsSubmitting(true);
      await register(formData);
      setOpenRegister(false);
      navigate("/dashboard");
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.message ||
        t("register_error_default", "Error al crear la cuenta");
      setRegisterError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          {/* Logo SPM */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 1 }}>
            <img src={logo} alt="SPM" style={{ height: 64, width: "auto", marginBottom: 8 }} />
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              SPM
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema de Planificación de Materiales
            </Typography>
          </Box>

          <Typography
            component="h2"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(1.5rem, 8vw, 1.75rem)", textAlign: "center" }}
          >
            {t("login_title", "Iniciar sesión")}
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email">
                {t("login_user_label", "Correo o ID de empleado")}
              </FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="text"
                name="email"
                placeholder={t("login_identifier_placeholder", "correo@empresa.com o 12345")}
                autoComplete="username"
                autoFocus
                required
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="password">
                {t("login_pass_label", "Contraseña")}
              </FormLabel>
              <OutlinedInput
                error={passwordError}
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••"
                autoComplete="current-password"
                required
                fullWidth
                color={passwordError ? "error" : "primary"}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {passwordError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {passwordErrorMessage}
                </Typography>
              )}
            </FormControl>
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label={t("login_remember", "Recordarme")}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
            >
              {isLoading
                ? t("login_loading", "Ingresando...")
                : t("login_submit", "Ingresar")}
            </Button>
            <Link
              component="button"
              type="button"
              onClick={() => setOpenForgotPassword(true)}
              variant="body2"
              sx={{ alignSelf: "center" }}
            >
              {t("login_recover", "¿Olvidaste tu contraseña?")}
            </Link>
          </Box>
          <Divider>{t("login_or", "o")}</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => alert("Iniciar sesión con Google")}
              startIcon={<GoogleIcon />}
            >
              {t("login_google", "Iniciar sesión con Google")}
            </Button>
            <Typography sx={{ textAlign: "center" }}>
              {t("login_no_account", "¿No tienes una cuenta?")}{" "}
              <Link
                component="button"
                type="button"
                onClick={() => setOpenRegister(true)}
                variant="body2"
                sx={{ alignSelf: "center" }}
              >
                {t("login_register", "Crear cuenta")}
              </Link>
            </Typography>
          </Box>
        </Card>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: "center", mt: 2 }}
        >
          © 2025 Sistema SPM. Todos los derechos reservados.
        </Typography>
      </SignInContainer>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={openForgotPassword}
        handleClose={() => setOpenForgotPassword(false)}
        t={t}
      />

      {/* Register Dialog */}
      <RegisterDialog
        open={openRegister}
        handleClose={() => setOpenRegister(false)}
        t={t}
        onRegister={handleRegister}
        isSubmitting={isSubmitting}
        registerError={registerError}
      />
    </>
  );
}
