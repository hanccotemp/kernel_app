# Resultado — Prueba de solidez del núcleo · Familia 7 (Trabajo y oficios)

**Para:** [quien solicitó la prueba]
**De:** Desarrollo (núcleo AI-first)
**Fecha:** 2026-06-01
**Repo:** https://github.com/hanccotemp/kernel_app

> **Veredicto en una línea:** la fábrica pasó la prueba. Lo del mismo tipo (App 37) se agregó **solo con configuración + datos**; las capacidades nuevas (turnos de voz, imagen) se resolvieron con **un módulo reutilizable construido una vez**, no amarrado a la app. Exactamente el comportamiento sano descrito en el documento.

Las 3 apps **ya están cargadas y probadas** en el banco de pruebas (aparecen solas en `GET /api/apps`).

---

## Respuesta por app a las 5 preguntas

### App 37 — Lex (asistente legal de trámites)

| Pregunta | Respuesta |
|---|---|
| **1. ¿Solo configuración (JSON)?** | ✅ **Sí.** Un archivo `src/config/apps/lex.json` (personaje 5 capas) + un archivo de datos `corpus_legal.json`. **Cero cambios al motor** para esta app. |
| **2. ¿Tocaste el código? ¿qué y por qué?** | Para la app, no. **Una sola vez** construí el inyector genérico `corpus.js` (ver abajo); a partir de ahí, cualquier app legal/de-texto es config. |
| **3. ¿Módulo reutilizable o amarrado?** | **Reutilizable.** El conocimiento legal usa el módulo genérico `corpus` (mismo que usan las otras dos apps nuevas). No hay nada "legal" en el motor. |
| **4. ¿El conocimiento curado aceptó una fuente nueva (leyes)?** | ✅ **Sí, con la misma facilidad que Biblia/efemérides.** Se declara `"fuente":"corpus","dataset":"legal"` y se suelta el JSON de datos. |
| **5. Esfuerzo** | El módulo genérico (1 vez): ~hecho. Cada app legal nueva después: **minutos** (config + datos). |

**Verificado:**
- Pregunta sobre *pasaporte* → inyecta el trámite curado (`encontrado: true`).
- Pregunta sobre un tema NO curado (*divorcio*) → `encontrado: false`: la IA **no inventa**, debe derivar a la entidad oficial (Capa 4). Esto confirma la regla "nunca inventa una ley".

**Funcionalidad "generar un documento simple":** se resuelve por el **prompt** (Capa 5 lo describe; el modelo redacta la carta/solicitud con los datos del usuario). No requirió motor nuevo. Un **exportador a PDF** sería un módulo posterior, pero la generación de texto ya funciona.

---

### App 38 — Mentor (coach de entrevistas, voz por turnos)

| Pregunta | Respuesta |
|---|---|
| **1. ¿Solo configuración?** | ✅ **Sí**, para la lógica de turnos. `mentor.json` + `corpus_entrevistas.json` (banco de preguntas). |
| **2. ¿Tocaste el código?** | No para esta app. La sesión por turnos **reutiliza la memoria de conversación** que el núcleo ya tenía (`memory.js`): la IA pregunta, el usuario responde, la IA repregunta — son turnos de la misma conversación. |
| **3. ¿Módulo reutilizable?** | **Sí.** El "modo sesión por turnos" es comportamiento del personaje (Capa 5) sobre la memoria existente; cualquier app puede activarlo. El banco de preguntas es otro `corpus` (reutilizable). |
| **4. ¿Fuente nueva?** | ✅ Banco de preguntas de RR.HH. cargado como `corpus`/`entrevistas`. |
| **5. Esfuerzo** | Lógica de turnos: **config (minutos)**. La **voz hablada real** (STT de la respuesta + TTS de la pregunta) depende del módulo de voz que está **pendiente para TODA la plataforma** (no es específico de esta app). |

**Verificado:** turno 1 inyecta el banco técnico (`encontrado: true`); turno 2 mantiene la **misma conversación** (memoria entre turnos) → la sesión por turnos funciona en texto. La voz bidireccional real llegará con el módulo STT/TTS común.

> Matiz honesto (como pide el documento): el **role-play por turnos** salió por configuración. Lo que falta para "por voz" es el módulo STT/TTS — **reutilizable y compartido**, no amarrado a Mentor.

---

### App 39 — Maestro (asistente de oficio, entrada por imagen)

| Pregunta | Respuesta |
|---|---|
| **1. ¿Solo configuración?** | 🟡 **Config + un módulo nuevo.** El personaje es `maestro.json`; pero la **entrada por imagen NO existía** y requirió construir la capacidad multimodal. |
| **2. ¿Tocaste el código? ¿qué y por qué?** | **Sí, y es lo esperado:** agregué soporte multimodal en la **capa de proveedor** (Anthropic/OpenAI reciben bloques de imagen) y el paso de `imagenes` por el orquestador y la API. Era una **capacidad que no existía** (ninguna app usaba imagen). |
| **3. ¿Módulo reutilizable o amarrado?** | **Reutilizable.** El multimodal vive en la capa de proveedor y el orquestador, no en "Maestro". **Cualquier app** puede enviar imágenes activándolo; mañana una app médica o de moda lo usa sin reconstruirlo. |
| **4. ¿Fuente nueva?** | ✅ Guías de oficios con énfasis en seguridad cargadas como `corpus`/`oficios`. |
| **5. Esfuerzo** | El módulo multimodal (1 vez): hecho en esta sesión. Apps con imagen después: **config**. |

**Verificado con modelo real (Claude visión):**
- Se envió una **foto real**; Claude la **describió correctamente** (mar, sol en el horizonte, islas) — la imagen llegó de verdad al modelo.
- Mantuvo el **personaje "Maestro"** y, por la **memoria**, recordó una fuga de gas mencionada antes y **priorizó la seguridad** (Capa 4) — multimodal + conocimiento curado + memoria + personaje funcionando juntos.
- `meta.multimodal: { imagenes: 1 }` y el `trace` muestra el paso `3b. multimodal`.

---

## Lo que se construyó UNA vez (y queda para todas)

| Pieza nueva | Qué habilita | Reutilizable por |
|---|---|---|
| **Inyector genérico `corpus`** (`knowledge/corpus.js`) | Cualquier fuente de texto curado por configuración (leyes, FAQ, guías, bancos de preguntas) | Toda app de "texto + conocimiento" |
| **Capacidad multimodal** (capa de proveedor + orquestador + API) | Entrada por imagen a cualquier proveedor con visión | Toda app que la active |
| **Usuario demo por app** (seed genérico) | Toda app nueva queda probable al instante (`u_demo_<appId>`) | Toda app |

**Lo que NO se tocó:** el flujo de 7 pasos del orquestador, el aislamiento multi-tenant, los personajes existentes (Aurora/Sina siguen intactos — regresión OK).

---

## Cómo se interpreta frente al criterio del documento

- **App 37 (legal):** se esperaba "casi solo configuración" → **cumplido** (config + datos; el motor de conocimiento aceptó leyes como aceptó la Biblia). ✅
- **Apps 38 y 39 (voz por turnos / imagen):** se aceptaba que requirieran un **módulo nuevo reutilizable** → **cumplido** (turnos = memoria existente + config; imagen = módulo multimodal compartido). ✅

**Conclusión:** el núcleo es **genérico** (lo del mismo tipo = configuración) y **crece por módulos reutilizables** (capacidad nueva = se construye una vez). La fábrica aguanta el crecimiento hacia las 36+ apps.

---

## Cómo reproducir la prueba

```bash
npm install && npm start         # las 5 apps aparecen en GET /api/apps

# App 37 (legal):
curl -X POST localhost:3000/api/apps/lex/chat -H "Content-Type: application/json" \
  -d '{"usuarioId":"u_demo_lex","pregunta":"trámite de pasaporte","lang":"es","provider":"mock"}'

# App 38 (entrevista, turnos): dos llamadas seguidas con usuarioId u_demo_mentor

# App 39 (imagen): enviar "imagenes":[{"base64":"...","mediaType":"image/jpeg"}]
#   con provider "anthropic" (Claude visión) o "mock"
```

*Las afirmaciones "Verificado" se ejecutaron en esta PC contra el código del repositorio.*
