/**
 * Asistente de configuración de YouVersion Platform.
 *   node scripts/youversion-setup.js
 *
 * Requiere YOUVERSION_APP_KEY en .env (regístrate y crea una app en
 * https://developers.youversion.com y acepta las licencias de las versiones).
 *
 * Hace dos cosas:
 *   1. Lista las versiones disponibles (filtra español/portugués/inglés) con su
 *      ID → para encontrar el ID de RVR1960 y ponerlo en YOUVERSION_BIBLE_ID_ES.
 *   2. Si pasas un ID, trae Juan 3:16 en CRUDO → para confirmar la forma exacta
 *      de la respuesta y ajustar el parser de bible.js sin adivinar.
 *
 * Uso:
 *   node scripts/youversion-setup.js              # lista versiones
 *   node scripts/youversion-setup.js 3034         # vuelca JHN.3.16 de ese ID
 */
import "dotenv/config";

const BASE = "https://api.youversion.com/v1";
const KEY = process.env.YOUVERSION_APP_KEY;

if (!KEY) {
  console.error("\n  Falta YOUVERSION_APP_KEY en .env.");
  console.error("  Crea una app en https://developers.youversion.com y acepta las licencias.\n");
  process.exit(1);
}

const headers = { "X-YVP-App-Key": KEY, Accept: "application/json" };

async function listarVersiones() {
  console.log("\n== Versiones disponibles (es/pt/en) ==");
  const res = await fetch(`${BASE}/bibles`, { headers });
  if (!res.ok) {
    console.error(`  Error ${res.status}: ${await res.text()}`);
    console.error("  (Si es 4xx por licencia, acepta las licencias de las versiones en el portal.)");
    return;
  }
  const data = await res.json();
  const lista = data.bibles || data.data || data.items || [];
  if (!Array.isArray(lista) || !lista.length) {
    console.log("  Respuesta inesperada; JSON crudo:\n", JSON.stringify(data, null, 2).slice(0, 2000));
    return;
  }
  for (const b of lista) {
    const lang = (b.language?.iso_639_1 || b.language_code || b.language || "").toString().toLowerCase();
    if (!["es", "pt", "en"].some((l) => lang.includes(l))) continue;
    console.log(`  id=${b.id ?? b.bible_id}  [${lang}]  ${b.abbreviation || b.abbr || ""}  ${b.name || b.title || ""}`);
  }
  console.log("\n  → Pon el id de RVR1960 (es) en YOUVERSION_BIBLE_ID_ES, y los de PT/EN.\n");
}

async function volcarMuestra(id) {
  console.log(`\n== Muestra cruda: bible ${id} · JHN.3.16 ==`);
  const res = await fetch(`${BASE}/bibles/${id}/passages/JHN.3.16`, { headers });
  console.log(`  HTTP ${res.status}`);
  const txt = await res.text();
  console.log(txt.slice(0, 2000));
  console.log("\n  → Con esto confirmamos dónde viene el texto y ajustamos bible.js.\n");
}

const idArg = process.argv[2];
if (idArg) await volcarMuestra(idArg);
else await listarVersiones();
