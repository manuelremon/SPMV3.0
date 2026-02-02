/**
 * OverviewTab - Vista general de bases de datos
 * Migrated to Material UI
 */

import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import { useI18n } from "../../../context/i18n";
import { formatSize } from "./useAdminDatabase";

export function OverviewTab({
  loading,
  databases,
  poolStats,
  onRefresh,
}) {
  const { t } = useI18n();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Refresh Button */}
      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="text"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          {t("common_actualizar", "Actualizar")}
        </Button>
      </Stack>

      {/* Database Cards */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {databases.map((db) => (
            <Grid item xs={12} md={6} lg={3} key={db.name}>
              <Paper
                elevation={1}
                sx={{
                  '&:hover': { boxShadow: 3 },
                  transition: 'box-shadow 0.2s ease-in-out',
                }}
              >
                {/* Card Header */}
                <Box sx={{ p: 2, pb: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <StorageIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ textTransform: 'uppercase' }}
                      >
                        {db.name}
                      </Typography>
                    </Stack>
                    <Chip
                      label={db.status}
                      size="small"
                      color={db.status === "online" ? "success" : "error"}
                      variant="outlined"
                    />
                  </Stack>
                </Box>

                {/* Card Content */}
                <Box sx={{ p: 2, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Tipo
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {db.type}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Tamano
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {formatSize(db.size_mb)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Tablas
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {db.tables}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Registros
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {db.records?.toLocaleString() || "-"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Latencia
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {db.latency_ms} ms
                    </Typography>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pool Stats */}
      {poolStats && Object.keys(poolStats).length > 0 && (
        <Paper elevation={1}>
          {/* Pool Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <DnsIcon sx={{ fontSize: 20, color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                {t("db_pool_stats", "Pool de Conexiones")}
              </Typography>
            </Stack>
          </Box>

          {/* Pool Content */}
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {Object.entries(poolStats).map(([name, stats]) => (
                <Grid item xs={12} md={4} key={name}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="body2" fontWeight={500} color="text.primary">
                      {name}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Creadas: {stats.created || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Reutilizadas: {stats.reused || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Expiradas: {stats.expired || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Errores: {stats.errors || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
