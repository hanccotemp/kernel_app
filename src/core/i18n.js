/**
 * i18n — el perfil del personaje define el comportamiento; el idioma de SALIDA
 * se controla por la preferencia del usuario (ES / PT / EN). Plantilla §D.7.
 *
 * Aquí solo viven los textos del SISTEMA (errores, instrucción de idioma para
 * el modelo). El contenido editorial de cada app vive en su CMS/Contenido.
 */
export const IDIOMAS = ["es", "pt", "en"];

const STRINGS = {
  es: {
    instruccion_idioma: "Responde SIEMPRE en español.",
    fuera_de_alcance: "Eso queda fuera de lo que puedo acompañar.",
    sin_suscripcion: "Esta función es premium. Activa tu plan para continuar.",
    error_modelo: "Tuve un problema para responder. Intenta de nuevo en un momento.",
  },
  pt: {
    instruccion_idioma: "Responda SEMPRE em português do Brasil.",
    fuera_de_alcance: "Isso está fora do que eu posso acompanhar.",
    sin_suscripcion: "Este recurso é premium. Ative seu plano para continuar.",
    error_modelo: "Tive um problema para responder. Tente novamente em instantes.",
  },
  en: {
    instruccion_idioma: "Always answer in English.",
    fuera_de_alcance: "That falls outside what I can help you with.",
    sin_suscripcion: "This is a premium feature. Activate your plan to continue.",
    error_modelo: "I had trouble responding. Please try again in a moment.",
  },
};

/** @param {string} lang @returns {string} idioma válido (fallback es) */
export function normalizeLang(lang) {
  return IDIOMAS.includes(lang) ? lang : "es";
}

/** @param {string} key @param {string} lang */
export function t(key, lang) {
  const l = normalizeLang(lang);
  return STRINGS[l][key] ?? STRINGS.es[key] ?? key;
}
