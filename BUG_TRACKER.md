# BUG TRACKER - SPM v3.0 Testing

**Actualizado**: 2026-02-05
**Total Bugs**: 2
**Críticos**: 0
**Altos**: 1
**Menores**: 1

---

## BUG #1: Logout No Invalida Token ⚠️ ALTO

| Atributo | Valor |
|----------|-------|
| **ID** | BUG-001 |
| **Severidad** | ALTO |
| **Status** | ABIERTO |
| **Fase Encontrado** | FASE 2 |
| **Componente** | Auth - Logout |

### Descripción
Después de ejecutar `POST /api/auth/logout`, el token JWT sigue siendo válido para hacer requests a endpoints protegidos.

### Pasos para Reproducir
1. Hacer login: `POST /api/auth/login` → 200 OK, retorna access_token
2. Hacer logout: `POST /api/auth/logout` con Bearer token → 200 OK
3. Intentar GET `/api/auth/me` con mismo token → **Actual: 200 OK**, **Esperado: 401**

### Expected Behavior
Después de logout, GET `/api/auth/me` debería retornar:
```json
{
  "ok": false,
  "error": {
    "code": "invalid_token",
    "message": "Token was revoked"
  }
}
```

### Actual Behavior
```json
{
  "ok": true,
  "user": { ... }
}
```

### Root Cause (Probable)
El endpoint `/logout` no invalida el token. Las opciones incluyen:
1. Implementar token blacklist en memoria/cache
2. Usar cookie SameSite=Strict
3. Validar logout timestamp en GET /me

### Impact
- **Security**: Sesión puede continuar siendo usada después de logout
- **Users Afectados**: Todos
- **Workaround**: Borrar cookies del navegador manualmente

### Fix Recomendado
```python
# En backend/routes/auth.py - logout()
# Guardar token revocado en caché por su timestamp
revoked_tokens.add(token_exp_timestamp)

# En GET /me - validar
if token_exp_timestamp in revoked_tokens:
    return 401
```

### Prioridad
- **Fix antes de**: Producción
- **Estimado**: 30 minutos

---

## BUG #2: Security Headers No Presentes en Dev ℹ️ MENOR

| Atributo | Valor |
|----------|-------|
| **ID** | BUG-002 |
| **Severidad** | MENOR |
| **Status** | ESPERADO |
| **Fase Encontrado** | FASE 2 |
| **Componente** | Frontend - Vite Dev Server |

### Descripción
Headers de seguridad no están presentes en el dev server de Vite:
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`
- `Referrer-Policy`

### Impacto
- Ninguno en desarrollo
- **Nota**: Estos headers deben estar configurados en nginx para producción

### Fix
Agregar en `infra/nginx/default.conf`:
```nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header Content-Security-Policy "...";
add_header Referrer-Policy "strict-origin-when-cross-origin";
```

### Status
⏳ Pendiente para fase de producción

---

## BUGS CERRADOS

Ninguno (son todos nuevos)

---

## ESTADÍSTICAS

```
Total Bugs:      2
├── Abiertos:    2
│   ├── Alto:    1
│   └── Menor:   1
└── Cerrados:    0
```

---

## PRÓXIMAS ACCIONES

### Inmediato (Antes de FASE 3)
- [ ] Fix BUG-001: Implementar token blacklist en logout

### Antes de Producción
- [ ] Fix BUG-002: Agregar security headers a nginx

---

*Tracker actualizado automáticamente durante testing*
