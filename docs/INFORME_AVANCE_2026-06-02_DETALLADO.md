# Informe de avance DETALLADO — Núcleo AI-first + Simulación local de 4 apps

> **Este informe NO reemplaza** al anterior (`docs/INFORME_AVANCE.md`, del 2026-06-01). Es un documento **nuevo, más detallado y posterior**, pensado para desmenuzar y analizar a fondo.

| | |
|---|---|
| **Proyecto** | Fábrica de apps de consumo AI-first (hasta 36+ nichos) |
| **Repositorio** | https://github.com/hanccotemp/kernel_app |
| **Rama de trabajo** | `feat/cors-frontend-simulacion` (PR #1) · base en `main` |
| **Fecha** | 2026-06-02 |
| **Alcance** | Estado completo del núcleo + la **simulación local de extremo a extremo** (PostgreSQL + 4 apps Flutter + IA real) |
| **Proveedor de IA activo** | Anthropic (Claude) — pruebas reales |
| **Persistencia** | PostgreSQL local (datos hidratados) |
| **Apps configuradas** | 7 (aurora, sina, lex, mentor, maestro, psico, heladeria) |

---

## 0. Cómo leer este informe
Está ordenado de lo general a lo granular: (1) resumen, (2) qué cambió desde el informe anterior, (3) inventario técnico pieza por pieza con ubicación en el código y evidencia, (4) la simulación local, (5) verificaciones reales ejecutadas, (6) lo que falta, (7) valorización de esfuerzo, (8) cómo reproducir todo, (9) historial de commits.

---

## 1. Resumen ejecutivo

Desde el informe del 2026-06-01 (que dejaba el **núcleo** construido y probado con IA real), se avanzó al siguiente nivel: **una simulación local funcional de extremo a extremo**, con datos que **persisten** y **cuatro apps con interfaz visible** corriendo a la vez, cada una con su propia identidad, respondiendo con **Claude real** y con **memoria propia y aislada por usuario**.

Hitos nuevos principales:
1. **Persistencia real (PostgreSQL)** conectada al núcleo sin reescribirlo (capa write-through). Los datos sobreviven reinicios.
2. **Frontend Flutter** funcionando: una sola base de código que se compila como **apps independientes** (sin selector, sin mezcla).
3. De 2 a **7 apps por configuración** (se sumaron Lex, Mentor, Maestro, **Sereno** —psicólogo— y **Frutti** —heladería—).
4. **4 apps con interfaz** corriendo simultáneamente (Aurora, Sina, Sereno, Frutti) en puertos distintos.
5. **Login por usuario** con memoria aislada; **versículos rotativos**; **IA real (Claude)** como proveedor por defecto.
6. Resolución del tema **legal de la Biblia** (dominio público) y nuevas **capacidades reutilizables** (corpus genérico, multimodal, datos fijos).

**Estado:** la **Fase 1** del plan ("validar el núcleo con apps reales") está cubierta a nivel de simulación local. Lo que falta es **producción** (nube, login real, pagos reales, voz real, iOS, tiendas).

---

## 2. Qué cambió desde el informe anterior (delta 2026-06-01 → 2026-06-02)

| Área | Antes (informe 06-01) | Ahora (06-02) |
|---|---|---|
| Base de datos | En memoria (se perdía al reiniciar) | **PostgreSQL real**, datos persisten (124 mensajes guardados) |
| Frontend | Cliente HTML de prueba | **App Flutter** (4 apps con interfaz, en Chrome) |
| Nº de apps | 2 (Aurora, Sina) | **7** configuradas; 4 con build de interfaz |
| Proveedor IA en uso | mock (plantillas) | **Anthropic/Claude** (conversación real) |
| Login / usuarios | Usuario demo fijo | **Login por nombre**, usuario por app, memoria aislada |
| Conocimiento bíblico | 1 versículo por tema (se repetía) | **Biblia completa** dominio público + **rotación** de versículos |
| Capacidades nuevas | — | **corpus** genérico, **multimodal** (imagen), **datos fijos** |
| Idioma por defecto | Aurora/Sina en portugués | **Español por defecto** en todas |
| Arranque de la base | Manual | **Tarea automática** al iniciar sesión de Windows |

---

## 3. Inventario técnico (pieza por pieza)

### 3.1 Núcleo / Backend (Node.js, 24 archivos en `src/`)

| Componente | Archivo | Qué hace | Estado |
|---|---|---|---|
| Orquestador (7 pasos) | `src/orchestrator/index.js` | Corazón: identifica app, reúne contexto, inyecta conocimiento, arma prompt, llama IA, filtra, responde | ✅ |
| Gestor de personajes | `src/orchestrator/characterManager.js` | Carga las 5 capas de cada app desde su JSON | ✅ |
| Constructor de prompts | `src/orchestrator/promptBuilder.js` | Ensambla el system prompt (personaje + contexto + conocimiento + **datos fijos** + memoria + multimodal) | ✅ |
| Memoria | `src/orchestrator/memory.js` | Conversación por (app+usuario), historial, resumen, **borrado LGPD** | ✅ |
| Filtro de seguridad | `src/orchestrator/safety.js` | Bloquea salidas prohibidas (Capa 4) | ✅ |
| Capa de proveedor | `src/orchestrator/providers/*` | mock · deepseek · anthropic · openai (intercambiables, con **apiKey por petición** y **multimodal**) | ✅ |
| Conocimiento — Biblia | `src/orchestrator/knowledge/bible.js` + `data/{es,pt,en}.json` | Biblia COMPLETA dominio público; **rotación** de versículo por turno | ✅ |
| Conocimiento — Efemérides | `src/orchestrator/knowledge/ephemeris.js` | Sol calculado real por fecha; Luna/Asc = STUB (Swiss Ephemeris pendiente) | 🟡 |
| Conocimiento — Corpus genérico | `src/orchestrator/knowledge/corpus.js` + `data/corpus_*.json` | Fuente de texto curado por configuración (legal, entrevistas, oficios, psicología) | ✅ |
| Voz | `src/orchestrator/voice.js` | TTS stub (gating premium listo); STT/TTS reales pendientes | 🟡 |
| Modelo de datos | `src/core/db.js` | Genérico estilo Odoo + RBAC + **ensureUsuarioFinal** (login) + write-through | ✅ |
| Persistencia PostgreSQL | `src/core/pgstore.js` | Almacén (id, data JSONB); hidrata al arrancar, write-through | ✅ |
| Caché | `src/core/cache.js` | Tipo Redis (interfaz lista); en memoria | 🟡 |
| Suscripciones | `src/core/subscriptions.js` | Planes free/premium + add-ons (gating) | ✅ (simulado) |
| RBAC | `src/core/rbac.js` | Control de acceso por app (back-office) | ✅ (v1) |
| i18n | `src/core/i18n.js` | ES / PT / EN | ✅ |
| Gateway / API | `src/server.js` | REST + WebSocket, multi-tenant, **CORS**, `/login`, `/providers`, multimodal | ✅ |

### 3.2 Frontend (Flutter, `aurora_app/`)
- **Una sola base de código** (`aurora_app/lib/main.dart`) parametrizada por `--dart-define=APP_ID=...`.
- **Cada build es UNA app** (sin selector, sin mezcla): carga su piel/personaje/idioma desde `/api/apps/{id}/config`.
- Pantallas: **Login** (nombre + accesos rápidos Julio/Juan/María; fecha de nacimiento si es astrología), **Chat** (burbujas, idioma, voz, cambio de usuario), **Paywall** (simulado).
- Textos por vertical (fe / astrología / psicología / heladería).

### 3.3 Datos y configuración
- 7 configs de app en `src/config/apps/*.json` (personaje de 5 capas cada una).
- Biblias completas (66 libros × 3 idiomas) en `src/orchestrator/knowledge/data/`.
- Datasets corpus: legal, entrevistas, oficios, **psicología**.
- Catálogo fijo de Frutti (sabores y precios) embebido en su config.

---

## 4. Los 8 requisitos prioritarios (Arquitectura §8) — estado detallado

| # | Requisito | Estado | Detalle |
|---|---|---|---|
| 1 | Orquestador + proveedor intercambiable | ✅ ~95% | 7 pasos trazados; 4 proveedores; probado con Claude real |
| 2 | Conocimiento curado por inyección | ✅ ~90% | Biblia completa, efemérides, corpus, datos fijos; la IA no inventa |
| 3 | Personaje por configuración | ✅ ~95% | 7 apps solo con JSON; agregar app = soltar archivo |
| 4 | Voz por fases | 🟡 ~30% | Gating listo; STT/TTS reales pendientes |
| 5 | Caché + auto-escalado | 🟡 ~30% | Caché en memoria (interfaz lista); AWS pendiente |
| 6 | Multi-tenant + datos genéricos | ✅ ~85% | Aislamiento por app validado; ahora con **PostgreSQL** |
| 7 | Frontend modular | 🟡 ~55% | Flutter funcionando (4 apps web); falta build móvil/tiendas |
| 8 | RBAC por app | 🟡 ~45% | Modelo + 2 roles sembrados; panel configurable pendiente |

---

## 5. La simulación local de extremo a extremo (lo más nuevo)

### 5.1 Arquitectura corriendo en esta PC
```
 Navegador (Chrome)                         Esta PC (Windows)
 ┌───────────────┐   REST/WebSocket   ┌──────────────────────────┐
 │ Aurora :8080  │ ─────────────────► │   Núcleo Node :3000      │
 │ Sina   :8081  │ ◄───────────────── │   (CORS, multi-tenant)   │
 │ Sereno :8082  │                    │        │                 │
 │ Frutti :8083  │                    │        ▼                 │
 └───────────────┘                    │  PostgreSQL :5432         │
   (Flutter Web)                       │  (persistencia real)     │
                                       │        │ APIs externas   │
                                       │        ▼                 │
                                       │   Claude (Anthropic)     │
                                       └──────────────────────────┘
```

### 5.2 Persistencia (PostgreSQL)
- Portátil, en `.pg/` + datos en `.pgdata/`, base `nucleo`, puerto 5432.
- Capa `pgstore.js`: cada entidad como `(id, data JSONB)`; hidrata las tablas al arrancar y escribe en cada cambio (write-through).
- `db.init()`: primer arranque siembra; arranques posteriores **hidratan** desde PostgreSQL; si la base no responde, **cae a memoria sin crashear**.
- **Arranque automático** vía tarea programada al iniciar sesión (`scripts/start-postgres.cmd`).
- **Estado actual de la base:** 21 usuarios, 15 conversaciones, **124 mensajes** persistidos (datos reales de las pruebas).

### 5.3 Las 4 apps con interfaz
| App | Vertical | Color | Puerto | Conocimiento | Login pide |
|---|---|---|---|---|---|
| 🕊️ Aurora | Fe | Verde | 8080 | Biblia (RV1909) | Nombre |
| ✨ Sina | Astrología | Morado | 8081 | Efemérides (signo) | Nombre + fecha nac. |
| 🧠 Sereno | Psicólogo | Azul | 8082 | Corpus psicología | Nombre |
| 🍦 Frutti | Heladería | Rosa | 8083 | Catálogo fijo | Nombre |
Todas: español por defecto, 3 idiomas, Julio/Juan/María de acceso rápido, Claude real.

### 5.4 Login y memoria por usuario
- `POST /api/apps/{id}/login` crea/recupera el usuario (estilo invitado) y persiste.
- ID **por app**: `u_{appId}_{nombre}` → el Julio de Aurora ≠ el Julio de Sina ≠ el de Sereno.
- Cada (app+usuario) tiene su **conversación propia**; lo de un usuario nunca aparece en otro ni en otra app.

---

## 6. Verificaciones reales ejecutadas (evidencia)

| Prueba | Resultado |
|---|---|
| Persistencia sobrevive reinicio | ✅ Datos hidratados tras reiniciar proceso y PC |
| Aurora con Claude (memoria) | ✅ Recordó "perdí mi trabajo" entre turnos |
| Versículos no se repiten | ✅ Jeremías 29:11 → Romanos 15:13 → Isaías 40:31 (rotación) |
| Sina calcula signo real | ✅ Nac. 1994-03-21 → Sol en Áries (no Biblia) |
| Sereno (psicólogo) usa técnica curada | ✅ Respiración 4-7-8 + grounding 5-4-3-2-1; validó la emoción |
| Frutti no inventa precios | ✅ 5 sabores y precios exactos; 100 g = 3 bolas = S/ 6 |
| Aislamiento entre apps (mismo nombre) | ✅ Sereno-Julio NO sabía lo que Aurora-Julio contó |
| Multimodal (imagen) con Claude | ✅ Describió una foto real (capacidad reutilizable) |
| Apps separadas, sin mezcla | ✅ Cada build una sola app (verificado en Chrome) |

---

## 7. Capacidades reutilizables construidas (valor para las 36+ apps)

| Capacidad | Construida una vez | La reutiliza |
|---|---|---|
| Inyector de conocimiento **corpus** | `knowledge/corpus.js` | Cualquier app de texto curado (legal, FAQ, guías, psicología) |
| **Multimodal** (imagen) | capa de proveedor + orquestador + API | Cualquier app con visión |
| **Datos fijos** en prompt | `promptBuilder.js` | Apps de comercio/catálogo (Frutti) |
| **Persistencia** write-through | `pgstore.js` + `db.init()` | Todo el sistema, sin tocar el orquestador |
| **Login** por usuario + memoria | `ensureUsuarioFinal` + `/login` | Todas las apps |
| **Frontend config-driven** (1 base, N builds) | `aurora_app` | Todas las apps |

---

## 8. Lo que falta para producción (deliberadamente diferido)

| Pieza | Hoy | Para producción |
|---|---|---|
| Base de datos | PostgreSQL local | AWS RDS (São Paulo) |
| Caché | En memoria | Redis real |
| Voz | Stub | STT/TTS reales |
| Efemérides (Sina) | Sol real; resto STUB | Swiss Ephemeris |
| Pagos | Paywall simulado | RevenueCat + compras in-app (requiere tienda/dispositivo) |
| Autenticación | Invitado por nombre | Login email/Google/Apple + JWT |
| Frontend móvil | Web en puertos | Build Android (esta PC puede) e **iOS (requiere Mac)** |
| Infraestructura | Local | AWS + HTTPS + auto-escalado |
| Publicación | — | Google Play (US$25) y App Store (US$99/año) |

---

## 9. Valorización de esfuerzo (referencial)

Si lo construyera un equipo humano senior, el estado actual equivale aproximadamente a **2.5 – 4 meses-desarrollador** (p. ej. un equipo pequeño de 2–3 devs durante ~1–1.5 meses, o 1 full-stack durante ~2.5–4 meses). Desglose: núcleo/backend 4–6 sem · persistencia ~1 sem · frontend Flutter 3–4 sem · datos + 7 configs ~1 sem · pruebas y documentos 1–2 sem.

> El valor real no está en las líneas de código (~3–5k a mano), sino en el **motor reutilizable**: construirlo bien es lo caro; las apps después son **configurar, no reprogramar** (se demostró pasando de 2 a 7 apps casi sin tocar el núcleo). El costo del núcleo se amortiza entre las 36+ apps.

Para producción completa (Aurora publicable) se estimaron **otros ~340–550 h**.

---

## 10. Cómo reproducir todo (en esta PC)

```bash
# 1) PostgreSQL (arranca solo al iniciar sesión; o manual:)
.pg\pgsql\bin\pg_ctl.exe -D .pgdata -o "-p 5432" -l .pgdata\server.log start

# 2) Núcleo (usa .env: AI_PROVIDER=anthropic, DATABASE_URL=...)
npm install && npm start            # http://localhost:3000

# 3) Apps (Flutter Web ya compiladas; servir cada build)
#   Aurora :8080  Sina :8081  Sereno :8082  Frutti :8083
python -m http.server 8080 --directory aurora_app/build/web
# (Sina/Sereno/Frutti = build/web_sina | build/web_psico | build/web_heladeria)

# Reconstruir una app:
flutter build web --dart-define=APP_ID=sina --output build/web_sina
```
Pruebas: entrar como Julio/Juan/María; cada uno su memoria. Cambiar de IA: `AI_PROVIDER` o `/api/providers`.

---

## 11. Historial de commits de la sesión (rama del PR #1)

```
835c005 feat(app): cuarta app 'Frutti' (heladeria) + datos fijos + textos por vertical
40c735b feat(app): tercer app 'Sereno' (psicologo) + espanol por defecto en todas
52a974f feat(app): acceso rapido de pruebas (Julio, Juan, Maria)
ffb181d feat(frontend): una base de codigo, una app por build (Aurora y Sina separadas)
1662d2d feat(app+nucleo): login por usuario + versiculos rotativos
56d4105 chore: arranque automatico de PostgreSQL
a9aa38f fix(persistencia): no crashear si PostgreSQL no responde
5444d7f feat(frontend): app Aurora en Flutter Web (Etapa 2)
d07f5e1 feat(api): CORS + limite JSON para el frontend
ab0c3a6 feat(persistencia): PostgreSQL write-through (Etapa 1)
3bbe950 docs: modelo del nucleo + plan del hito (Aurora publicable)
c876f05 docs: informe tecnico de validacion de memoria (Word + PDF)
bf87d16 feat(memoria): aislamiento por (app+usuario) + borrado LGPD
cb086d5 feat(familia7): apps 37/38/39 (legal, entrevista, multimodal)
de4676a docs: informe de avance del nucleo (36 apps)   ← informe anterior
dd75004 feat(bible): Biblia COMPLETA de dominio publico (RV1909/KJV/Almeida)
```

---

## 12. Riesgos y notas
- **Costo de IA:** con Claude, cada mensaje tiene costo real (key Anthropic). El `mock` es gratis para desarrollo.
- **Seguridad:** la API key de Anthropic se pegó en el chat en sesiones previas — **rotarla** al terminar.
- **PostgreSQL local** no es servicio de Windows; se arranca por tarea al iniciar sesión.
- **iOS** no se puede compilar en esta PC (requiere Mac) — no es por specs.
- **Pagos reales** solo funcionan publicados en tienda/dispositivo; hoy el paywall es simulado.

---

## 13. Próximos pasos sugeridos
1. **APK Android** para probar en celular real (esta PC puede) — apuntando a la IP de la PC.
2. **PostgreSQL → AWS RDS** y desplegar el núcleo con HTTPS.
3. **Login + pagos reales** (RevenueCat) para cobrar.
4. **Voz real** (STT/TTS) — el diferenciador.
5. **iOS** vía Mac/Mac en la nube/CI.

---

*Informe generado sobre el estado real del repositorio y de la simulación corriendo en esta PC al 2026-06-02. Las filas marcadas ✅ están verificadas ejecutando el sistema.*
