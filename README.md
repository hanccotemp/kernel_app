# Núcleo AI-first — Orquestador de IA multi-app

Implementación ejecutable del **activo reutilizable #1** del proyecto: el
**Orquestador de IA** y el núcleo multi-tenant sobre el que se montan todas las
apps (Sina, Aurora, … hasta una docena).

> Según `arquitectura_aifirst_back_front.md` §8: *"El Orquestador de IA debe
> construirse primero y bien — es el activo reutilizable. Construirlo bien una
> vez = todas las apps tienen IA de calidad."* Eso es lo que hay aquí.

Las apps **no se programan**: se **configuran**. Sina y Aurora son dos archivos
JSON (`src/config/apps/*.json`) con su personaje de 5 capas. El motor es el mismo.

---

## Qué corre hoy

- **Orquestador de IA** con el flujo exacto de 7 pasos (arquitectura §2).
- **Multi-tenant**: cada petición identifica la app; carga su personaje y su
  fuente de conocimiento.
- **Personaje por configuración** (plantilla de 5 capas) — Sina y Aurora cargados.
- **Capa de proveedor intercambiable**: `mock` (sin API key), `deepseek`,
  `anthropic`, `openai`. Se cambia con una variable de entorno.
- **Conocimiento curado por inyección**: Aurora cita el **versículo exacto** (no
  lo inventa); Sina recibe el **Sol real** calculado por fecha (Luna/Asc/tránsito
  son STUB marcado para reemplazar por Swiss Ephemeris).
- **Memoria** entre turnos (resumen barato; ampliable a resumen por modelo).
- **Filtro de límites** (Capa 4): bloquea salidas prohibidas antes de entregarlas.
- **Caché** tipo Redis (in-memory) para lo repetible (versículo/mapa del día).
- **Suscripciones / paywall**: free vs premium + add-on de voz (TTS por fases, stub).
- **RBAC de back-office** (v1: 2 roles fijos, modelo preparado para el panel y
  permisos por campo / auditoría).
- **API Gateway**: REST + WebSocket. Cliente web de demostración incluido.

---

## Cómo correrlo

Requiere Node ≥ 18 (probado en Node 22).

### Opción A — demo sin servidor ni dependencias

```bash
node scripts/demo.js
```

Ejercita multi-tenant, inyección de conocimiento, memoria, filtro y caché, todo
con el proveedor `mock` (sin API key, sin costo).

### Opción B — servidor + cliente web

```bash
npm install
npm start
# abre http://localhost:3000
```

Cambia la app (Sina/Aurora), el idioma (PT/ES/EN) y escribe. Verás cómo el mismo
motor responde con otro personaje y otra fuente de conocimiento.

### Conectar un modelo real

```bash
cp .env.example .env
# edita .env:
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
npm start
```

Igual para `anthropic` u `openai`. **No se toca código**: solo la variable.

---

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | estado, proveedor activo, stats de caché |
| GET | `/api/apps` | catálogo de apps activas (piel, vertical, idiomas) |
| GET | `/api/apps/:appId/config` | config pública de una app |
| POST | `/api/apps/:appId/chat` | `{ pregunta, lang?, conVoz? }` → respuesta de IA |
| WS | `/ws` | `{ appId, usuarioId, pregunta, lang? }` → respuesta en tiempo real |

Headers en REST: `X-App-Id`, `X-User-Id`.

Usuarios sembrados para probar: `u_ana` (Sina, premium+voz) · `u_joao` (Aurora, free).

---

## El flujo de 7 pasos (dónde vive cada uno)

| Paso (arquitectura §2) | Archivo |
|---|---|
| 1. Identifica app → carga personaje | `orchestrator/characterManager.js` |
| 2. Reúne contexto del usuario | `orchestrator/index.js` (`extraerContexto`) |
| 3. Inyecta conocimiento curado | `orchestrator/knowledge/` (`bible`, `ephemeris`) |
| 4. Construye el prompt | `orchestrator/promptBuilder.js` |
| 5. Llama al modelo (capa intercambiable) | `orchestrator/providers/` |
| 6. Aplica los límites | `orchestrator/safety.js` |
| 7. Devuelve respuesta (texto / voz) | `orchestrator/index.js`, `voice.js` |

Cada respuesta incluye `meta.trace` con los 7 pasos, para que el desarrollador
vea el flujo y para depurar.

---

## La prueba clave de la arquitectura: "¿cuánto cuesta agregar la app #5?"

Respuesta: **un archivo de configuración.** Para una app nueva que use solo
bloques comunes (chat de IA + conocimiento por inyección):

1. Crea `src/config/apps/miapp.json` copiando `aurora.json`.
2. Llena el **personaje de 5 capas** (identidad, contexto, conocimiento, límites,
   formato) — eso es la plantilla `plantilla_personaje_ia.md`.
3. Si su fuente de conocimiento es nueva (no `bible` ni `ephemeris`), añade un
   inyector en `orchestrator/knowledge/` y decláralo en la Capa 3.
4. Reinicia. La app aparece en `/api/apps` y ya conversa.

No se toca el orquestador, ni el servidor, ni el frontend del chat. **Configurar,
no reprogramar** — que es justamente la prueba de validación de la §8.

---

## Qué NO es esto (alcance honesto)

Es el **núcleo backend** (prioridad #1), no la plataforma entera. Pendiente y
claramente identificado para la siguiente fase:

- **Persistencia real**: hoy el modelo de datos genérico (estilo Odoo) corre
  **en memoria** con la forma exacta de PostgreSQL. Falta el repositorio SQL
  (AWS São Paulo) — la interfaz ya está aislada en `core/db.js`.
- **Caché**: Redis real en lugar del in-memory (interfaz lista en `core/cache.js`).
- **Voz**: STT/TTS reales (hoy stubs en `voice.js`, con el gate de add-on ya hecho).
- **Efemérides**: Swiss Ephemeris para Luna/Ascendente/tránsitos (Sol ya es real).
- **Pagos**: RevenueCat + IAP de tiendas (hoy el estado se lee de la DB sembrada).
- **Auth**: JWT tras login social (hoy `X-User-Id` de andamiaje).
- **Frontend de producto**: Flutter (una base, pieles + módulos). El cliente web
  aquí es solo un banco de pruebas del motor.

Cada uno de estos puntos está **aislado tras una interfaz**, así que conectarlos
no obliga a reescribir el núcleo.

---

## Estructura

```
src/
  server.js                  API Gateway (REST + WebSocket)
  config/apps/*.json         una app = un archivo (personaje de 5 capas)
  orchestrator/
    index.js                 el Orquestador (flujo de 7 pasos)
    characterManager.js      carga el personaje del tenant
    promptBuilder.js         arma el prompt (personaje+contexto+conocimiento+memoria)
    safety.js                filtro de límites (Capa 4)
    memory.js                memoria entre conversaciones
    voice.js                 STT/TTS (stub, por fases)
    providers/               capa intercambiable: mock|deepseek|anthropic|openai
    knowledge/               inyectores: bible (Aurora) · ephemeris (Sina)
  core/
    db.js                    modelo de datos genérico (Odoo-like, en memoria)
    cache.js                 caché tipo Redis (in-memory)
    rbac.js                  control de acceso de back-office
    subscriptions.js         free/premium + add-on de voz
    i18n.js                  ES/PT/EN del sistema
  middleware/                tenant.js (multi-tenant) · auth.js
public/index.html            cliente de chat de demostración
scripts/demo.js              demo de extremo a extremo sin servidor
```
