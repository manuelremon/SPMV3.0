/**
 * TablesTab - Explorador de tablas de BD
 */

import {
  Box,
  Paper,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Skeleton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import { useI18n } from "../../../context/i18n";

export function TablesTab({
  loading,
  databases,
  selectedDb,
  onDbChange,
  tables,
  onRefresh,
  onViewStructure,
  onViewData,
  onExportCsv,
}) {
  const { t } = useI18n();

  // Skeleton for loading state
  const TableSkeletonRows = () => (
    <>
      {Array.from({ length: 10 }).map((_, idx) => (
        <TableRow key={idx}>
          <TableCell>
            <Skeleton variant="text" width="60%" />
          </TableCell>
          <TableCell align="right">
            <Skeleton variant="text" width={60} sx={{ ml: "auto" }} />
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Skeleton variant="rectangular" width={90} height={32} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={90} height={32} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1 }} />
            </Stack>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="db-select-label">{t("db_select", "Base de datos")}</InputLabel>
          <Select
            labelId="db-select-label"
            value={selectedDb}
            label={t("db_select", "Base de datos")}
            onChange={(e) => onDbChange(e.target.value)}
          >
            {databases.map((db) => (
              <MenuItem key={db.name} value={db.name}>
                {db.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={onRefresh} disabled={loading} color="primary">
          <RefreshIcon
            sx={{
              animation: loading ? "spin 1s linear infinite" : "none",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          />
        </IconButton>
      </Stack>

      <TableContainer component={Paper} elevation={1}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "action.hover" }}>
              <TableCell
                sx={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                Tabla
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                Registros
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeletonRows />
            ) : (
              tables.map((table) => (
                <TableRow
                  key={table.name}
                  hover
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell
                    sx={{
                      fontFamily: "monospace",
                      color: "primary.main",
                    }}
                  >
                    {table.name}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontFamily: "monospace",
                    }}
                  >
                    {table.records.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<DescriptionIcon />}
                        onClick={() => onViewStructure(table.name)}
                      >
                        Estructura
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<SearchIcon />}
                        onClick={() => onViewData(table.name)}
                      >
                        Ver datos
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<DownloadIcon />}
                        onClick={() => onExportCsv(table.name)}
                      >
                        CSV
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
