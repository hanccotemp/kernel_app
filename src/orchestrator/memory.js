/**
 * Gestor de memoria — Arquitectura §2 / Plantilla §D.3.
 *
 * Guarda los intercambios y entrega al orquestador un RESUMEN breve de
 * interacciones previas del usuario (ej. "la última vez mencionó ansiedad por
 * el trabajo"). Opcional por app.
 *
 * Aquí el resumen es heurístico/extractivo (sin costo). En producción puede
 * generarse con el modelo cada N mensajes y persistirse en PostgreSQL.
 */
import { db } from "../core/db.js";

/** Crea u obtiene la conversación activa del usuario en una app. */
export function getConversacion(appId, usuarioId) {
  let conv = db.conversaciones.findOne(
    (c) => c.app_id === appId && c.usuario_id === usuarioId && c.activa
  );
  if (!conv) {
    conv = db.conversaciones.insert({
      app_id: appId, usuario_id: usuarioId, activa: true, resumen: null, creada: new Date().toISOString(),
    });
  }
  return conv;
}

export function guardarMensaje(conversacionId, role, content) {
  return db.mensajes.insert({
    conversacion_id: conversacionId, role, content, ts: new Date().toISOString(),
  });
}

export function historial(conversacionId, limite = 10) {
  return db.mensajes
    .find((m) => m.conversacion_id === conversacionId)
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .slice(-limite)
    .map((m) => ({ role: m.role, content: m.content }));
}

/** Resumen breve para inyectar como memoria. Extractivo y barato. */
export function resumir(conversacionId) {
  const conv = db.conversaciones.get(conversacionId);
  if (conv?.resumen) return conv.resumen;

  const msgs = db.mensajes
    .find((m) => m.conversacion_id === conversacionId && m.role === "user")
    .sort((a, b) => a.ts.localeCompare(b.ts));
  if (msgs.length <= 1) return null;

  const previos = msgs.slice(0, -1).slice(-3).map((m) => recortar(m.content, 80));
  return `El usuario antes mencionó: ${previos.join(" / ")}.`;
}

function recortar(s, n) {
  s = (s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Derecho LGPD al borrado: elimina SOLO la memoria del par (app + usuario).
 * No toca a otros usuarios ni a otras personalidades/apps.
 * @returns {{conversaciones:number, mensajes:number}}
 */
export function borrarMemoriaUsuario(appId, usuarioId) {
  const convs = db.conversaciones.find((c) => c.app_id === appId && c.usuario_id === usuarioId);
  let mensajes = 0;
  for (const c of convs) {
    for (const m of db.mensajes.find((m) => m.conversacion_id === c.id)) {
      db.mensajes.remove(m.id);
      mensajes++;
    }
    db.conversaciones.remove(c.id);
  }
  return { conversaciones: convs.length, mensajes };
}
