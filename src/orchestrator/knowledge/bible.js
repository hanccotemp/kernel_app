/**
 * Inyector de conocimiento — Aurora (fe). Plantilla Capa 3 / Arquitectura §8.2.
 *
 * Regla absoluta: la IA NUNCA parafrasea ni inventa la Biblia. El versículo
 * exacto y su referencia se INYECTAN desde una fuente real y se le entregan al
 * modelo como dato duro. El modelo solo acompaña/ora alrededor del texto.
 *
 * FUENTE DE TEXTO (dos modos):
 *   1. YouVersion Platform API (PRODUCCIÓN) — texto LICENCIADO, RVR1960 en
 *      español, y la versión que se elija en PT/EN. Es el camino correcto y
 *      legal para usar RVR1960 (que tiene derechos de autor de Sociedades
 *      Bíblicas Unidas). Se activa poniendo YOUVERSION_APP_KEY + los IDs de
 *      versión en .env. Doc: https://developers.youversion.com/api-usage
 *   2. Respaldo de DOMINIO PÚBLICO (offline / sin key) — Reina-Valera 1909 (ES),
 *      João Ferreira de Almeida (PT), KJV (EN). Se usa solo si no hay key, y
 *      queda etiquetado como tal en meta para no confundirlo con RVR1960.
 *
 * La curación editorial (QUÉ versículo para cada emoción) vive aquí; el TEXTO
 * viene de la fuente. El versículo del día/por tema se cachea (Arq. §8.5).
 */
import { cache } from "../../core/cache.js";

const TTL_DIA = 60 * 60 * 12; // 12 h

// Curación editorial: tema emocional → referencia (USFM + display por idioma).
const REFERENCIAS = {
  ansiedad: { usfm: "PHP.4.6",  display: { es: "Filipenses 4:6", pt: "Filipenses 4:6", en: "Philippians 4:6" } },
  miedo:    { usfm: "ISA.41.10", display: { es: "Isaías 41:10",   pt: "Isaías 41:10",   en: "Isaiah 41:10" } },
  duelo:    { usfm: "PSA.34.18", display: { es: "Salmos 34:18",   pt: "Salmos 34:18",   en: "Psalm 34:18" } },
  gratitud: { usfm: "PSA.100.4", display: { es: "Salmos 100:4",   pt: "Salmos 100:4",   en: "Psalm 100:4" } },
  esperanza:{ usfm: "JER.29.11", display: { es: "Jeremías 29:11", pt: "Jeremias 29:11", en: "Jeremiah 29:11" } },
};

// Respaldo de DOMINIO PÚBLICO (NO es RVR1960). Solo si no hay YouVersion.
const FALLBACK = {
  ansiedad: {
    es: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.",
    pt: "Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças.",
    en: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
  },
  miedo: {
    es: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.",
    pt: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus que te esforço.",
    en: "Fear thou not; for I am with thee: be not dismayed; for I am thy God.",
  },
  duelo: {
    es: "Cercano está Jehová a los quebrantados de corazón; y salvará a los contritos de espíritu.",
    pt: "Perto está o Senhor dos que têm o coração quebrantado, e salva os contritos de espírito.",
    en: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.",
  },
  gratitud: {
    es: "Entrad por sus puertas con acción de gracias, por sus atrios con alabanza; alabadle, bendecid su nombre.",
    pt: "Entrai pelas suas portas com ação de graças, e em seus átrios com louvor; louvai-o, e bendizei o seu nome.",
    en: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.",
  },
  esperanza: {
    es: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.",
    pt: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor, pensamentos de paz, e não de mal, para vos dar o fim que esperais.",
    en: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
  },
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

/** ID de versión YouVersion por idioma (configurable en .env). */
function bibleIdFor(lang) {
  return {
    es: process.env.YOUVERSION_BIBLE_ID_ES, // p.ej. RVR1960
    pt: process.env.YOUVERSION_BIBLE_ID_PT,
    en: process.env.YOUVERSION_BIBLE_ID_EN,
  }[lang];
}

/** Limpia el texto del versículo (quita etiquetas/numeración/espacios). */
function limpiarTexto(s) {
  return (s || "")
    .replace(/<[^>]+>/g, " ")       // HTML
    .replace(/\s+/g, " ")
    .replace(/^\s*\d+\s*/, "")        // número de versículo al inicio
    .trim();
}

/**
 * Trae el texto del versículo desde YouVersion Platform.
 * Parser tolerante: la API es nueva (abril 2026); intenta varias formas de la
 * respuesta. Si la estructura difiere, ver scripts/youversion-setup.js (vuelca
 * el JSON crudo con tu key para ajustar este parser sin adivinar).
 * @returns {Promise<{referencia:string, texto:string}|null>}
 */
async function fetchYouVersion(usfm, lang, displayRef) {
  const key = process.env.YOUVERSION_APP_KEY;
  const bibleId = bibleIdFor(lang);
  if (!key || !bibleId) return null;

  const res = await fetch(`https://api.youversion.com/v1/bibles/${bibleId}/passages/${usfm}`, {
    headers: { "X-YVP-App-Key": key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`YouVersion ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();

  // Posibles ubicaciones del texto según la forma de la respuesta.
  const texto = limpiarTexto(
    data?.content ??
    data?.data?.content ??
    data?.passages?.[0]?.content ??
    data?.text ??
    data?.data?.text ??
    ""
  );
  if (!texto) throw new Error("YouVersion: respuesta sin texto reconocible (revisar scripts/youversion-setup.js)");

  const referencia =
    data?.reference ?? data?.data?.reference ?? data?.passages?.[0]?.reference ?? displayRef;
  return { referencia: typeof referencia === "string" ? referencia : displayRef, texto };
}

/**
 * @param {{ pregunta: string, lang: string, perfil?: any }} ctx
 * @returns {Promise<{tipo:"bible", tema:string, versiculo:{referencia,texto}, fuente_texto:string}>}
 */
export async function inyectarBiblia(ctx) {
  const lang = ["es", "pt", "en"].includes(ctx.lang) ? ctx.lang : "es";
  const tema = detectarTema(`${ctx.pregunta} ${ctx.perfil?.momento_espiritual || ""}`);
  const ref = REFERENCIAS[tema];
  const displayRef = ref.display[lang];
  const usarYV = !!process.env.YOUVERSION_APP_KEY && !!bibleIdFor(lang);

  const cacheKey = `aurora:verso:${usarYV ? "yv" : "local"}:${tema}:${lang}`;
  const { value } = await cache.wrap(cacheKey, TTL_DIA, async () => {
    if (usarYV) {
      try {
        const v = await fetchYouVersion(ref.usfm, lang, displayRef);
        if (v) return { tipo: "bible", tema, versiculo: v, fuente_texto: "youversion" };
      } catch (err) {
        // No sustituimos en silencio por otra versión: lo marcamos.
        return {
          tipo: "bible", tema,
          versiculo: { referencia: displayRef, texto: FALLBACK[tema][lang] },
          fuente_texto: "fallback_dominio_publico",
          aviso: `YouVersion falló (${err.message}); se usó respaldo de dominio público, NO RVR1960.`,
        };
      }
    }
    return {
      tipo: "bible", tema,
      versiculo: { referencia: displayRef, texto: FALLBACK[tema][lang] },
      fuente_texto: "dominio_publico_rvr1909",
    };
  });
  return value;
}
