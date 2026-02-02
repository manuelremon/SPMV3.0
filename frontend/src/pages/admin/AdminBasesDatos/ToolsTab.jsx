/**
 * ToolsTab - Herramientas de administracion de BD
 */

import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ListIcon from "@mui/icons-material/List";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ShieldIcon from "@mui/icons-material/Shield";
import StorageIcon from "@mui/icons-material/Storage";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import HistoryIcon from "@mui/icons-material/History";
import PeopleIcon from "@mui/icons-material/People";
import UploadIcon from "@mui/icons-material/Upload";
import { useI18n } from "../../../context/i18n";

export function ToolsTab({
  databases,
  selectedDb,
  onDbChange,
  tables,
  selectedTable,
  onTableChange,
  isPostgres,
  isProduction,
  operationLoading,
  integrityResult,
  poolStats,
  tempModeActive,
  onRunOperation,
  onIntegrityCheck,
  onDownloadDatabase,
  onLoadTableStats,
  onLoadAuditLogs,
  onLoadConnections,
  onOpenImportModal,
}) {
  const { t } = useI18n();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="db-select-label">{t("db_select", "Base de datos")}</InputLabel>
          <Select
            labelId="db-select-label"
            value={selectedDb}
            onChange={(e) => onDbChange(e.target.value)}
            label={t("db_select", "Base de datos")}
          >
            {databases.map((db) => (
              <MenuItem key={db.name} value={db.name}>
                {db.name} ({db.type === "postgresql" ? "PostgreSQL" : "SQLite"})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {/* Optimizar */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <FlashOnIcon sx={{ fontSize: 20, color: "warning.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Optimizar
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isPostgres ? "VACUUM ANALYZE" : "Indices + ANALYZE + VACUUM"}
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={() => onRunOperation("optimize", "BD optimizada")}
              disabled={operationLoading}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <FlashOnIcon />}
            >
              Ejecutar Optimizacion
            </Button>
          </Box>
        </Paper>

        {/* VACUUM */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <StorageIcon sx={{ fontSize: 20, color: "info.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                VACUUM
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Compactar y liberar espacio
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={() => onRunOperation("vacuum", "VACUUM completado")}
              disabled={operationLoading}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <StorageIcon />}
            >
              Ejecutar VACUUM
            </Button>
          </Box>
        </Paper>

        {/* ANALYZE */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <AccessTimeIcon sx={{ fontSize: 20, color: "success.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                ANALYZE
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Actualizar estadisticas de tablas
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={() => onRunOperation("analyze", "ANALYZE completado")}
              disabled={operationLoading}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <AccessTimeIcon />}
            >
              Ejecutar ANALYZE
            </Button>
          </Box>
        </Paper>

        {/* Crear Indices */}
        <Paper elevation={1} sx={{ p: 0, opacity: isPostgres ? 0.6 : 1 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <ListIcon sx={{ fontSize: 20, color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Crear Indices
              </Typography>
              <Chip label="SQLite" size="small" color="warning" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Indices recomendados para rendimiento
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={() => onRunOperation("create-indexes", "Indices creados")}
              disabled={operationLoading || isPostgres}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <ListIcon />}
            >
              Crear Indices
            </Button>
            {isPostgres && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                No disponible para PostgreSQL
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Verificar Integridad */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <ShieldIcon sx={{ fontSize: 20, color: "error.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Verificar Integridad
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isPostgres ? "Indices invalidos y fragmentacion" : "PRAGMA integrity_check"}
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={onIntegrityCheck}
              disabled={operationLoading}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <ShieldIcon />}
            >
              Verificar
            </Button>
            {integrityResult && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: integrityResult.integrity_ok ? "success.lighter" : "error.lighter",
                  border: 1,
                  borderColor: integrityResult.integrity_ok ? "success.light" : "error.light",
                }}
              >
                <Stack direction="row" alignItems="center" gap={1}>
                  {integrityResult.integrity_ok ? (
                    <CheckCircleIcon sx={{ fontSize: 20, color: "success.main" }} />
                  ) : (
                    <CancelIcon sx={{ fontSize: 20, color: "error.main" }} />
                  )}
                  <Typography variant="body2" fontWeight={500}>
                    {integrityResult.integrity_ok ? "BD Integra" : "Problemas detectados"}
                  </Typography>
                </Stack>
                {integrityResult.foreign_key_issues > 0 && (
                  <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                    {integrityResult.foreign_key_issues} problemas de FK
                  </Typography>
                )}
                {integrityResult.bloated_tables?.length > 0 && (
                  <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                    {integrityResult.bloated_tables.length} tablas con fragmentacion
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Descargar Backup */}
        <Paper elevation={1} sx={{ p: 0, opacity: isPostgres ? 0.6 : 1 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <DownloadIcon sx={{ fontSize: 20, color: "info.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Backup
              </Typography>
              <Chip label="SQLite" size="small" color="warning" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Descargar copia de la BD
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={onDownloadDatabase}
              disabled={isPostgres}
              fullWidth
              startIcon={<DownloadIcon />}
            >
              Descargar {selectedDb}.db
            </Button>
            {isPostgres && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                Use pg_dump para PostgreSQL
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Estadisticas de Tabla */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <BarChartIcon sx={{ fontSize: 20, color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Estadisticas
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ver tamaño, filas e indices de una tabla
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" gap={1}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <Select
                  value={selectedTable || ""}
                  onChange={(e) => onTableChange(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Seleccionar tabla...</MenuItem>
                  {tables.map((t) => (
                    <MenuItem key={t.name} value={t.name}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={() => selectedTable && onLoadTableStats(selectedTable)}
                disabled={operationLoading || !selectedTable}
              >
                <BarChartIcon />
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Audit Logs */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <HistoryIcon sx={{ fontSize: 20, color: "warning.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Audit Log
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ver historial de operaciones CRUD
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={onLoadAuditLogs}
              disabled={operationLoading}
              fullWidth
              startIcon={<HistoryIcon />}
            >
              Ver Ultimos 7 dias
            </Button>
          </Box>
        </Paper>

        {/* Conexiones Activas */}
        <Paper elevation={1} sx={{ p: 0, opacity: !isPostgres ? 0.6 : 1 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <PeopleIcon sx={{ fontSize: 20, color: "info.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Conexiones
              </Typography>
              <Chip label="PostgreSQL" size="small" color="info" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Ver conexiones activas
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Button
              variant="outlined"
              onClick={onLoadConnections}
              disabled={operationLoading || !isPostgres}
              fullWidth
              startIcon={operationLoading ? <CircularProgress size={16} color="inherit" /> : <PeopleIcon />}
            >
              Ver Conexiones
            </Button>
            {!isPostgres && (
              <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                Solo disponible para PostgreSQL
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Pool Stats */}
        <Paper elevation={1} sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <ShowChartIcon sx={{ fontSize: 20, color: "success.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Pool Stats
              </Typography>
              <Chip label="All DBs" size="small" color="success" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Estadisticas del pool de conexiones
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            {poolStats ? (
              <Stack spacing={1}>
                {Object.entries(poolStats).map(([pool, stats]) => (
                  <Box key={pool} sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      {pool}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Activas: {stats.active || 0} | Idle: {stats.idle || 0}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Cargando...
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Importar Datos Temporales */}
        <Paper
          elevation={1}
          sx={{
            p: 0,
            border: 1,
            borderColor: "warning.light",
            background: "linear-gradient(to bottom right, rgba(237, 108, 2, 0.05), rgba(255, 152, 0, 0.05))",
          }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <UploadIcon sx={{ fontSize: 20, color: "warning.main" }} />
              <Typography variant="subtitle1" fontWeight={600}>
                Datos Temporales
              </Typography>
              <Chip label="MRP/Forecast" size="small" color="warning" sx={{ ml: "auto", fontSize: "0.75rem" }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Importar Excel para operar MRP y Forecast con datos temporales
            </Typography>
          </Box>
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Permite trabajar con datos importados desde Excel sin afectar las bases de datos del sistema. Ideal para
              pruebas y analisis.
            </Typography>
            <Button
              variant="contained"
              color="warning"
              onClick={onOpenImportModal}
              disabled={tempModeActive}
              fullWidth
              startIcon={<UploadIcon />}
            >
              {tempModeActive ? "Modo Temporal Activo" : "Importar Excel"}
            </Button>
            {tempModeActive && (
              <Typography variant="caption" color="warning.main" sx={{ textAlign: "center" }}>
                Desactive el modo temporal desde el banner superior para importar nuevos datos
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {isProduction && (
        <Alert severity="info" icon={<WarningAmberIcon />} sx={{ mt: 2 }}>
          PostgreSQL en produccion: Algunas operaciones (VACUUM, Optimize) funcionan pero requieren permisos adecuados.
        </Alert>
      )}
    </Box>
  );
}
