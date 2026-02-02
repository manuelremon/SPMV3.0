/**
 * MaterialsTable - Table component for displaying added materials
 * Handles quantity editing, comments, and deletion
 *
 * Migrated to MUI (2026-02)
 */
import { useState } from 'react'
import { useI18n } from '../../context/i18n'
import { formatCurrency } from '../../utils/formatters'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import ChatIcon from '@mui/icons-material/Chat'
import DeleteIcon from '@mui/icons-material/Delete'
import { ConfirmModal } from '../ui/ConfirmModal'

export function MaterialsTable({
  items,
  onQtyChange,
  onDelete,
  onOpenComment,
}) {
  const { t } = useI18n()
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, codigo: null, descripcion: '' })

  const headerCellSx = {
    bgcolor: 'action.hover',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'text.secondary',
    textAlign: 'center',
    borderRight: 1,
    borderBottom: 2,
    borderColor: 'divider',
    py: 1.5,
    px: 2,
    '&:last-child': {
      borderRight: 0,
    },
  }

  const bodyCellSx = {
    py: 1.5,
    px: 2,
    verticalAlign: 'middle',
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ borderRadius: 2 }}
    >
      <Table size="small" role="table">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>
              {t('materials_col_codigo', 'Codigo')}
            </TableCell>
            <TableCell sx={headerCellSx}>
              {t('materials_col_descripcion', 'Descripcion')}
            </TableCell>
            <TableCell sx={headerCellSx}>
              {t('materials_col_unidad', 'Unidad')}
            </TableCell>
            <TableCell sx={{ ...headerCellSx, width: 80 }}>
              {t('materials_col_cantidad', 'Cant.')}
            </TableCell>
            <TableCell sx={headerCellSx}>
              {t('materials_col_precio', 'Precio USD')}
            </TableCell>
            <TableCell sx={headerCellSx}>
              {t('materials_col_subtotal', 'Subtotal')}
            </TableCell>
            <TableCell sx={{ ...headerCellSx, width: 48 }}>
              {t('materials_col_nota', 'Nota')}
            </TableCell>
            <TableCell sx={{ ...headerCellSx, width: 48, borderRight: 0 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}
              >
                {t('materials_sin_materiales', 'Sin materiales agregados')}
              </TableCell>
            </TableRow>
          )}
          {items.map((it, idx) => {
            const subtotal = (it.cantidad || 0) * (it.precio_unitario || 0)

            return (
              <TableRow
                key={it.codigo}
                sx={{
                  bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {it.codigo}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, color: 'text.primary' }}>
                  {it.descripcion}
                </TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {it.unidad || '-'}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                  <TextField
                    type="number"
                    inputProps={{ min: 1, step: 1 }}
                    value={it.cantidad || 0}
                    onChange={(e) => onQtyChange(it.codigo, e.target.value)}
                    size="small"
                    sx={{
                      width: 64,
                      '& .MuiInputBase-input': {
                        textAlign: 'center',
                        py: 0.75,
                        px: 1,
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: 'primary.main',
                          borderWidth: 2,
                        },
                      },
                    }}
                    aria-label={t('materials_cantidad_label', 'Cantidad del material')}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    color: 'text.primary',
                  }}
                >
                  {formatCurrency(it.precio_unitario || 0)}
                </TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'text.primary',
                  }}
                >
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                  <Tooltip title={it.comentario || t('materials_agregar_nota', 'Agregar nota')}>
                    <IconButton
                      size="small"
                      onClick={() => onOpenComment(it.codigo)}
                      color={it.comentario ? 'primary' : 'default'}
                      aria-label={`${t('materials_nota_label', 'Nota para')} ${it.codigo}`}
                      sx={{
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ChatIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, textAlign: 'center' }}>
                  <Tooltip title={t('materials_eliminar', 'Eliminar')}>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirm({ show: true, codigo: it.codigo, descripcion: it.descripcion })}
                      color="error"
                      aria-label={`${t('materials_eliminar', 'Eliminar')} ${it.codigo}`}
                      sx={{
                        '&:hover': {
                          bgcolor: 'error.lighter',
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Modal de confirmacion de eliminacion */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, codigo: null, descripcion: '' })}
        onConfirm={() => {
          onDelete(deleteConfirm.codigo)
          setDeleteConfirm({ show: false, codigo: null, descripcion: '' })
        }}
        title={t('materials_confirmar_eliminar', '¿Eliminar material?')}
        message={`${t('materials_confirmar_eliminar_msg', '¿Esta seguro que desea eliminar el material')} ${deleteConfirm.codigo} - ${deleteConfirm.descripcion}?`}
        confirmText={t('materials_eliminar', 'Eliminar')}
        cancelText={t('common_cancelar', 'Cancelar')}
        variant="danger"
      />
    </TableContainer>
  )
}
