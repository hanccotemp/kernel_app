/**
 * Proveedor MOCK — permite correr y demostrar todo el núcleo SIN API key ni
 * costo. No es un modelo real: arma una respuesta plausible respetando el
 * personaje, el idioma y el conocimiento curado inyectado.
 *
 * Sirve para: pruebas, CI, y "sentir" el flujo completo offline. En producción
 * se selecciona otro proveedor con AI_PROVIDER=deepseek|anthropic|openai.
 */
export const mockProvider = {
  name: "mock",
  /**
   * @param {{ system: string, messages: {role:string,content:string}[], meta?: any }} req
   */
  async complete({ system, messages, meta = {} }) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const pregunta = lastUser ? lastUser.content : "";
    const lang = meta.lang || "es";
    const nombre = meta.nombreUsuario || "";
    const fuente = meta.knowledge?.tipo;
    const imgNota = meta.imagenes?.length ? ` [recibí ${meta.imagenes.length} imagen(es) y las tomaría en cuenta]` : "";

    let cuerpo;
    if (fuente === "bible" && meta.knowledge?.versiculo) {
      const v = meta.knowledge.versiculo;
      cuerpo = {
        es: `Estoy contigo${nombre ? ", " + nombre : ""}. Dios sostiene tu corazón en esto. «${v.texto}» (${v.referencia}). Oremos: que su paz te acompañe hoy.`,
        pt: `Estou com você${nombre ? ", " + nombre : ""}. Deus sustenta o seu coração nisto. «${v.texto}» (${v.referencia}). Oremos: que a paz dele te acompanhe hoje.`,
        en: `I'm with you${nombre ? ", " + nombre : ""}. God holds your heart in this. "${v.texto}" (${v.referencia}). Let's pray: may His peace be with you today.`,
      }[lang];
    } else if (fuente === "ephemeris" && meta.knowledge?.mapa) {
      const m = meta.knowledge.mapa;
      cuerpo = {
        es: `${nombre ? nombre + ", " : ""}con tu Sol en ${m.sol} y Luna en ${m.luna}, hoy ${m.transito_clave}. Es buen momento para dar un paso pequeño y concreto en lo que te importa.`,
        pt: `${nombre ? nombre + ", " : ""}com seu Sol em ${m.sol} e Lua em ${m.luna}, hoje ${m.transito_clave}. É um bom momento para dar um passo pequeno e concreto no que importa para você.`,
        en: `${nombre ? nombre + ", " : ""}with your Sun in ${m.sol} and Moon in ${m.luna}, today ${m.transito_clave}. A good moment to take one small, concrete step toward what matters to you.`,
      }[lang];
    } else {
      cuerpo = {
        es: `Te escucho. Sobre "${pregunta}", aquí tienes una reflexión breve y un paso concreto.`,
        pt: `Eu te escuto. Sobre "${pregunta}", aqui vai uma reflexão breve e um passo concreto.`,
        en: `I hear you. About "${pregunta}", here's a brief reflection and one concrete step.`,
      }[lang];
    }

    return {
      text: cuerpo + imgNota,
      provider: "mock",
      tokens: { prompt: estimate(system + pregunta), completion: estimate(cuerpo) },
    };
  },
};

function estimate(s) {
  return Math.ceil((s || "").length / 4);
}
