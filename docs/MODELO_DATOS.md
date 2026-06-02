# Modelo de datos — Núcleo AI-first

Modelo **genérico estilo Odoo** (Arquitectura §5): los datos son abstractos y
configurables, **no** cableados a "astrología". Agregar una app o un tipo de
contenido = configurar, no reprogramar el esquema.

> Implementado hoy en memoria (`src/core/db.js`) con la **misma forma** que tendrá
> en PostgreSQL (AWS São Paulo). Se reemplaza por un repositorio SQL manteniendo
> la interfaz `find/insert/update`; el resto del sistema no cambia.

`PK` = clave primaria · `FK` = clave foránea · `JSON` = documento embebido.

## Diagrama entidad-relación

```mermaid
erDiagram
    APP ||--|| CONFIG : "tiene 1 (personaje 5 capas, precios, piel)"
    APP ||--o{ USUARIO : "1—N (aislado por app_id)"
    APP ||--o{ SUSCRIPCION : "1—N"
    APP ||--o{ CONVERSACION : "1—N"
    APP ||--o{ RECURSO : "1—N (ítem abstracto)"
    APP ||--o{ OBJETO : "1—N (RBAC)"
    APP ||--o{ ROL : "1—N (RBAC)"

    USUARIO ||--o{ SUSCRIPCION : "1—N"
    USUARIO ||--o{ CONVERSACION : "1—N"
    USUARIO ||--o{ USUARIO_ROL : "1—N (back-office)"

    CONVERSACION ||--o{ MENSAJE : "1—N (historial)"

    ROL ||--o{ PERMISO : "1—N"
    OBJETO ||--o{ PERMISO : "1—N"
    ROL ||--o{ USUARIO_ROL : "1—N"

    APP {
        string id PK "ej. sina, aurora"
        string sigla
        string nombre
        bool activo
    }
    CONFIG {
        string id PK "cfg_<app_id>"
        string app_id FK
        json data "personaje 5 capas, modulos, precios, piel, idiomas"
    }
    USUARIO {
        string id PK
        string app_id FK "null si es back-office"
        string nombre
        string email
        string idioma
        json perfil "Capa 2: nacimiento, plan de lectura, etc."
        bool backoffice "true = staff"
        bool activo
    }
    SUSCRIPCION {
        string id PK
        string app_id FK
        string usuario_id FK
        string plan "free | premium"
        array addons "ej. [voz]"
        string estado "trial | activo"
        string vence
    }
    CONVERSACION {
        string id PK
        string app_id FK
        string usuario_id FK
        bool activa
        string resumen "memoria extractiva"
        string creada
    }
    MENSAJE {
        string id PK
        string conversacion_id FK
        string role "user | assistant"
        string content
        string ts
    }
    RECURSO {
        string id PK
        string app_id FK
        string tipo "versiculo | transito | tarot..."
        json data "contenido curado inyectable"
    }
    OBJETO {
        string id PK
        string app_id FK
        string nombre "contenido | usuario"
        string tipo "recurso | entidad"
        string url
        bool activo
    }
    ROL {
        string id PK
        string app_id FK
        string nombre "super_admin | editor"
        bool activo
    }
    PERMISO {
        string id PK
        string rol_id FK
        string objeto_id FK
        bool ver
        bool agregar
        bool editar
        bool eliminar
    }
    USUARIO_ROL {
        string id PK
        string usuario_id FK
        string rol_id FK
        string app_id FK
    }
```

## Lectura rápida por bloques

| Bloque | Entidades | Para qué sirve |
|---|---|---|
| **Multi-tenant** | `APP`, `CONFIG` | Cada app (Sina, Aurora…) es una fila + su JSON de configuración. Agregar app #N = soltar un JSON. |
| **Usuario final** | `USUARIO`, `SUSCRIPCION` | Dueño de sus datos; plan free/premium + add-ons (voz). Aislado por `app_id`. |
| **Conversación / memoria** | `CONVERSACION`, `MENSAJE` | Historial y resumen que el orquestador inyecta como memoria entre turnos. |
| **Conocimiento curado** | `RECURSO` | Ítem abstracto (versículo, tránsito, tarot…) que se **inyecta** para que la IA no invente datos duros. |
| **RBAC (back-office)** | `OBJETO`, `ROL`, `PERMISO`, `USUARIO_ROL` | Permisos del panel de administración: quién ve/edita qué, por app. |

## Reglas clave del esquema

- **Aislamiento multi-tenant:** casi todas las tablas llevan `app_id`. Un usuario de
  una app nunca ve datos de otra (`getUsuario` valida `u.app_id === appId`).
- **Genérico, no específico:** `RECURSO` es un ítem abstracto con `tipo` + `data` (JSON),
  para no rehacer el esquema por cada vertical.
- **Permisos N—N:** un `USUARIO` (staff) tiene roles vía `USUARIO_ROL`; cada `ROL`
  define `PERMISO` (ver/agregar/editar/eliminar) sobre cada `OBJETO`.
