/**
 * Inyector de conocimiento (dispatcher) — Arquitectura §2, paso 3.
 *
 * Lee la Capa 3 del personaje ("fuente": bible | ephemeris | corpus | none) y
 * trae los datos duros desde la fuente correcta. Cachea lo repetible.
 *
 * "corpus" es el inyector GENÉRICO: una app nueva de texto+conocimiento curado
 * (legal, banco de preguntas, guías…) se agrega SOLO por configuración
 * (fuente:"corpus", dataset:"x") + su archivo de datos, sin tocar este motor.
 */
import { inyectarBiblia } from "./bible.js";
import { inyectarEfemerides } from "./ephemeris.js";
import { inyectarCorpus } from "./corpus.js";
import { cache } from "../../core/cache.js";

const TTL_DIA = 60 * 60 * 12; // 12 h

export async function inyectarConocimiento(personaje, ctx) {
  const cap3 = personaje?.capa3_conocimiento_curado || {};
  const fuente = cap3.fuente || "none";

  if (fuente === "none") return { tipo: "none" };

  const fresh =
    fuente === "bible" ? inyectarBiblia(ctx) :
    fuente === "ephemeris" ? inyectarEfemerides(ctx) :
    fuente === "corpus" ? inyectarCorpus(ctx, cap3) :
    { tipo: "none" };

  // Cacheamos lo repetible (versículo / mapa del día).
  if (fresh.cacheable && fresh.cacheKey) {
    const { value } = await cache.wrap(fresh.cacheKey, TTL_DIA, async () => fresh);
    return value;
  }
  return fresh;
}
