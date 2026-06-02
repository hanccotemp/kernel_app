/**
 * Suscripciones y paywall — Arquitectura §3.2.
 *
 * Mundo "usuario final": NO roles complejos. Solo:
 *   - plan: free | premium  (trial cuenta como premium mientras dure)
 *   - addons: ["voz", ...]  (voz = add-on premium, voz por fases §8.4)
 *
 * En producción el estado real lo manda RevenueCat + IAP de las tiendas
 * (StoreKit / Google Play Billing). Aquí se lee de la DB sembrada.
 */
import { db } from "./db.js";

/** ¿El usuario tiene acceso premium activo (incluye trial)? */
export function esPremium(appId, usuarioId) {
  const s = db.getSuscripcion(appId, usuarioId);
  if (!s) return false;
  return (s.plan === "premium") && (s.estado === "activo" || s.estado === "trial");
}

/** ¿Tiene el add-on de voz contratado? (TTS premium) */
export function tieneVoz(appId, usuarioId) {
  if (!esPremium(appId, usuarioId)) return false;
  const s = db.getSuscripcion(appId, usuarioId);
  return Array.isArray(s.addons) && s.addons.includes("voz");
}

/**
 * Gate de funcionalidad. Devuelve { permitido, motivo }.
 * @param {string} appId
 * @param {string} usuarioId
 * @param {"chat"|"voz"} feature
 */
export function gate(appId, usuarioId, feature) {
  if (feature === "voz") {
    return { permitido: tieneVoz(appId, usuarioId), motivo: "addon_voz" };
  }
  // chat de texto: disponible también en free en el plan de producto base.
  return { permitido: true, motivo: null };
}
