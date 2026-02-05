# GUÍA DE DEBUGGING INTERACTIVA - Error 500 en Aprobaciones

**Fecha**: 2026-02-04 23:30
**Problema**: POST /api/solicitudes/<id>/aprobar retorna HTTP 500
**Status**: ⚠️ Requiere debugging en terminal interactivo

---

## Pasos para Resolver (PRÓXIMA SESIÓN)

### Paso 1: Iniciar Servidor en Terminal Interactivo
```bash
cd C:\Users\MANUE\Documents\GitHub\SPMV3.0
python wsgi.py
```
**Mantener esta terminal abierta** para ver los logs en tiempo real.

### Paso 2: En Otra Terminal, Ejecutar Test
```bash
cd C:\Users\MANUE\Documents\GitHub\SPMV3.0
python << 'EOF'
import requests
import sqlite3

# Obtener una solicitud submitted
conn = sqlite3.connect("data/spm.db")
cursor = conn.cursor()
cursor.execute("SELECT id FROM solicitud WHERE status = 'submitted' LIMIT 1")
sol_id = cursor.fetchone()[0]
conn.close()

# Login
login = requests.post(
    "http://localhost:5000/api/auth/login",
    json={"username": "1", "password": "password123"}
)
token = login.json().get("access_token")

# Aprobar
resp = requests.put(
    f"http://localhost:5000/api/solicitudes/{sol_id}/aprobar",
    headers={"Authorization": f"Bearer {token}"}
)

print(f"Status: {resp.status_code}")
if resp.status_code == 500:
    print("ERROR 500 - Ver logs en terminal del servidor")
EOF
```

### Paso 3: Revisar Logs en Terminal del Servidor
**Buscar:**
- `ERROR` o `Traceback`
- Línea exacta donde falla
- Stack trace completo

**Ejemplo de lo que buscas:**
```
Traceback (most recent call last):
  File "...", line XYZ, in <function>
    <error line of code>
<ExceptionType>: <error message>
```

---

## Problemas Identificados (Estado Actual)

### 1. Tabla `audit_trail` No Existe
**Ubicación**: `backend/services/audit_service.py` línea 159
**Error**: `sqlite3.OperationalError: no such table: audit_trail`
**Fix Aplicado**: Try/except wrapper en `backend/routes/solicitudes.py` líneas 975-984
**Estado**: Parcialmente resuelto - auditoría es opcional ahora

### 2. Parámetro Incorrecto en `revertir_consumo()`
**Ubicación**: `backend/routes/solicitudes.py` línea 1834
**Problema Original**: `razon=razon` (parámetro incorrecto)
**Fix Aplicado**: `motivo=razon` (parámetro correcto)
**Estado**: ✅ Verificado en disco

### 3. Error Sigue Ocurriendo
**Descripción**: Aunque los fixes están en disco, error 500 persiste
**Posible Causa**:
- Otro código falla ANTES de alcanzar los try/except
- Algo en `cambiar_estado()` del FSM
- Algo en `consume_presupuesto()` del budget_service
- Cache de Python no limpiado completamente

---

## Archivos Clave para Revisar

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `backend/routes/solicitudes.py` | 958-1018 | Bloque try/except de aprobación |
| `backend/core/fsm.py` | ~200-300 | Función `cambiar_estado()` |
| `backend/services/budget_service.py` | ~400-500 | Función `consume_presupuesto()` |
| `backend/services/audit_service.py` | 159-167 | Insert a tabla `audit_trail` |

---

## Códigos de Error Esperados

```python
# Error tabla no existe (parcialmente fixed)
sqlite3.OperationalError: no such table: audit_trail

# Error parámetro (fixed en línea 1834)
TypeError: revertir_consumo() got unexpected keyword argument 'razon'

# Otros errores posibles (no identificados aún)
AttributeError: ...
KeyError: ...
ValueError: ...
```

---

## Checklist para Próxima Sesión

- [ ] Abrir terminal e iniciar servidor con `python wsgi.py`
- [ ] Ejecutar test y ver ERROR 500 en vivo
- [ ] Capturar **LINEA EXACTA** donde falla (del stack trace)
- [ ] Revisar esa línea en el código
- [ ] Entender qué está causando el error
- [ ] Aplicar fix específico
- [ ] Re-ejecutar test
- [ ] Verificar HTTP 200 en aprobación
- [ ] Proceder a TEST 6-7 si es exitoso

---

## Comandos Útiles

**Ver logs del servidor **:
```bash
# Si está corriendo en background
tail -f /tmp/server.log

# O abrir Terminal y iniciar con:
python wsgi.py 2>&1 | tee server.log
```

**Buscar linea específica en código**:
```bash
grep -n "def cambiar_estado" backend/core/fsm.py
grep -n "def consume_presupuesto" backend/services/budget_service.py
```

**Limpiar cache Python**:
```bash
find backend -type d -name "__pycache__" -exec rm -rf {} +
```

---

## Resumen de Cambios Hechos

```
✅ Commit 3dc3426:
  - Auditoría wrapped en try/except
  - Parámetro correcto motivo=razon
  - Logging detallado agregado

✅ Commit a359c96:
  - Tests de diagnosis
  - Documentación actualizada
```

---

## Recomendación Final

**PRÓXIMA SESIÓN:**
1. No gastar tiempo en teoría
2. Ir directamente a terminal interactivo
3. Ver el stack trace REAL
4. Corregir el problema identificado
5. Validar con test inmediatamente

El problema existe, está identificado parcialmente, y solo requiere ver el stack trace completo para aplicar el fix final.

---

*Guía creada: 2026-02-04 23:30*
*Por: Claude Code*
*Estado: LISTA PARA PRÓXIMA SESIÓN*
