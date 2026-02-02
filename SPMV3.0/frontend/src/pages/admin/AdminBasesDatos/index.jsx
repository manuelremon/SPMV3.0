/**
 * AdminBasesDatos - Administracion de Bases de Datos
 * Permite ver estado, explorar tablas, optimizar, exportar y CRUD de registros
 *
 * Modularizado en componentes separados (Sprint 23):
 * - useAdminDatabase.js: Hook con toda la logica de datos
 * - OverviewTab.jsx: Vista general de BDs
 * - TablesTab.jsx: Explorador de tablas
 * - ToolsTab.jsx: Herramientas de administracion
 * - DatabaseModals.jsx: Todos los modales
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../context/i18n";
import { ImportExcelModal } from "../../../components/admin/ImportExcelModal";
import { TempDataBanner } from "../../../components/ui/TempDataBanner";

// MUI Components
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Componentes modulares
import { useAdminDatabase } from "./useAdminDatabase";
import { OverviewTab } from "./OverviewTab";
import { TablesTab } from "./TablesTab";
import { ToolsTab } from "./ToolsTab";
import {
  StructureModal,
  PreviewModal,
  CrudFormModal,
  DeleteModal,
  StatsModal,
  AuditModal,
  ConnectionsModal,
} from "./DatabaseModals";

export default function AdminBasesDatos() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Hook centralizado con toda la logica
  const db = useAdminDatabase();

  // Estados de modales
  const [structureModal, setStructureModal] = useState({ open: false });
  const [previewModal, setPreviewModal] = useState({ open: false });
  const [addModal, setAddModal] = useState({ open: false });
  const [editModal, setEditModal] = useState({ open: false, row: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, row: null });
  const [statsModal, setStatsModal] = useState({ open: false, table: null });
  const [auditModal, setAuditModal] = useState({ open: false });
  const [connectionsModal, setConnectionsModal] = useState({ open: false });
  const [importExcelModal, setImportExcelModal] = useState(false);
  const [tempModeActive, setTempModeActive] = useState(false);

  // Estado del formulario CRUD
  const [formData, setFormData] = useState({});

  // Cargar tablas cuando cambia el tab o la BD
  useEffect(() => {
    if (activeTab === 1) {
      db.loadTables(db.selectedDb);
    }
  }, [activeTab, db.selectedDb]);

  // Handlers para modales
  const handleViewStructure = async (tableName) => {
    const data = await db.loadTableStructure(tableName);
    if (data) setStructureModal({ open: true });
  };

  const handleViewData = async (tableName) => {
    const data = await db.loadTablePreview(tableName);
    if (data) setPreviewModal({ open: true });
  };

  const handleOpenAdd = () => {
    if (db.isReadOnly) {
      db.setError("Esta tabla es de solo lectura");
      return;
    }
    const initialData = {};
    db.tableColumns.forEach(col => {
      if (!col.is_pk && !col.is_auto && col.editable) {
        initialData[col.name] = col.default || "";
      }
    });
    setFormData(initialData);
    setAddModal({ open: true });
  };

  const handleOpenEdit = (row) => {
    if (db.isReadOnly) {
      db.setError("Esta tabla es de solo lectura");
      return;
    }
    const editData = {};
    db.tableColumns.forEach(col => {
      if (col.editable) {
        editData[col.name] = row[col.name] ?? "";
      }
    });
    setFormData(editData);
    setEditModal({ open: true, row });
  };

  const handleOpenDelete = (row) => {
    if (db.isReadOnly) {
      db.setError("Esta tabla es de solo lectura");
      return;
    }
    setDeleteModal({ open: true, row });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const success = await db.createRecord(db.selectedTable, formData);
    if (success) {
      setAddModal({ open: false });
      db.loadTablePreview(db.selectedTable);
    }
  };

  const handleUpdate = async () => {
    const pkData = {};
    db.tablePk.forEach(pkCol => {
      pkData[pkCol] = editModal.row[pkCol];
    });
    const success = await db.updateRecord(db.selectedTable, pkData, formData);
    if (success) {
      setEditModal({ open: false, row: null });
      db.loadTablePreview(db.selectedTable);
    }
  };

  const handleDelete = async (softDelete = false) => {
    const pkData = {};
    db.tablePk.forEach(pkCol => {
      pkData[pkCol] = deleteModal.row[pkCol];
    });
    const success = await db.deleteRecord(db.selectedTable, pkData, softDelete);
    if (success) {
      setDeleteModal({ open: false, row: null });
      db.loadTablePreview(db.selectedTable);
    }
  };

  const handleLoadTableStats = async (tableName) => {
    const data = await db.loadTableStats(tableName);
    if (data) setStatsModal({ open: true, table: tableName });
  };

  const handleLoadAuditLogs = async () => {
    const data = await db.loadAuditLogs();
    if (data) setAuditModal({ open: true });
  };

  const handleLoadConnections = async () => {
    const data = await db.loadConnections();
    if (data) setConnectionsModal({ open: true });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth={false} sx={{ py: 2, px: "75px" }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ color: "#606d80" }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "#1f1f20", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("admin_bases_datos", "BASES DE DATOS")}
          </Typography>
          <Typography variant="body2" sx={{ color: "#606d80" }}>
            {db.isProduction ? "PostgreSQL (Producción)" : "SQLite (Desarrollo)"}
          </Typography>
        </Box>
      </Box>

      {/* Alertas */}
      {db.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => db.setError("")}>
          {db.error}
        </Alert>
      )}
      {db.success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={db.clearMessages}>
          {db.success}
        </Alert>
      )}

      {/* Banner de Modo Temporal */}
      <TempDataBanner onStatusChange={setTempModeActive} />

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, border: "1px solid #dce0e6", borderRadius: 2, overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="standard"
          sx={{
            minHeight: 48,
            bgcolor: "#ffffff",
            borderBottom: "1px solid #dce0e6",
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#606d80",
              "&.Mui-selected": { color: "#1976d2" },
            },
            "& .MuiTabs-indicator": { bgcolor: "#1976d2", height: 3 },
          }}
        >
          <Tab label={t("db_overview", "Vista General")} disableRipple />
          <Tab label={t("db_tables", "Tablas")} disableRipple />
          <Tab label={t("db_tools", "Herramientas")} disableRipple />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <OverviewTab
              loading={db.loading}
              databases={db.databases}
              poolStats={db.poolStats}
              onRefresh={db.loadOverview}
            />
          )}

          {activeTab === 1 && (
            <TablesTab
              loading={db.loading}
              databases={db.databases}
              selectedDb={db.selectedDb}
              onDbChange={db.setSelectedDb}
              tables={db.tables}
              onRefresh={() => db.loadTables(db.selectedDb)}
              onViewStructure={handleViewStructure}
              onViewData={handleViewData}
              onExportCsv={db.exportTableCsv}
            />
          )}

          {activeTab === 2 && (
            <ToolsTab
              databases={db.databases}
              selectedDb={db.selectedDb}
              onDbChange={db.setSelectedDb}
              tables={db.tables}
              selectedTable={db.selectedTable}
              onTableChange={db.setSelectedTable}
              isPostgres={db.isPostgres}
              isProduction={db.isProduction}
              operationLoading={db.operationLoading}
              integrityResult={db.integrityResult}
              poolStats={db.poolStats}
              tempModeActive={tempModeActive}
              onRunOperation={db.runOperation}
              onIntegrityCheck={db.runIntegrityCheck}
              onDownloadDatabase={db.downloadDatabase}
              onLoadTableStats={handleLoadTableStats}
              onLoadAuditLogs={handleLoadAuditLogs}
              onLoadConnections={handleLoadConnections}
              onOpenImportModal={() => setImportExcelModal(true)}
            />
          )}
        </Box>
      </Paper>

      {/* Modales */}
      <StructureModal
        isOpen={structureModal.open}
        onClose={() => setStructureModal({ open: false })}
        tableStructure={db.tableStructure}
      />

      <PreviewModal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false })}
        tablePreview={db.tablePreview}
        isReadOnly={db.isReadOnly}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      <CrudFormModal
        isOpen={addModal.open}
        onClose={() => setAddModal({ open: false })}
        title={`Agregar registro a ${db.selectedTable}`}
        tableColumns={db.tableColumns}
        tablePk={db.tablePk}
        formData={formData}
        loading={db.crudLoading}
        onFormChange={handleFormChange}
        onSubmit={handleCreate}
        isEdit={false}
      />

      <CrudFormModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, row: null })}
        title={`Editar registro de ${db.selectedTable}`}
        tableColumns={db.tableColumns}
        tablePk={db.tablePk}
        formData={formData}
        editRow={editModal.row}
        loading={db.crudLoading}
        onFormChange={handleFormChange}
        onSubmit={handleUpdate}
        isEdit={true}
      />

      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, row: null })}
        row={deleteModal.row}
        loading={db.crudLoading}
        onDelete={() => handleDelete(false)}
        onSoftDelete={() => handleDelete(true)}
      />

      <StatsModal
        isOpen={statsModal.open}
        onClose={() => setStatsModal({ open: false, table: null })}
        tableName={statsModal.table}
        tableStats={db.tableStats}
      />

      <AuditModal
        isOpen={auditModal.open}
        onClose={() => setAuditModal({ open: false })}
        auditLogs={db.auditLogs}
      />

      <ConnectionsModal
        isOpen={connectionsModal.open}
        onClose={() => setConnectionsModal({ open: false })}
        connections={db.connections}
      />

      <ImportExcelModal
        isOpen={importExcelModal}
        onClose={() => setImportExcelModal(false)}
        onSuccess={() => {
          setTempModeActive(true);
          setImportExcelModal(false);
        }}
      />
    </Container>
  );
}
