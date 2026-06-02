/**
 * Inyector de conocimiento GENÉRICO ("corpus") — Plantilla Capa 3.
 *
 * Generaliza la idea de bible.js / ephemeris.js: cualquier app puede declarar
 * una fuente de conocimiento curado por CONFIGURACIÓN, sin tocar el motor:
 *
 *   "capa3_conocimiento_curado": { "fuente": "corpus", "dataset": "legal" }
 *
 * El dataset vive en ./data/corpus_<dataset>.json y la IA recibe el dato tal
 * cual (no lo inventa). Si no hay coincidencia, se marca encontrado=false y el
 * personaje (Capa 4) debe decir que no está disponible y derivar a la fuente
 * oficial. Este módulo se construye UNA vez y lo reutilizan todas las apps de
 * tipo "texto + conocimiento curado" (legal, banco de preguntas, guías, etc.).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "data");

const _cache = {};
function loadDataset(name) {
  if (!_cache[name]) {
    _cache[name] = JSON.parse(fs.readFileSync(path.join(DATA, `corpus_${name}.json`), "utf8"));
  }
  return _cache[name];
}

/**
 * @param {{pregunta:string, lang:string, perfil?:any}} ctx
 * @param {{dataset:string}} cfg  (de capa3_conocimiento_curado)
 */
export function inyectarCorpus(ctx, cfg) {
  const lang = ["es", "pt", "en"].includes(ctx.lang) ? ctx.lang : "es";
  const ds = loadDataset(cfg.dataset);
  const q = `${ctx.pregunta} ${ctx.perfil?.tema || ""}`.toLowerCase();

  const item = (ds.items || []).find((it) =>
    (it.temas || []).some((tm) => q.includes(String(tm).toLowerCase()))
  );

  if (!item) {
    return {
      tipo: "corpus",
      dataset: cfg.dataset,
      encontrado: false,
      nota: (ds.sin_resultado && ds.sin_resultado[lang]) || "Sin coincidencia en la fuente curada.",
      fuente_texto: `corpus:${cfg.dataset}`,
      cacheable: false,
    };
  }

  const contenido = item[lang] || item.es;
  return {
    tipo: "corpus",
    dataset: cfg.dataset,
    encontrado: true,
    ref: item.ref || item.id,
    item: contenido,
    fuente_texto: `corpus:${cfg.dataset}:${ds.licencia || "demo"}`,
    cacheable: true,
    cacheKey: `corpus:${cfg.dataset}:${item.id}:${lang}`,
  };
}
