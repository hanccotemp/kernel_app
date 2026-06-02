/**
 * Filtro de seguridad / límites — Arquitectura §2 paso 6 / §8.
 *
 * Valida que la respuesta del modelo respete las prohibiciones de ESA app
 * (Capa 4) ANTES de entregarla. Si detecta una violación, sanea o reemplaza
 * por una respuesta segura de redirección.
 *
 * Esto es defensa en profundidad: el prompt ya pide respetar los límites, pero
 * el filtro garantiza que ninguna salida prohibida llegue al usuario.
 */
import { t } from "../core/i18n.js";

/**
 * @param {string} texto respuesta del modelo
 * @param {object} personaje
 * @param {string} lang
 * @returns {{ texto: string, bloqueado: boolean, motivo?: string }}
 */
export function filtrarSalida(texto, personaje, lang) {
  const limites = personaje?.capa4_limites || {};
  const bloqueadas = limites.palabras_bloqueadas || [];
  const lower = (texto || "").toLowerCase();

  for (const frase of bloqueadas) {
    if (lower.includes(frase.toLowerCase())) {
      return {
        texto: respuestaSegura(personaje, lang),
        bloqueado: true,
        motivo: `frase prohibida: "${frase}"`,
      };
    }
  }
  return { texto, bloqueado: false };
}

function respuestaSegura(personaje, lang) {
  const redir = personaje?.capa4_limites?.fuera_de_alcance;
  const base = t("fuera_de_alcance", lang);
  return redir ? `${base} ${redir}` : base;
}
