/**
 * Gestor de personajes — Arquitectura §2 sub-componente.
 *
 * Carga el "perfil de personaje" (las 5 capas) de cada app desde su config.
 * Crear el cerebro de una app nueva = llenar la plantilla y cargarla, SIN
 * recompilar (Plantilla §D.1). Aquí se lee de la DB (que cargó los JSON);
 * en producción sería editable desde el panel de administración.
 */
import { db } from "../core/db.js";

export function getPersonaje(appId) {
  const cfg = db.getAppConfig(appId);
  if (!cfg) throw new Error(`App desconocida: ${appId}`);
  if (!cfg.personaje) throw new Error(`La app ${appId} no tiene personaje configurado`);
  return cfg.personaje;
}

export function getAppConfig(appId) {
  const cfg = db.getAppConfig(appId);
  if (!cfg) throw new Error(`App desconocida: ${appId}`);
  return cfg;
}
