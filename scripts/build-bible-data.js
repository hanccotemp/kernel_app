/**
 * Construye los datos bíblicos locales de DOMINIO PÚBLICO para Aurora.
 *   node scripts/build-bible-data.js
 *
 * Toma el TEXTO (de dominio público por antigüedad) de tres versiones y lo
 * reempaca en archivos propios y compactos (es/pt/en.json), SIN los metadatos
 * de licencia del módulo de origen (esos aplican al archivo del distribuidor,
 * no al texto bíblico, que es de dominio público y no es "recapturable").
 *
 *   es → Reina Valera (1909)  · PD por antigüedad (eBible.org lo confirma como Public Domain)
 *   en → King James Version   · PD (texto 1611/1769)
 *   pt → João Ferreira de Almeida (antiga) · PD por antigüedad
 *
 * Fuente del texto: getbible.net (solo se usa el texto; se descarta su envoltura).
 * Estructura de salida: { lang, version, licencia, fuente, libros{nr:nombre}, verses{"b.c.v":texto} }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "src", "orchestrator", "knowledge", "data");
fs.mkdirSync(DATA, { recursive: true });

const SOURCES = {
  es: { code: "valera",  version: "Reina Valera (1909)",                 basis: "Dominio público por antigüedad (texto de 1909); eBible.org lo lista como Public Domain." },
  en: { code: "kjv",     version: "King James Version",                  basis: "Dominio público (texto de 1611/1769)." },
  pt: { code: "almeida", version: "João Ferreira de Almeida (antiga)",   basis: "Dominio público por antigüedad." },
};

async function load(code) {
  const local = path.join(DATA, `${code}.json`);
  if (fs.existsSync(local)) return JSON.parse(fs.readFileSync(local, "utf8"));
  const res = await fetch(`https://api.getbible.net/v2/${code}.json`);
  if (!res.ok) throw new Error(`No se pudo bajar ${code}: HTTP ${res.status}`);
  return res.json();
}

for (const [lang, s] of Object.entries(SOURCES)) {
  const raw = await load(s.code);
  const libros = {};
  const verses = {};
  for (const b of raw.books) {
    libros[b.nr] = b.name;
    for (const c of b.chapters) {
      for (const v of c.verses) {
        verses[`${b.nr}.${c.chapter}.${v.verse}`] = String(v.text).replace(/\s+/g, " ").trim();
      }
    }
  }
  const out = {
    lang,
    version: s.version,
    licencia: `Dominio público. ${s.basis}`,
    fuente: `Texto de dominio público (vía getbible.net, código '${s.code}'), reempacado por el proyecto sin metadatos del módulo.`,
    libros,
    verses,
  };
  fs.writeFileSync(path.join(DATA, `${lang}.json`), JSON.stringify(out));
  console.log(`  ${lang}.json  versículos=${Object.keys(verses).length}  libros=${Object.keys(libros).length}`);
}
console.log("OK datos bíblicos de dominio público construidos en src/orchestrator/knowledge/data/");
