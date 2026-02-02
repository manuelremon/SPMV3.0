"""
Rutas para búsqueda de materiales.

ACTUALIZACIÓN (Sprint 25): Busca en la tabla principal sap_materiales_bbdd
en PostgreSQL (producción) o SQLite (desarrollo) para traer materiales reales
en lugar de usar la BD separada catalogo_materiales.db que estaba con datos viejos.
"""

from flask import Blueprint, jsonify, request

from backend.core.db import get_db_connection

bp = Blueprint("materiales", __name__, url_prefix="/api/materiales")


def _fetch_materiales(query: str, params: tuple) -> list[dict]:
    """Ejecuta una query en la BD principal y retorna lista de diccionarios."""
    with get_db_connection() as conn:  # Usa BD principal (spm)
        cur = conn.cursor()
        cur.execute(query, params)
        rows = cur.fetchall()

    return [dict(row) for row in rows]


@bp.route("", methods=["GET"])
def search_materiales():
    """
    Búsqueda rápida de materiales por código o descripción desde BD principal.

    Busca en tabla sap_materiales_bbdd que contiene materiales reales de SAP.

    Query params:
        codigo: Buscar por código de material (parcial)
        descripcion: Buscar por descripción (parcial)
        limit: Máximo de resultados (default 500, max 500)

    Returns:
        Lista de materiales con: codigo_material, descripcion,
        grupo_articulos, unidad_medida, precio_usd
    """
    q_codigo = (request.args.get("codigo") or "").strip()
    q_desc = (request.args.get("descripcion") or "").strip()
    limit = min(request.args.get("limit", 500, type=int), 500)

    # Si no hay término de búsqueda, retornar vacío
    if not q_codigo and not q_desc:
        return jsonify({"ok": True, "data": [], "total": 0}), 200

    params = []
    search_conditions = []

    # Búsqueda en tabla sap_materiales_bbdd (BD principal)
    # UPPER() para búsqueda case-insensitive (compatible SQLite y PostgreSQL)
    if q_codigo:
        search_conditions.append("UPPER(codigo_material) LIKE UPPER(?)")
        params.append(f"%{q_codigo}%")
    if q_desc:
        search_conditions.append("UPPER(descripcion) LIKE UPPER(?)")
        params.append(f"%{q_desc}%")

    where_clause = "WHERE " + " OR ".join(search_conditions) if search_conditions else "WHERE 1=1"

    query = f"""
        SELECT
            codigo_material AS codigo,
            descripcion,
            descripcion AS descripcion_larga,
            '' AS grupo_articulos,
            '' AS unidad_medida,
            0 AS precio_usd
        FROM sap_materiales_bbdd
        {where_clause}
        ORDER BY codigo_material ASC
        LIMIT ?
    """
    params.append(limit)

    try:
        rows = _fetch_materiales(query, tuple(params))
        return jsonify({"ok": True, "data": rows, "total": len(rows)}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": {"code": "search_error", "message": str(e)}}), 500


@bp.route("/<codigo>", methods=["GET"])
def get_material(codigo: str):
    """
    Obtiene un material específico por su código desde BD principal.

    Returns:
        Material completo o 404 si no existe
    """
    query = """
        SELECT
            codigo_material AS codigo,
            descripcion,
            descripcion AS descripcion_larga,
            '' AS grupo_articulos,
            '' AS unidad_medida,
            0 AS precio_usd
        FROM sap_materiales_bbdd
        WHERE codigo_material = ?
    """

    try:
        rows = _fetch_materiales(query, (codigo,))

        if not rows:
            return (
                jsonify(
                    {"ok": False, "error": {"code": "not_found", "message": "Material no encontrado"}}
                ),
                404,
            )

        return jsonify({"ok": True, "data": rows[0]}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": {"code": "error", "message": str(e)}}), 500


@bp.route("/grupos", methods=["GET"])
def get_grupos():
    """
    Obtiene la lista de grupos de artículos únicos desde BD principal.

    Nota: Actualmente retorna lista vacía ya que tabla sap_materiales_bbdd
    no tiene columna grupo_articulo. Se puede agregar en futuros esquemas.

    Query params:
        q: Filtro de búsqueda parcial (opcional)
        limit: Máximo de resultados (default 100)

    Returns:
        Lista de grupos de artículos únicos (vacía por ahora)
    """
    # Por ahora retornar vacío - tabla sap_materiales_bbdd no tiene grupos
    # Esto se puede implementar cuando se agregue esa información a la BD
    return jsonify({"ok": True, "data": [], "total": 0}), 200


@bp.route("/stats", methods=["GET"])
def get_stats():
    """
    Obtiene estadísticas del catálogo de materiales desde BD principal.

    Returns:
        Conteo total de materiales en sap_materiales_bbdd
    """
    try:
        with get_db_connection() as conn:
            cur = conn.cursor()

            stats = {}

            # Helper para acceso compatible PostgreSQL (dict) y SQLite (tuple)
            def get_val(row, key, idx):
                return row[key] if isinstance(row, dict) else row[idx]

            # Total de materiales
            cur.execute("SELECT COUNT(*) as cnt FROM sap_materiales_bbdd")
            stats["total"] = get_val(cur.fetchone(), "cnt", 0)

            # Materiales con precio
            cur.execute("SELECT COUNT(*) as cnt FROM sap_materiales_bbdd WHERE costo_unitario > 0")
            stats["con_precio"] = get_val(cur.fetchone(), "cnt", 0)

            # Precios min/max
            cur.execute("SELECT COALESCE(MIN(costo_unitario), 0) as min_p, COALESCE(MAX(costo_unitario), 0) as max_p FROM sap_materiales_bbdd")
            row = cur.fetchone()
            stats["precio_min"] = get_val(row, "min_p", 0)
            stats["precio_max"] = get_val(row, "max_p", 1)

            # Grupos únicos (no disponible en nueva tabla)
            stats["grupos_unicos"] = 0

        return jsonify({"ok": True, "data": stats}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": {"code": "error", "message": str(e)}}), 500
