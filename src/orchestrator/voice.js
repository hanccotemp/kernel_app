/**
 * Capa de voz (STT + TTS) — Arquitectura §2 sub-componente / §8.4 "voz por fases".
 *
 * Texto en el plan base; respuesta hablada (TTS) como add-on premium. El
 * proveedor de voz es intercambiable y autoalojable.
 *
 * Aquí son STUBS con la interfaz correcta. En producción se conecta un STT
 * (entrada de voz → texto) y un TTS (texto → audio) reales. El orquestador ya
 * llama a esta capa solo cuando el usuario tiene el add-on de voz.
 */

/** STT: audio → texto. Stub. */
export async function speechToText(_audioBuffer, _lang) {
  // En producción: Whisper autoalojado / proveedor STT.
  return { texto: "", stub: true };
}

/**
 * TTS: texto → audio. Stub (devuelve metadatos, no audio real).
 * @param {string} texto
 * @param {string} lang
 */
export async function textToSpeech(texto, lang) {
  // En producción: TTS intercambiable (autoalojable). Devolvería un audio URL/buffer.
  return {
    stub: true,
    formato: "audio/mpeg",
    lang,
    chars: (texto || "").length,
    nota: "TTS no conectado en esta build. Add-on premium listo para enchufar.",
  };
}
