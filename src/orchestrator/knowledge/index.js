/**
 * Inyector de conocimiento (dispatcher) — Arquitectura §2, paso 3.
 *
 * Lee la Capa 3 del personaje ("fuente": bible | ephemeris | none) y trae los
 * datos duros desde la fuente correcta. Cachea lo repetible (versículo/mapa del
 * día) vía la capa de caché.
 *
 * Agregar una app nueva con otra fuente (ej. "tarot", "ciclo") = sumar un
 * inyector aquí y declararlo en su personaje. El orquestador no cambia.
 */
import { inyectarBiblia } from "./bible.js";
import { inyectarEfemerides } from "./ephemeris.js";
import { cache } from "../../core/cache.js";

const TTL_DIA = 60 * 60 * 12; // 12 h

export async function inyectarConocimiento(personaje, ctx) {
  const fuente = personaje?.capa3_conocimiento_curado?.fuente || "none";

  if (fuente === "none") return { tipo: "none" };

  // Biblia: trae el texto (YouVersion o respaldo) y cachea internamente.
  if (fuente === "bible") return inyectarBiblia(ctx);

  // Efemérides: cómputo determinista; cacheamos el mapa del día.
  if (fuente === "ephemeris") {
    const fresh = inyectarEfemerides(ctx);
    if (fresh.cacheable && fresh.cacheKey) {
      const { value } = await cache.wrap(fresh.cacheKey, TTL_DIA, async () => fresh);
      return value;
    }
    return fresh;
  }

  return { tipo: "none" };
}
