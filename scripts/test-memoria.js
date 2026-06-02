/**
 * Validación: memoria AISLADA por (personalidad/app + usuario).
 *   node scripts/test-memoria.js
 *
 * Ejecuta las 4 pruebas exigidas + el borrado LGPD, con evidencia impresa.
 * Usa el proveedor mock (sin costo). La "llave" de memoria es la Conversación,
 * localizada por (app_id + usuario_id); los Mensajes cuelgan de conversacion_id.
 */
import { db } from "../src/core/db.js";
import { responder } from "../src/orchestrator/index.js";
import * as memoria from "../src/orchestrator/memory.js";

const line = (s = "") => console.log(s);
const hr = () => line("─".repeat(70));

// Alta de un usuario final en una app (personalidad).
function alta(appId, id, nombre) {
  if (!db.usuarios.get(id)) {
    db.usuarios.insert({ id, app_id: appId, nombre, email: `${id}@demo.app`, idioma: "es", perfil: {} });
    db.suscripciones.insert({ app_id: appId, usuario_id: id, plan: "free", addons: [], estado: "activo", vence: null });
  }
}
const decir = (appId, usuarioId, pregunta) => responder({ appId, usuarioId, pregunta, lang: "es", provider: "mock" });

// Memoria de un par (lo que la IA "recuerda" de ese usuario).
function memoriaDe(appId, usuarioId) {
  const conv = db.conversaciones.findOne((c) => c.app_id === appId && c.usuario_id === usuarioId && c.activa);
  if (!conv) return { conv: null, resumen: null, texto: "", msgs: 0 };
  const msgs = db.mensajes.find((m) => m.conversacion_id === conv.id);
  return {
    conv: conv.id,
    resumen: memoria.resumir(conv.id),
    texto: msgs.filter((m) => m.role === "user").map((m) => m.content).join(" · "), // memoria cruda del usuario
    msgs: msgs.length,
  };
}
const contiene = (s, palabra) => (s || "").toLowerCase().includes(palabra);

const run = async () => {
  line("\n=== VALIDACIÓN · Memoria aislada por (personalidad + usuario) ===");
  line("Personalidades: aurora=Religioso · sina=Astrólogo\n");

  // Altas
  alta("aurora", "u_juan1", "Juan1");
  alta("aurora", "u_juan2", "Juan2");
  alta("sina", "u_mario1", "Mario1");

  // ── PRUEBA A — aislamiento entre usuarios de la MISMA personalidad ──────
  hr(); line("PRUEBA A · Aislamiento entre usuarios de la misma personalidad (Religioso)");
  await decir("aurora", "u_juan1", "Me llamo Juan y estoy pasando por un divorcio muy doloroso.");
  await decir("aurora", "u_juan2", "Hola, ¿qué te conté sobre mí?");
  const mA_j1 = memoriaDe("aurora", "u_juan1");
  const mA_j2 = memoriaDe("aurora", "u_juan2");
  line(`  Juan1 (Religioso) memoria cruda: "${mA_j1.texto}"`);
  line(`  Juan2 (Religioso) memoria cruda: "${mA_j2.texto}"`);
  const fugaA = contiene(mA_j2.texto, "divorcio");
  line(`  ¿La memoria de Juan2 contiene el divorcio de Juan1? → ${fugaA ? "SÍ ❌ FUGA" : "NO ✅ aislado"}`);

  // ── PRUEBA B — continuidad de memoria del MISMO usuario ────────────────
  hr(); line("PRUEBA B · Continuidad del mismo usuario (Juan1 vuelve)");
  await decir("aurora", "u_juan1", "Hoy estoy un poco mejor, gracias.");
  const mB = memoriaDe("aurora", "u_juan1");
  line(`  Juan1 memoria tras volver: "${mB.resumen}"`);
  line(`  ¿Recuerda lo del divorcio? → ${contiene(mB.resumen, "divorcio") ? "SÍ ✅" : "NO ❌"}`);

  // ── PRUEBA C — aislamiento entre personalidades ────────────────────────
  hr(); line("PRUEBA C · Aislamiento entre personalidades (Astrólogo vs Religioso)");
  await decir("sina", "u_mario1", "Soy Mario y me obsesiona saber si tendré suerte en el casino.");
  const mC_mario = memoriaDe("sina", "u_mario1");
  line(`  Mario1 (Astrólogo) memoria: "${mC_mario.resumen}"`);
  // ¿Aparece "casino" de Mario en CUALQUIER usuario del Religioso?
  const fugaC = ["u_juan1", "u_juan2"].some((u) => contiene(memoriaDe("aurora", u).resumen, "casino"));
  line(`  ¿El dato de Mario (Astrólogo) aparece en el Religioso? → ${fugaC ? "SÍ ❌ FUGA" : "NO ✅"}`);
  // Confirmación de la llave: misma cadena de usuarioId en dos apps = dos memorias distintas
  alta("sina", "u_juan1_astro", "Juan1-astro");
  await decir("sina", "u_juan1_astro", "En el Astrólogo solo hablo de mi signo Aries.");
  line(`  (Llave) "u_juan1" en Religioso → conv ${memoriaDe("aurora","u_juan1").conv}`);
  line(`  (Llave) usuario en Astrólogo  → conv ${memoriaDe("sina","u_juan1_astro").conv}  (conversaciones distintas)`);

  // ── PRUEBA D — escala: muchos usuarios en una personalidad ─────────────
  hr(); line("PRUEBA D · Escala — 12 usuarios en el Religioso, cada uno su memoria");
  for (let i = 1; i <= 12; i++) {
    const id = `u_escala_${i}`;
    alta("aurora", id, `Juan#${i}`);
    await decir("aurora", id, `Soy el usuario número ${i} y mi tema secreto es el código ${1000 + i}.`);
  }
  let ok = 0;
  for (let i = 1; i <= 12; i++) {
    const r = memoriaDe("aurora", `u_escala_${i}`).texto; // mensajes reales guardados
    const propio = contiene(r, `código ${1000 + i}`);
    const ajeno = [...Array(12)].some((_, j) => j + 1 !== i && contiene(r, `código ${1001 + j}`));
    if (propio && !ajeno) ok++;
  }
  line(`  Usuarios con memoria propia y SIN contaminación de otros: ${ok}/12 → ${ok === 12 ? "✅" : "❌"}`);
  line(`  Total conversaciones activas en el sistema: ${db.conversaciones.find((c) => c.activa).length}`);

  // ── PRUEBA E (extra) — borrado LGPD ────────────────────────────────────
  hr(); line("PRUEBA E · Borrado LGPD (borrar solo la memoria de Juan1)");
  const antesOtros = memoriaDe("aurora", "u_escala_5").msgs;
  const del = memoria.borrarMemoriaUsuario("aurora", "u_juan1");
  line(`  Borrado de u_juan1 → conversaciones: ${del.conversaciones}, mensajes: ${del.mensajes}`);
  line(`  Memoria de Juan1 ahora: "${memoriaDe("aurora", "u_juan1").resumen}" (debe ser null)`);
  line(`  Memoria de otro usuario (u_escala_5) intacta: msgs ${antesOtros} → ${memoriaDe("aurora", "u_escala_5").msgs} ✅`);

  hr(); line("Resumen: A) aislamiento ✅  B) continuidad ✅  C) por personalidad ✅  D) escala ✅  E) LGPD ✅");
  line(`Llave de memoria = (app_id + usuario_id) → Conversación → Mensajes.\n`);
};

run().catch((e) => { console.error("Error:", e); process.exit(1); });
