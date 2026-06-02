# Informe de avance — Núcleo AI-first (Fábrica de 36 apps)

**Proyecto:** Fábrica de apps de consumo AI-first (Sina, Aurora, … hasta 36 nichos)
**Repositorio:** https://github.com/hanccotemp/kernel_app
**Fecha del informe:** 2026-06-01
**Alcance de este informe:** trabajo técnico realizado sobre el **Núcleo (Orquestador de IA)** — la prioridad #1 que marca `arquitectura_aifirst_back_front.md §8`.

---

## 1. Resumen ejecutivo

El material de origen (13 documentos) define una **fábrica** para producir hasta **36 apps** (matriz `matriz_priorizacion_36_apps.xlsx`) sobre **un mismo núcleo reutilizable**, cuyo corazón es el **Orquestador de IA**. La consigna explícita: *"El Orquestador de IA debe construirse primero y bien — es el activo reutilizable."*

**Lo logrado:** el Núcleo está **construido y funcionando de verdad** — un backend Node.js multi-tenant, ejecutable en esta PC, que implementa el flujo completo de 7 pasos, sirve a 2 apps (Aurora y Sina) desde configuración, y **ya se probó con una IA real del mercado (Claude/Anthropic)**, no solo simulada.

**Estado global del Núcleo (los 8 requisitos prioritarios):** **~65% del núcleo de validación (Fase 1)** completo. Lo que falta es, en su mayoría, **infraestructura de producción** (PostgreSQL, Redis, voz real, AWS) y el **frontend Flutter** — todo deliberadamente aislado tras interfaces para conectarlo sin reescribir el núcleo.

> **Importante para fijar expectativas:** esto NO es una de las 36 apps terminada y publicada en tienda. Es el **motor** sobre el que se construyen las 36. Es exactamente lo que las Fases 1-3 del `plan_secuencia_lanzamiento.md` piden validar antes de escalar.

---

## 2. Avance frente a los 8 requisitos prioritarios (Arquitectura §8)

| # | Requisito (del documento) | Estado | Avance |
|---|---|---|---|
| 1 | **Orquestador de IA** + capa de proveedor intercambiable (obligatoria) | ✅ **Hecho** | ~90% |
| 2 | **Conocimiento curado por inyección** (IA nunca inventa datos duros) | ✅ **Hecho** | ~85% |
| 3 | **Personaje de IA por configuración** (crear app = llenar plantilla) | ✅ **Hecho** | ~90% |
| 4 | **Voz por fases** (texto base; TTS add-on premium) | 🟡 Parcial | ~30% |
| 5 | **Caché agresivo (Redis)** + auto-escalado desde día uno | 🟡 Parcial | ~30% |
| 6 | **Multi-tenant + modelo de datos genérico** (filosofía Odoo) | ✅ **Hecho** (en memoria) | ~70% |
| 7 | **Frontend modular** (bloques comunes + específicos) | 🟡 Mínimo | ~10% |
| 8 | **Seguridad RBAC por app** (modelo preparado; v1 con 2-3 roles) | 🟡 v1 | ~40% |

### Detalle por requisito

**1 · Orquestador de IA — ✅**
Implementado el flujo exacto de 7 pasos (`src/orchestrator/index.js`). Cada respuesta devuelve `meta.trace` con los 7 pasos trazados. Sub-componentes presentes: gestor de personajes, constructor de prompts, gestor de memoria, inyector de conocimiento, filtro de seguridad, capa de voz. **Capa de proveedor intercambiable**: `mock` (sin costo), `deepseek`, `anthropic`, `openai` — se cambia con una variable o desde la interfaz, sin tocar código (protege el margen, como exige §8.1).

**2 · Conocimiento curado por inyección — ✅**
La IA recibe el dato duro y **no lo inventa** (verificado en vivo: citó el versículo exacto, no de su memoria). Aurora: **Biblia completa de dominio público** embebida (Reina-Valera 1909 ES, KJV EN, Almeida antigua PT — 66 libros, ~31.000 versículos por idioma). Sina: signo solar **calculado real** por fecha; Luna/Ascendente/tránsito marcados como STUB (pendiente Swiss Ephemeris).

**3 · Personaje por configuración — ✅**
Plantilla de **5 capas** cargada desde JSON por app (`src/config/apps/*.json`). Agregar una app nueva = soltar un archivo de config; el motor no se toca. Validado con Aurora y Sina.

**4 · Voz por fases — 🟡**
El *gating* está listo (la voz es add-on premium; el paso 7 se activa solo para quien lo tiene). Pero **STT/TTS son stubs**: no hay reconocimiento ni síntesis de voz reales conectados todavía.

**5 · Caché + auto-escalado — 🟡**
Caché tipo Redis funcionando con la **misma interfaz** que tendría Redis real (`src/core/cache.js`, patrón cache-aside, TTL, hits/misses) — pero es **en memoria**, no Redis real. Auto-escalado / AWS: no implementado (es infraestructura).

**6 · Multi-tenant + datos genéricos (Odoo) — ✅**
Modelo de datos abstracto estilo Odoo (`src/core/db.js`): entidades App, Usuario, Suscripción, Conversación, Mensaje, Recurso, Config + RBAC. **Aislamiento por app** validado (un usuario de Aurora no entra en Sina). Corre **en memoria** con la forma exacta de PostgreSQL (cambio sin tocar el resto).

**7 · Frontend modular — 🟡**
Hoy existe un **cliente web HTML de prueba** (banco de pruebas del núcleo, con selector de app/idioma/proveedor de IA). **El frontend Flutter NO está construido** (decisión consciente: primero el núcleo). Es otro cliente que consumirá el mismo API.

**8 · RBAC por app — 🟡 v1**
Modelo de seguridad **preparado desde el inicio** (Objeto, Rol, Permiso, Usuario-Rol, todo con `app_id`). Sembrados 2 roles fijos (super_admin, editor) con permisos CRUD por app, tal como pide §6.6 para v1. **Panel configurable**: pendiente (fase posterior).

---

## 3. El flujo de 7 pasos del Orquestador — verificado

| Paso | Descripción | Estado |
|---|---|---|
| 1 | Identifica la app (tenant) → carga personaje 5 capas | ✅ |
| 2 | Reúne contexto del usuario (Capa 2) | ✅ |
| 3 | Inyecta conocimiento curado (Biblia / efemérides) | ✅ |
| 4 | Construye el prompt (personaje + contexto + conocimiento + memoria) | ✅ |
| 5 | Llama al modelo (capa intercambiable, con caché) | ✅ (mock y Claude real) |
| 6 | Aplica filtro de límites (Capa 4) | ✅ |
| 7 | Devuelve texto (+ voz si premium con add-on) | ✅ (voz = stub) |

**Evidencia de verificación en esta PC:**
- ✅ Aurora respondió con **Claude real** citando Filipenses 4:6 y Jeremías 29:11 exactos (no inventados).
- ✅ Sina respondió con Sol en Áries calculado real, en portugués, con add-on de voz activado.
- ✅ Multi-tenant: el mismo motor sirvió a ambas con su personaje y conocimiento propios.
- ✅ Filtro de límites bloqueó una frase prohibida ("Dios te castiga").
- ✅ Caché con acierto (hit) entre turnos.

---

## 4. Las 36 apps: cómo las cubre la fábrica

La matriz define **36 nichos en 6 familias**. El núcleo no construye 36 apps distintas: construye **un motor** y cada app es **configuración** sobre él.

| Familia | Nichos | Apps de prioridad ALTA |
|---|---|---|
| Espiritualidad | 6 | **Aurora (fe, 22)**, Meditación/sueño (21), Diario emocional (20) |
| Salud | 6 | TDAH/foco (20), Sueño/insomnio (20) |
| Educación | 6 | (todas MEDIA/BAJA) |
| Finanzas | 6 | Finanzas personales (20), Rastreador suscripciones (20), Finanzas latinos EE.UU. (20) |
| Relaciones | 6 | Coach de pareja (20), Compañero de duelo (20) |
| Productividad | 6 | (todas MEDIA) |

**Estado de implementación de apps:**
- **2 de 36 configuradas y funcionando:** Aurora (fe) y Sina (astrología).
- **La promesa "configurar, no reprogramar" está validada:** agregar una app = un archivo JSON; el motor no cambia.
- Las 34 restantes son **trabajo de configuración + módulos específicos**, no de reconstruir el núcleo.

> La matriz recomienda **Aurora como app #1** (puntaje 22, "facilidad alta", solo bloques comunes). El trabajo hecho está alineado: Aurora es la app más completa en el núcleo actual.

---

## 5. ¿Dónde estamos en el plan de lanzamiento?

| Fase | Qué pide | Estado |
|---|---|---|
| **Fase 0** — Antes de construir | Capital, cotizaciones (CHA/DEAN), audiencia | (Negocio — fuera del alcance técnico) |
| **Fase 1** — Validar el núcleo con UNA app | Motor completo + Aurora con bloques comunes | 🟡 **En curso** — núcleo backend listo y probado; faltan voz real, persistencia y app Flutter publicable |
| **Fase 2** — Primera clonación | App #2 en semanas, no meses | ⏳ Mecanismo listo (config), no ejecutado en producto |
| **Fase 3** — Primer módulo específico | Mapa natal (Sina) reutilizable | ⏳ Sina configurada; módulo de mapa = frontend pendiente |
| **Fase 4** — Escalar la fábrica | Acelerar hacia la docena | ⏳ Pendiente |

**Estamos en plena Fase 1**, que es exactamente donde el plan dice que hay que ser cuidadoso y no apresurarse.

---

## 6. Inventario de lo construido (código real en el repo)

```
src/
  server.js                      API REST + WebSocket, multi-tenant
  orchestrator/
    index.js                     ⭐ Orquestador (flujo de 7 pasos)
    characterManager.js          carga personaje 5 capas por app
    promptBuilder.js             ensambla el prompt del sistema
    memory.js                    memoria/resumen entre turnos
    safety.js                    filtro de límites (Capa 4)
    voice.js                     TTS (stub, gating premium)
    providers/                   mock · deepseek · anthropic · openai (intercambiables)
    knowledge/                   inyección curada: bible (Biblia completa) · ephemeris
      data/{es,pt,en}.json       66 libros · dominio público
  core/
    db.js                        modelo de datos genérico (Odoo) + RBAC
    cache.js                     caché tipo Redis (interfaz lista)
    subscriptions.js             planes free/premium + add-ons (gating)
    rbac.js                      control de acceso por app
    i18n.js                      ES / PT / EN
  middleware/                    tenant (multi-app) · auth (andamiaje)
  config/apps/                   sina.json · aurora.json (personajes 5 capas)
public/index.html                cliente web de prueba (selector de IA + key)
scripts/                         demo.js · build-bible-data.js
docs/                            MODELO_DATOS.md · INFORME_AVANCE.md
```

---

## 7. Lo que falta (deliberadamente diferido, aislado tras interfaces)

| Pieza | Hoy | Para producción |
|---|---|---|
| Base de datos | En memoria (estilo Odoo) | **PostgreSQL** real (AWS São Paulo) |
| Caché | En memoria | **Redis** real |
| Voz (STT/TTS) | Stub | Proveedor real (entrada + salida) |
| Efemérides (Sina) | Sol real; resto STUB | **Swiss Ephemeris** (Luna/Ascendente con hora+lugar) |
| Suscripciones | Gating simulado | **RevenueCat** + compras in-app |
| Auth | Andamiaje (X-User-Id) | Login social + **JWT** |
| **Frontend** | Cliente HTML de prueba | **App Flutter** (1 base, pieles por app) |
| Infraestructura | Local (esta PC) | **AWS São Paulo**, contenedores, auto-escalado |
| Panel RBAC | 2 roles sembrados | Panel configurable de roles/permisos |

**Ninguna de estas piezas obliga a reescribir el núcleo** — cada una entra por una interfaz que ya existe.

---

## 8. Hito de calidad resuelto en esta sesión: contenido bíblico y derechos de autor

Durante la validación se detectó (correctamente, por el dueño del proyecto) que un versículo salía incompleto. El análisis demostró un punto clave de la arquitectura:

- **La IA NO alucinó** — repitió fielmente el dato inyectado. El error estaba en la **fuente curada**, no en el modelo. (Confirma que el diseño de "inyectar, no dejar inventar" funciona.)
- Se aclaró un punto **legal**: la **Reina-Valera 1960 tiene derechos de autor** (Sociedades Bíblicas Unidas); no puede incrustarse en la app sin licencia.
- **Decisión adoptada:** usar **Biblias completas de dominio público** (RV1909, KJV, Almeida antigua), embebidas localmente, legales y sin dependencias. Si el negocio quiere RVR1960 en el futuro, el camino es licenciarla vía YouVersion/API.Bible (opcional, no bloqueante).

---

## 9. Recomendación de próximos pasos

En orden, alineado con el plan de fases:

1. **Persistencia real (PostgreSQL)** — para que los datos sobrevivan reinicios; primer paso hacia AWS.
2. **Frontend Flutter** — la app publicable de Aurora (Fase 1 lo exige para "gente pagando").
3. **Voz real (STT/TTS)** — el diferenciador "IA por voz" del producto.
4. **RevenueCat + auth** — para cobrar de verdad.
5. **Probar la clonación (app #3)** — validar la fábrica (Fase 2).

> La pregunta de validación de §8 —*"¿cuánto cuesta agregar la app #5?"*— ya tiene respuesta en el núcleo: **es soltar un archivo de configuración.** Esa es la prueba de que la arquitectura es correcta.

---

*Informe generado sobre el código del repositorio en su estado actual. Todas las afirmaciones de "Hecho" están verificadas ejecutando el sistema en esta PC.*
