/**
 * ⭐ ORQUESTADOR DE IA — el corazón del sistema. Arquitectura §2.
 *
 * Activo reutilizable: las 12 apps comparten ESTE orquestador. Lo único que
 * cambia entre apps es la configuración (personaje + fuente de conocimiento).
 *
 * Flujo exacto cuando llega una pregunta del usuario (Arquitectura §2):
 *   1. Identifica la app (tenant) → carga su personaje (5 capas).
 *   2. Reúne el contexto del usuario (Capa 2).
 *   3. Inyecta conocimiento curado (Capa 3) desde la fuente real.
 *   4. Construye el prompt (personaje + contexto + conocimiento + memoria).
 *   5. Llama al modelo (capa de proveedor intercambiable, con caché de prompt).
 *   6. Aplica los límites (filtro de seguridad, Capa 4).
 *   7. Devuelve la respuesta (texto; si premium con voz → TTS).
 */
import { getPersonaje, getAppConfig } from "./characterManager.js";
import { inyectarConocimiento } from "./knowledge/index.js";
import { construirPrompt } from "./promptBuilder.js";
import { filtrarSalida } from "./safety.js";
import { getProvider } from "./providers/index.js";
import { textToSpeech } from "./voice.js";
import * as memoria from "./memory.js";
import { db } from "../core/db.js";
import { gate } from "../core/subscriptions.js";
import { normalizeLang } from "../core/i18n.js";
import { t } from "../core/i18n.js";

/**
 * @param {object} params
 * @param {string} params.appId       tenant (sina, aurora, ...)
 * @param {string} params.usuarioId   usuario final
 * @param {string} params.pregunta    texto del usuario
 * @param {string} [params.lang]      idioma de salida (override de la pref.)
 * @param {boolean}[params.conVoz]    pedir TTS (requiere add-on de voz)
 * @param {string} [params.provider]  forzar proveedor (debug / interfaz)
 * @param {string} [params.apiKey]    key del proveedor por petición (interfaz). Si falta, usa .env
 * @param {string} [params.model]     modelo por petición (override del default del proveedor)
 */
export async function responder(params) {
  const t0 = Date.now();
  const trace = [];
  const { appId, usuarioId, pregunta } = params;

  // ── Paso 1: identificar app y cargar personaje ──────────────────────────
  const appCfg = getAppConfig(appId);
  if (!appCfg.activo) throw new Error(`App inactiva: ${appId}`);
  const personaje = getPersonaje(appId);
  trace.push("1. app+personaje cargados");

  // ── Paso 2: reunir contexto del usuario ─────────────────────────────────
  const usuario = db.getUsuario(appId, usuarioId);
  if (!usuario) throw new Error(`Usuario no encontrado en ${appId}: ${usuarioId}`);
  const lang = normalizeLang(params.lang || usuario.idioma || appCfg.idioma_default);
  const contextoUsuario = extraerContexto(personaje, usuario, pregunta);
  trace.push("2. contexto del usuario reunido");

  // ── Paso 3: inyectar conocimiento curado (datos reales) ─────────────────
  const conocimiento = await inyectarConocimiento(personaje, {
    pregunta, lang, perfil: usuario.perfil,
  });
  trace.push(`3. conocimiento inyectado (${conocimiento.tipo})`);

  // memoria + historial
  const conv = memoria.getConversacion(appId, usuarioId);
  memoria.guardarMensaje(conv.id, "user", pregunta);
  const resumen = memoria.resumir(conv.id);
  const historial = memoria.historial(conv.id, 8);

  // ── Paso 4: construir el prompt de sistema ──────────────────────────────
  const system = construirPrompt({
    personaje,
    contextoUsuario,
    conocimiento,
    memoria: resumen,
    lang,
    nombreUsuario: usuario.nombre,
  });
  trace.push("4. prompt construido");

  // ── Paso 5: llamar al modelo (capa intercambiable) ──────────────────────
  const provider = getProvider(params.provider);
  let salida;
  try {
    salida = await provider.complete({
      system,
      messages: historial,
      meta: {
        lang,
        nombreUsuario: usuario.nombre,
        knowledge: conocimiento,
        maxTokens: 400,
        apiKey: params.apiKey, // viene de la interfaz; no se persiste
        model: params.model,
      },
    });
  } catch (err) {
    trace.push(`5. ERROR del proveedor: ${err.message}`);
    return {
      ok: false,
      texto: t("error_modelo", lang),
      error: err.message,
      meta: { appId, provider: provider.name, lang, ms: Date.now() - t0, trace },
    };
  }
  trace.push(`5. modelo respondió (${provider.name})`);

  // ── Paso 6: aplicar límites (filtro de seguridad) ───────────────────────
  const filtrado = filtrarSalida(salida.text, personaje, lang);
  if (filtrado.bloqueado) trace.push(`6. filtro BLOQUEÓ (${filtrado.motivo})`);
  else trace.push("6. filtro OK");

  memoria.guardarMensaje(conv.id, "assistant", filtrado.texto);

  // ── Paso 7: devolver respuesta (texto; voz si premium con add-on) ───────
  let voz = null;
  if (params.conVoz) {
    const g = gate(appId, usuarioId, "voz");
    if (g.permitido) {
      voz = await textToSpeech(filtrado.texto, lang);
      trace.push("7. TTS generado (add-on voz)");
    } else {
      trace.push("7. voz solicitada pero sin add-on → solo texto");
    }
  }

  return {
    ok: true,
    texto: filtrado.texto,
    voz,
    meta: {
      appId,
      personaje: personaje.nombre,
      provider: salida.provider,
      lang,
      bloqueadoPorLimites: filtrado.bloqueado,
      conocimiento: resumenConocimiento(conocimiento),
      tokens: salida.tokens,
      ms: Date.now() - t0,
      conversacionId: conv.id,
      trace,
    },
  };
}

/** Extrae solo los campos de contexto que el personaje declara (Capa 2). */
function extraerContexto(personaje, usuario, pregunta) {
  const campos = personaje?.capa2_contexto_usuario?.campos || [];
  const out = {};
  const perfil = usuario.perfil || {};
  for (const campo of campos) {
    if (campo === "tema_pregunta" || campo === "peticion_oracion") {
      out[campo] = pregunta;
    } else if (perfil[campo] != null) {
      out[campo] = perfil[campo];
    }
  }
  return out;
}

function resumenConocimiento(k) {
  if (k.tipo === "bible") return { fuente: "bible", tema: k.tema, ref: k.versiculo?.referencia, texto_de: k.fuente_texto, aviso: k.aviso };
  if (k.tipo === "ephemeris") return { fuente: "ephemeris", sol: k.mapa?.sol, incompleto: !!k.incompleto };
  return { fuente: "none" };
}
