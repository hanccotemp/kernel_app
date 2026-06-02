/**
 * Fábrica de proveedores (capa de abstracción intercambiable) — Arquitectura
 * §2 sub-componente "Capa de proveedor" y §8.1 ("obligatoria").
 *
 * Permite cambiar entre DeepSeek / OpenAI / Anthropic / mock SIN tocar el resto
 * del sistema. Protege el margen: si un proveedor sube de precio o baja de
 * calidad, se cambia una variable de entorno.
 *
 *   AI_PROVIDER = mock (default) | deepseek | anthropic | openai
 */
import { mockProvider } from "./mock.js";
import { deepseekProvider } from "./deepseek.js";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";

const PROVIDERS = {
  mock: mockProvider,
  deepseek: deepseekProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

export function getProvider(name) {
  const key = (name || process.env.AI_PROVIDER || "mock").toLowerCase();
  const p = PROVIDERS[key];
  if (!p) throw new Error(`Proveedor de IA desconocido: ${key}`);
  return p;
}

export function listProviders() {
  return Object.keys(PROVIDERS);
}
