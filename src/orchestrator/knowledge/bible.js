/**
 * Inyector de conocimiento — Aurora (fe). Plantilla Capa 3 / Arquitectura §8.2.
 *
 * Regla absoluta: la IA NUNCA parafrasea ni inventa la Biblia. El versículo
 * exacto y su referencia se INYECTAN desde esta fuente y se le entregan al
 * modelo como dato duro. El modelo solo acompaña/ora alrededor del texto.
 *
 * Aquí se usa un conjunto curado de versículos en traducciones de DOMINIO
 * PÚBLICO (Reina-Valera 1909 · João Ferreira de Almeida · KJV). En producción
 * se reemplaza por la YouVersion Platform u otra fuente con licencia,
 * idealmente con contenido validado por un pastor/teólogo.
 *
 * El versículo del día / por tema es cacheable (Redis) — Arquitectura §8.5.
 */

// Pequeña biblioteca curada por tema emocional (dominio público).
const VERSICULOS = {
  ansiedad: {
    es: { referencia: "Filipenses 4:6", texto: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias." },
    pt: { referencia: "Filipenses 4:6", texto: "Não estejais inquietos por coisa alguma; antes as vossas petições sejam em tudo conhecidas diante de Deus pela oração e súplica, com ação de graças." },
    en: { referencia: "Philippians 4:6", texto: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God." },
  },
  miedo: {
    es: { referencia: "Isaías 41:10", texto: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo." },
    pt: { referencia: "Isaías 41:10", texto: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus que te esforço." },
    en: { referencia: "Isaiah 41:10", texto: "Fear thou not; for I am with thee: be not dismayed; for I am thy God." },
  },
  duelo: {
    es: { referencia: "Salmos 34:18", texto: "Cercano está Jehová a los quebrantados de corazón; y salvará a los contritos de espíritu." },
    pt: { referencia: "Salmos 34:18", texto: "Perto está o Senhor dos que têm o coração quebrantado, e salva os contritos de espírito." },
    en: { referencia: "Psalm 34:18", texto: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit." },
  },
  gratitud: {
    es: { referencia: "Salmos 100:4", texto: "Entrad por sus puertas con acción de gracias, por sus atrios con alabanza; alabadle, bendecid su nombre." },
    pt: { referencia: "Salmos 100:4", texto: "Entrai pelas suas portas com ação de graças, e em seus átrios com louvor; louvai-o, e bendizei o seu nome." },
    en: { referencia: "Psalm 100:4", texto: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name." },
  },
  esperanza: {
    es: { referencia: "Jeremías 29:11", texto: "Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis." },
    pt: { referencia: "Jeremias 29:11", texto: "Porque eu bem sei os pensamentos que penso de vós, diz o Senhor, pensamentos de paz, e não de mal, para vos dar o fim que esperais." },
    en: { referencia: "Jeremiah 29:11", texto: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end." },
  },
};

const DEFAULT_TEMA = "esperanza";

// Clasificación simple por palabras clave (ES/PT/EN). En prod: clasificador.
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
 * @param {{ pregunta: string, lang: string, perfil?: any }} ctx
 * @returns {{ tipo: "bible", tema: string, versiculo: {referencia:string,texto:string} }}
 */
export function inyectarBiblia(ctx) {
  const lang = ["es", "pt", "en"].includes(ctx.lang) ? ctx.lang : "es";
  const tema = detectarTema(`${ctx.pregunta} ${ctx.perfil?.momento_espiritual || ""}`);
  const versiculo = VERSICULOS[tema][lang];
  return { tipo: "bible", tema, versiculo, cacheable: true, cacheKey: `aurora:verso:${tema}:${lang}` };
}
