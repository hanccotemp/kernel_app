/**
 * Constructor de prompts — Arquitectura §2 paso 4 / Plantilla §D.2.
 *
 * Ensambla el prompt de SISTEMA combinando:
 *   - Personaje (Capas 1, 4, 5)  → identidad, límites, formato
 *   - Contexto del usuario (Capa 2, en tiempo real)
 *   - Conocimiento curado (Capa 3, inyectado desde la fuente)
 *   - Memoria (resumen de conversaciones previas)
 *   - Idioma de salida (preferencia del usuario)
 *
 * El personaje (parte estable) va primero para aprovechar la caché de prompt.
 */
import { t } from "../core/i18n.js";

export function construirPrompt({ personaje, contextoUsuario, conocimiento, memoria, lang, nombreUsuario }) {
  const c1 = personaje.capa1_identidad;
  const c4 = personaje.capa4_limites;
  const c5 = personaje.capa5_formato;

  const partes = [];

  // --- Bloque estable (personaje) → cacheable ---
  partes.push(`Eres ${c1.nombre}. Personalidad: ${arr(c1.personalidad)}. Tono: ${c1.tono}. Te diriges al usuario ${c1.trato}.`);

  partes.push(
    `LÍMITES (obligatorios):\n` +
      c4.prohibiciones.map((p) => `- ${p}`).join("\n") +
      `\n- Si piden algo fuera de alcance: ${c4.fuera_de_alcance}`
  );

  partes.push(
    `FORMATO DE RESPUESTA: ${c5.largo}. Estructura: ${c5.estructura}. Estilo: ${c5.estilo}.`
  );

  partes.push(t("instruccion_idioma", lang));

  // --- Bloque dinámico (contexto + conocimiento + memoria) ---
  if (nombreUsuario) partes.push(`El usuario se llama ${nombreUsuario}.`);

  if (contextoUsuario && Object.keys(contextoUsuario).length) {
    partes.push(`CONTEXTO DEL USUARIO:\n${render(contextoUsuario)}`);
  }

  if (conocimiento && conocimiento.tipo !== "none") {
    partes.push(`CONOCIMIENTO CURADO (datos reales — NO los inventes, úsalos tal cual):\n${renderConocimiento(conocimiento)}`);
  }

  if (memoria) {
    partes.push(`MEMORIA DE CONVERSACIONES PREVIAS: ${memoria}`);
  }

  return partes.join("\n\n");
}

function arr(a) {
  return Array.isArray(a) ? a.join(", ") : String(a ?? "");
}

function render(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join("\n");
}

function renderConocimiento(k) {
  if (k.tipo === "bible" && k.versiculo) {
    return `Versículo exacto a citar (con su referencia, sin parafrasear): "${k.versiculo.texto}" — ${k.versiculo.referencia}`;
  }
  if (k.tipo === "ephemeris") {
    if (k.incompleto) return `Mapa natal no disponible (${k.motivo}). Pide con amabilidad la fecha/hora/lugar de nacimiento.`;
    const m = k.mapa;
    return `Sol: ${m.sol}; Luna: ${m.luna}; Ascendente: ${m.ascendente}; tránsito clave de hoy: ${m.transito_clave}.`;
  }
  return JSON.stringify(k);
}
