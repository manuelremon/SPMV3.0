/**
 * AnalisisPuntualMRP - MRP con datos temporales
 *
 * Muestra el tablero de alertas MRP utilizando datos importados desde Excel.
 * Reutiliza la logica de MRPTableroAlertas pero fuerza el uso de datos temporales.
 */

import React, { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import { TempDataBanner } from '../../components/ui/TempDataBanner'
import { useI18n } from '../../context/i18n'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Grid
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InventoryIcon from '@mui/icons-material/Inventory'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

export default function AnalisisPuntualMRP() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [tempActive, setTempActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [resumen, setResumen] = useState({})

  // Si no hay datos temporales, redirigir a home
  useEffect(() => {
    if (!tempActive) {
      navigate('/admin/analisis-puntual')
    }
  }, [tempActive, navigate])

  // Cargar alertas MRP con datos temporales
  const fetchAlertas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/mrp/alertas', {
        params: { use_temp_data: true, limit: 100 }
      })
      if (response.data.ok) {
        setAlertas(response.data.alertas || [])
        setResumen(response.data.resumen || {})
      } else {
        const errData = response.data.error
        setError(typeof errData === 'object' ? (errData?.message || 'Error') : (errData || 'Error al cargar alertas'))
      }
    } catch (err) {
      const errorData = err.response?.data?.error
      // Handle error object or string
      const errorMsg = typeof errorData === 'object'
        ? (errorData?.message || JSON.stringify(errorData))
        : (errorData || 'Error al cargar alertas MRP')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tempActive) {
      fetchAlertas()
    }
  }, [tempActive, fetchAlertas])

  const getEstadoColor = (estado) => {
    const estados = {
      'SIN_STOCK': 'error',
      'STOCK_CRITICO': 'warning',
      'BAJO_PUNTO_PEDIDO': 'warning',
      'BAJO_MINIMO': 'warning',
      'STOCK_EXCEDIDO': 'info',
      'OK': 'success',
    }
    return estados[estado] || 'default'
  }

  return (
    <Layout>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Banner siempre visible */}
        <TempDataBanner onStatusChange={setTempActive} />

        {/* Breadcrumb */}
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              variant="text"
              size="small"
              startIcon={<ChevronLeftIcon />}
              onClick={() => navigate('/admin/analisis-puntual')}
              sx={{ textTransform: 'none' }}
            >
              {t('admin_ap_volver', 'Analisis Puntual')}
            </Button>
            <Typography variant="body2" color="text.secondary">/</Typography>
            <Typography variant="body2" color="text.primary" fontWeight={500}>
              {t('admin_ap_mrp', 'MRP Temporal')}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={fetchAlertas}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Actualizar
          </Button>
        </Stack>

        {/* Header */}
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            MRP - Alertas con Datos Temporales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analisis de stock y alertas utilizando los datos del Excel importado
          </Typography>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Resumen Cards */}
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'grey.100' }}>
                      <InventoryIcon sx={{ fontSize: 20, color: 'grey.600' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="text.primary">
                        {resumen.total_materiales || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Materiales
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={6} md={3}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'error.light' }}>
                      <WarningAmberIcon sx={{ fontSize: 20, color: 'error.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="error.main">
                        {resumen.sin_stock || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sin Stock
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={6} md={3}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.light' }}>
                      <TrendingDownIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" color="warning.main">
                        {resumen.stock_critico || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stock Critico
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={6} md={3}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'warning.lighter' }}>
                      <WarningAmberIcon sx={{ fontSize: 20, color: 'warning.dark' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: 'warning.dark' }}>
                        {resumen.bajo_punto_pedido || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bajo Punto Pedido
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Tabla de Alertas */}
            <Paper elevation={1}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={600}>
                  Alertas de Stock ({alertas.length})
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {alertas.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 4 }}
                  >
                    No hay alertas de stock con los datos importados
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>Material</TableCell>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>Descripcion</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>Stock</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>Minimo</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500, color: 'text.secondary' }}>Pto Pedido</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 500, color: 'text.secondary' }}>Estado</TableCell>
                          <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>Centro</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {alertas.slice(0, 50).map((alerta, idx) => (
                          <TableRow
                            key={`${alerta.material}-${idx}`}
                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                              {alerta.material}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: 'text.secondary',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {alerta.descripcion}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 500, color: 'text.primary' }}>
                              {alerta.stock_actual?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>
                              {alerta.stock_minimo?.toLocaleString() || '-'}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>
                              {alerta.punto_pedido?.toLocaleString() || '-'}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={alerta.estado?.replace(/_/g, ' ') || 'N/A'}
                                color={getEstadoColor(alerta.estado)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>
                              {alerta.centro}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {alertas.length > 50 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: 'center', py: 2 }}
                      >
                        Mostrando 50 de {alertas.length} alertas
                      </Typography>
                    )}
                  </TableContainer>
                )}
              </Box>
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  )
}
