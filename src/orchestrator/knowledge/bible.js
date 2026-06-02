/**
 * Inyector de conocimiento — Aurora (fe). Plantilla Capa 3 / Arquitectura §8.2.
 *
 * Regla absoluta: la IA NUNCA parafrasea ni inventa la Biblia. El versículo
 * exacto y su referencia se INYECTAN desde la fuente y se le entregan al modelo
 * como dato duro. El modelo solo acompaña/ora alrededor del texto.
 *
 * FUENTE: Biblia COMPLETA (66 libros) de DOMINIO PÚBLICO, embebida localmente
 * en ./data/{es,pt,en}.json (no requiere API, key ni red; funciona offline):
 *   es → Reina Valera (1909)                 en → King James Version
 *   pt → João Ferreira de Almeida (antiga)
 * El texto es de dominio público por antigüedad (RV1909 confirmado PD por
 * eBible.org). Regenerar: node scripts/build-bible-data.js
 *
 * La curación editorial (QUÉ versículo para cada emoción) vive aquí; el TEXTO
 * sale de la Biblia local por referencia (libro/capítulo/versículo).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "data");

// Carga perezosa y cacheada de cada Biblia (libros[nr]=nombre, verses["b.c.v"]=texto).
const _biblias = {};
function getBiblia(lang) {
  if (!_biblias[lang]) {
    _biblias[lang] = JSON.parse(fs.readFileSync(path.join(DATA, `${lang}.json`), "utf8"));
  }
  return _biblias[lang];
}

/** Trae un versículo por referencia numérica. @returns {{referencia,texto}|null} */
export function getVersiculo(lang, libro, capitulo, versiculo) {
  const b = getBiblia(lang);
  const texto = b.verses[`${libro}.${capitulo}.${versiculo}`];
  if (!texto) return null;
  return { referencia: `${b.libros[libro]} ${capitulo}:${versiculo}`, texto };
}

// Curación editorial: tema emocional → VARIOS versículos (rotan por turno para
// no repetir). [libro, capítulo, versículo] sobre la Biblia local completa.
const REFERENCIAS = {
  ansiedad: [
    { libro: 50, cap: 4, ver: 6 },   // Filipenses 4:6
    { libro: 40, cap: 6, ver: 34 },  // Mateo 6:34
    { libro: 19, cap: 55, ver: 22 }, // Salmos 55:22
    { libro: 60, cap: 5, ver: 7 },   // 1 Pedro 5:7
  ],
  miedo: [
    { libro: 23, cap: 41, ver: 10 }, // Isaías 41:10
    { libro: 6, cap: 1, ver: 9 },    // Josué 1:9
    { libro: 19, cap: 23, ver: 4 },  // Salmos 23:4
  ],
  duelo: [
    { libro: 19, cap: 34, ver: 18 }, // Salmos 34:18
    { libro: 40, cap: 5, ver: 4 },   // Mateo 5:4
    { libro: 66, cap: 21, ver: 4 },  // Apocalipsis 21:4
  ],
  gratitud: [
    { libro: 19, cap: 100, ver: 4 }, // Salmos 100:4
    { libro: 52, cap: 5, ver: 18 },  // 1 Tesalonicenses 5:18
    { libro: 51, cap: 3, ver: 15 },  // Colosenses 3:15
  ],
  esperanza: [
    { libro: 24, cap: 29, ver: 11 }, // Jeremías 29:11
    { libro: 45, cap: 15, ver: 13 }, // Romanos 15:13
    { libro: 23, cap: 40, ver: 31 }, // Isaías 40:31
    { libro: 19, cap: 42, ver: 11 }, // Salmos 42:11
  ],
};

const DEFAULT_TEMA = "esperanza";

const PISTAS = {
  ansiedad: ["ansi", "angust", "preocup", "estres", "estrés", "anxious", "worry"],
  miedo: ["miedo", "temor", "medo", "fear", "afraid"],
  duelo: ["duelo", "muerte", "perd", "luto", "grief", "loss", "morr"],
  gratitud: ["gracias", "agradec", "grat", "obrigad", "thankful", "grateful"],
  esperanza: ["esperan", "futuro", "esperanç", "hope"],
};

function detectarTema(texto = "") {
  const t = texto.toLowerCase();
  for (const [tema, pistas] of Object.entries(PISTAS)) {
    if (pistas.some((p) => t.includes(p))) return tema;
  }
  return DEFAULT_TEMA;
}

/**
 * @param {{ pregunta: string, lang: string, perfil?: any, turno?: number }} ctx
 * @returns {{tipo:"bible", tema:string, versiculo:{referencia,texto}, fuente_texto:string}}
 */
export function inyectarBiblia(ctx) {
  const lang = ["es", "pt", "en"].includes(ctx.lang) ? ctx.lang : "es";
  const tema = detectarTema(`${ctx.pregunta} ${ctx.perfil?.momento_espiritual || ""}`);
  const opciones = REFERENCIAS[tema];
  const idx = (Number.isInteger(ctx.turno) ? ctx.turno : 0) % opciones.length; // rota por turno

  // Toma el versículo del turno; si faltara en la fuente, prueba los demás.
  let ref = opciones[idx];
  let versiculo = getVersiculo(lang, ref.libro, ref.cap, ref.ver);
  if (!versiculo) {
    for (const alt of opciones) {
      versiculo = getVersiculo(lang, alt.libro, alt.cap, alt.ver);
      if (versiculo) { ref = alt; break; }
    }
  }
  if (!versiculo) {
    return { tipo: "bible", tema, incompleto: true, motivo: "versículo no encontrado en la fuente", versiculo: null };
  }
  return {
    tipo: "bible",
    tema,
    versiculo,
    fuente_texto: `dominio_publico:${getBiblia(lang).version}`,
    cacheable: true,
    cacheKey: `aurora:verso:${tema}:${lang}:${idx}`,
  };
}
