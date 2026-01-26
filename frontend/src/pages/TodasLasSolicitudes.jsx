import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "../components/ui/Card";
import { ModernDataTable as DataTable } from "../components/features/DataTable";
import { TableSkeleton } from "../components/ui/Skeleton";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/Tabs";
import { solicitudes } from "../services/spm";
import { CheckCircle, Plus, ArrowLeft } from "../components/ui/Icons";
import { useI18n } from "../context/i18n";
import { useAuthStore } from "../store/authStore";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { getTableColumns } from "./DashboardShared";
import { Button } from "../components/ui/Button";

export default function TodasLasSolicitudes() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  // Obtener tab inicial de la URL
  const initialTab = searchParams.get("tab") || "todas";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState({
    todas: 0,
    pendientes: 0,
    en_proceso: 0,
    completadas: 0,
    rechazadas: 0,
    cerradas: 0,
  });
  const [allData, setAllData] = useState({
    todas: [],
    pendientes: [],
    en_proceso: [],
    completadas: [],
    rechazadas: [],
    cerradas: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch solicitudes
  useEffect(() => {
    setLoading(true);

    // Buscar TODAS las solicitudes con page_size grande
    const todasCall = solicitudes.listar({ page_size: 500 }).catch(() => null);
    const pendientesCall = solicitudes.listar({ estado: "submitted", page_size: 500 }).catch(() => null);
    const enProcesoCall = solicitudes.listar({ estado: "processing", page_size: 500 }).catch(() => null);
    const completadasCall = solicitudes.listar({ estado: "approved", page_size: 500 }).catch(() => null);
    const rechazadasCall = solicitudes.listar({ estado: "rejected", page_size: 500 }).catch(() => null);
    const cerradasCall = solicitudes.listar({ estado: "closed", page_size: 500 }).catch(() => null);

    Promise.all([todasCall, pendientesCall, enProcesoCall, completadasCall, rechazadasCall, cerradasCall])
      .then(([todasRes, pendientesRes, enProcesoRes, completadasRes, rechazadasRes, cerradasRes]) => {
        const todasLista = todasRes?.data?.solicitudes || todasRes?.data?.items || [];
        const pendientesLista = pendientesRes?.data?.solicitudes || pendientesRes?.data?.items || [];
        const enProcesoLista = enProcesoRes?.data?.solicitudes || enProcesoRes?.data?.items || [];
        const completadasLista = completadasRes?.data?.solicitudes || completadasRes?.data?.items || [];
        const rechazadasLista = rechazadasRes?.data?.solicitudes || rechazadasRes?.data?.items || [];
        const cerradasLista = cerradasRes?.data?.solicitudes || cerradasRes?.data?.items || [];

        // Ordenar todas por fecha descendente
        todasLista.sort((a, b) => new Date(b.fecha_creacion || b.created_at || 0) - new Date(a.fecha_creacion || a.created_at || 0));

        setStats({
          todas: todasLista.length,
          pendientes: pendientesLista.length,
          en_proceso: enProcesoLista.length,
          completadas: completadasLista.length,
          rechazadas: rechazadasLista.length,
          cerradas: cerradasLista.length,
        });

        setAllData({
          todas: todasLista,
          pendientes: pendientesLista,
          en_proceso: enProcesoLista,
          completadas: completadasLista,
          rechazadas: rechazadasLista,
          cerradas: cerradasLista,
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const columns = useMemo(() => getTableColumns(t), [t]);

  const tabs = [
    { key: "todas", label: t("dash_todas", "Todas"), count: stats.todas },
    { key: "pendientes", label: t("dash_pendientes", "Pendientes"), count: stats.pendientes },
    { key: "en_proceso", label: t("dash_en_proceso", "En Proceso"), count: stats.en_proceso },
    { key: "completadas", label: t("dash_completadas", "Aprobadas"), count: stats.completadas },
    { key: "rechazadas", label: t("dash_rechazadas", "Rechazadas"), count: stats.rechazadas },
    { key: "cerradas", label: t("dash_cerradas", "Cerradas"), count: stats.cerradas },
    { key: "crear", label: t("btn_crear_solicitud", "+ Crear Solicitud"), isAction: true },
  ];

  const currentData = allData[activeTab] || [];

  const handleTabChange = (value) => {
    if (value === "crear") {
      navigate("/solicitudes/nueva");
    } else {
      setActiveTab(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 uppercase">Todas las Solicitudes</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              sx={tab.isAction ? { color: '#2196f3', fontWeight: 600 } : undefined}
            >
              {tab.isAction ? tab.label : `${tab.label} (${tab.count})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            {loading ? (
              <TableSkeleton rows={10} columns={7} />
            ) : currentData.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4 opacity-60" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {activeTab === "pendientes"
                    ? t("dash_no_pending", "No hay solicitudes pendientes de revision")
                    : t("dash_no_requests_category", "No hay solicitudes en esta categoria")}
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                rows={currentData}
                emptyMessage={t("dash_no_requests", "No hay solicitudes")}
                onRowClick={(row) => navigate(`/solicitudes/${row.id}`)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
