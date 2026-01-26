import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { solicitudes } from '../services/spm'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../context/i18n'
import { FormSkeleton } from '../components/ui/Skeleton'
import { CloudUpload, Close, AttachFile, ArrowBack } from '@mui/icons-material'
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Box,
  Button,
  Divider,
  Alert,
  IconButton,
  CircularProgress,
} from '@mui/material'

function getDefaultNeedDate() {
  const d = new Date()
  d.setDate(d.getDate() + 120)
  return d.toISOString().slice(0, 10)
}

export default function CreateSolicitud() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useI18n()
  const [form, setForm] = useState({
    centro: '',
    sector: '',
    centro_costos: '',
    almacen_virtual: '',
    criticidad: 'Normal',
    fecha_necesidad: getDefaultNeedDate(),
    justificacion: '',
    archivos: [],
  })
  const [catalogos, setCatalogos] = useState({ centros: [], sectores: [], almacenes: [] })
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const token = useMemo(() => localStorage.getItem('token'), [])

  const loadFormCatalogsForNuevaSolicitud = async () => {
    setLoadingCatalogos(true)
    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

      let catalogosData = {}
      try {
        const resCatalogos = await api.get('/catalogos', { headers: authHeaders })
        catalogosData = resCatalogos.data || {}
      } catch (errCombined) {
        if (!errCombined.response) {
          throw errCombined
        }
        const [centrosRes, sectoresRes, almacenesRes] = await Promise.all([
          api.get('/catalogos/centros'),
          api.get('/catalogos/sectores'),
          api.get('/catalogos/almacenes'),
        ])
        catalogosData = {
          centros: centrosRes.data || [],
          sectores: sectoresRes.data || [],
          almacenes: almacenesRes.data || [],
        }
      }

      const acceso = await api.get('/auth/mi-acceso', { headers: authHeaders })
      const vista = acceso.data || {}
      const centrosPermitidos = vista.centros_permitidos || []
      const sectoresPermitidos = vista.sectores_permitidos || []
      const almacenesPermitidos = vista.almacenes_permitidos || []

      const hasAccessControlCentros = Array.isArray(centrosPermitidos) && centrosPermitidos.length > 0
      const hasAccessControlSectores = Array.isArray(sectoresPermitidos) && sectoresPermitidos.length > 0
      const hasAccessControlAlmacenes = Array.isArray(almacenesPermitidos) && almacenesPermitidos.length > 0

      const centrosFiltrados = (catalogosData.centros || []).filter(
        (c) => !hasAccessControlCentros || centrosPermitidos.includes(c.id)
      )
      const sectoresFiltrados = (catalogosData.sectores || []).filter(
        (s) => !hasAccessControlSectores || sectoresPermitidos.includes(s.id)
      )
      const almacenesFiltrados = (catalogosData.almacenes || []).filter(
        (a) => !hasAccessControlAlmacenes || almacenesPermitidos.includes(a.id)
      )

      setCatalogos({
        centros: centrosFiltrados,
        sectores: sectoresFiltrados,
        almacenes: almacenesFiltrados,
      })
    } catch (err) {
      console.error('Error catalogos:', err)
      setError('Error al cargar catalogos. Intenta recargar la pagina o reintenta en unos segundos.')
    } finally {
      setLoadingCatalogos(false)
    }
  }

  const preloadUserDataForNuevaSolicitud = async () => {
    try {
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await api.get('/auth/me', { headers: authHeaders })
      const currentUser = res.data?.user || {}

      setForm((prev) => {
        const next = { ...prev }
        if (currentUser.sector_id && catalogos.sectores.some((s) => s.id === currentUser.sector_id)) {
          next.sector = currentUser.sector_id
        }
        if (currentUser.centro_id && catalogos.centros.some((c) => c.id === currentUser.centro_id)) {
          next.centro = currentUser.centro_id
        }
        return next
      })
    } catch (err) {
      console.error('Error preload user:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      await loadFormCatalogsForNuevaSolicitud()
      await preloadUserDataForNuevaSolicitud()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChange = useCallback((e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }, [])

  const onSubmit = useCallback(async (e) => {
    e.preventDefault()
    setError('')

    // FIX 3.1: Validar fecha_necesidad >= hoy
    const today = new Date().toISOString().slice(0, 10)
    if (form.fecha_necesidad && form.fecha_necesidad < today) {
      setError(t('create_fecha_pasada', 'La fecha de necesidad no puede ser anterior a hoy'))
      return
    }

    setSubmitting(true)
    try {
      let res

      // Si hay archivos adjuntos, usar FormData (multipart/form-data)
      if (form.archivos && form.archivos.length > 0) {
        const formData = new FormData()
        formData.append('centro', form.centro)
        formData.append('sector', form.sector)
        formData.append('centro_costos', form.centro_costos)
        formData.append('almacen_virtual', form.almacen_virtual)
        formData.append('criticidad', form.criticidad)
        formData.append('fecha_necesidad', form.fecha_necesidad)
        formData.append('justificacion', form.justificacion)
        formData.append('usuario_id', user?.id || '')

        // Agregar cada archivo
        form.archivos.forEach((file) => {
          formData.append('archivos', file)
        })

        res = await solicitudes.crearConArchivos(formData)
      } else {
        // Sin archivos, usar JSON tradicional
        const payload = {
          centro: form.centro,
          sector: form.sector,
          centro_costos: form.centro_costos,
          almacen_virtual: form.almacen_virtual,
          criticidad: form.criticidad,
          fecha_necesidad: form.fecha_necesidad,
          justificacion: form.justificacion,
          usuario_id: user?.id,
        }
        res = await solicitudes.crear(payload)
      }

      const data = res.data
      const id = data.id || data.solicitud?.id
      if (!id) throw new Error(t('create_no_id', 'No se recibió id de solicitud'))
      navigate(`/solicitudes/${id}/materiales`)
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }, [form, user?.id, navigate, t])

  const handleCancel = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - form.archivos.length)
    if (files.length > 0) {
      setForm(prev => ({ ...prev, archivos: [...prev.archivos, ...files].slice(0, 5) }))
    }
    e.target.value = ''
  }

  const removeFile = (idx) => {
    setForm(prev => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== idx)
    }))
  }

  // Estilos para criticidad
  const getCriticidadColor = (value) => {
    switch (value) {
      case 'Alta': return '#ed6c02'
      case 'Critica': return '#d32f2f'
      default: return 'inherit'
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {/* Header fuera del Paper */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <ArrowBack />
          </IconButton>
          <Typography
            variant="h5"
            component="h1"
            fontWeight={700}
            color="text.primary"
            sx={{ textTransform: 'uppercase' }}
          >
            {t('create_title', 'Crear nueva solicitud')}
          </Typography>
        </Box>
      </Box>

      {/* Alerta de error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Formulario dentro de Paper */}
      <Paper elevation={2} sx={{ p: 3 }}>
        {loadingCatalogos ? (
          <FormSkeleton rows={6} />
        ) : (
          <form onSubmit={onSubmit}>
            {/* ═══════════════════════════════════════════════════════════════
                SECCIÓN 1: Datos de Ubicación
                ═══════════════════════════════════════════════════════════════ */}
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              {t('create_section_ubicacion', 'Datos de ubicación')}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  id="centro"
                  name="centro"
                  label={t('create_centro', 'Centro')}
                  value={form.centro}
                  onChange={onChange}
                  required
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                >
                  <MenuItem value="" disabled>
                    {t('create_select_centro', 'Selecciona un centro')}
                  </MenuItem>
                  {catalogos.centros.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.id} - {c.nombre || c.descripcion || ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  id="sector"
                  name="sector"
                  label={t('create_sector', 'Sector')}
                  value={form.sector}
                  onChange={onChange}
                  required
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                >
                  <MenuItem value="" disabled>
                    {t('create_select_sector', 'Selecciona un sector')}
                  </MenuItem>
                  {catalogos.sectores.map((s) => (
                    <MenuItem key={s.nombre} value={s.nombre}>
                      {s.nombre || s.descripcion || ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  id="almacen"
                  name="almacen_virtual"
                  label={t('create_almacen', 'Almacén')}
                  value={form.almacen_virtual}
                  onChange={onChange}
                  required
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                >
                  <MenuItem value="" disabled>
                    {t('create_select_almacen', 'Selecciona un almacén')}
                  </MenuItem>
                  {catalogos.almacenes.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.id} - {a.nombre || a.descripcion || ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ═══════════════════════════════════════════════════════════════
                SECCIÓN 2: Detalles de la Solicitud
                ═══════════════════════════════════════════════════════════════ */}
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              {t('create_section_detalles', 'Detalles de la solicitud')}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  id="centro_costos"
                  name="centro_costos"
                  label={t('create_centro_costos', 'Centro de costos')}
                  value={form.centro_costos}
                  onChange={onChange}
                  required
                  placeholder="Ej: CC001"
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  id="criticidad"
                  name="criticidad"
                  label={t('create_criticidad', 'Criticidad')}
                  value={form.criticidad}
                  onChange={onChange}
                  slotProps={{
                    inputLabel: { shrink: true },
                    select: {
                      sx: { color: getCriticidadColor(form.criticidad) }
                    }
                  }}
                >
                  <MenuItem value="Normal">{t('create_normal', 'Normal')}</MenuItem>
                  <MenuItem value="Alta" sx={{ color: '#ed6c02' }}>{t('create_alta', 'Alta')}</MenuItem>
                  <MenuItem value="Critica" sx={{ color: '#d32f2f' }}>{t('create_critica', 'Crítica')}</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  id="fecha_necesidad"
                  name="fecha_necesidad"
                  label={t('create_fecha', 'Fecha de necesidad')}
                  value={form.fecha_necesidad}
                  onChange={onChange}
                  required
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* ═══════════════════════════════════════════════════════════════
                SECCIÓN 3: Información Adicional
                ═══════════════════════════════════════════════════════════════ */}
            <Typography variant="h6" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
              {t('create_section_adicional', 'Información adicional')}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Justificación - 2/3 del espacio */}
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  id="justificacion"
                  name="justificacion"
                  label={t('create_justificacion', 'Justificación')}
                  value={form.justificacion}
                  onChange={onChange}
                  required
                  placeholder={t('create_justificacion_placeholder', 'Describe brevemente el motivo de la solicitud...')}
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Grid>

              {/* Dropzone de Archivos - 1/3 del espacio */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box
                  component="label"
                  htmlFor="file-upload"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 133, // Misma altura que el textarea de justificación
                    border: '2px dashed',
                    borderColor: form.archivos.length > 0 ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: form.archivos.length > 0 ? 'action.selected' : 'grey.50',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />

                  {form.archivos.length === 0 ? (
                    <>
                      <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {t('create_dropzone_text', 'Arrastra archivos o haz clic')}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {t('create_dropzone_hint', 'Máx. 5 archivos (PDF, DOC, XLS, IMG)')}
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ width: '100%', px: 1.5, py: 1, maxHeight: 120, overflow: 'auto' }}>
                      {form.archivos.map((file, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            mb: 0.5,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                            <AttachFile sx={{ fontSize: 16, color: 'primary.main' }} />
                            <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                              {file.name}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeFile(idx)
                            }}
                            sx={{
                              p: 0.25,
                              '&:hover': { color: 'error.main' }
                            }}
                          >
                            <Close sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ))}
                      {form.archivos.length < 5 && (
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                        >
                          + {t('create_add_more', 'Agregar más')}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* ═══════════════════════════════════════════════════════════════
                ACCIONES
                ═══════════════════════════════════════════════════════════════ */}
            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleCancel}
                sx={{
                  minWidth: 120,
                  color: 'text.secondary',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'text.secondary',
                    bgcolor: 'action.hover',
                  }
                }}
              >
                {t('common_cancelar', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ minWidth: 200 }}
              >
                {submitting
                  ? t('create_submitting', 'Creando...')
                  : t('create_btn', 'Crear y agregar materiales')}
              </Button>
            </Box>
          </form>
        )}
      </Paper>
    </Container>
  )
}
