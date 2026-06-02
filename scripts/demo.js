/**
 * Demo de extremo a extremo del Orquestador — sin servidor, sin npm install.
 *   node scripts/demo.js
 *
 * Ejercita: multi-tenant (Sina + Aurora), inyección de conocimiento curado,
 * memoria entre turnos, filtro de límites, caché y la capa de proveedor (mock).
 */
import { responder } from "../src/orchestrator/index.js";
import { filtrarSalida } from "../src/orchestrator/safety.js";
import { getPersonaje } from "../src/orchestrator/characterManager.js";
import { cache } from "../src/core/cache.js";

const line = (s = "") => console.log(s);
const hr = () => line("-".repeat(64));

function show(titulo, r) {
  hr();
  line(`> ${titulo}`);
  line(`  app: ${r.meta.appId} · personaje: ${r.meta.personaje} · idioma: ${r.meta.lang} · ${r.meta.ms}ms`);
  line(`  proveedor: ${r.meta.provider} · conocimiento: ${JSON.stringify(r.meta.conocimiento)}`);
  if (r.voz) line(`  voz: TTS preparado (add-on premium) -> ${r.voz.chars} chars`);
  line(`  IA -> ${r.texto}`);
}

const run = async () => {
  line("\n=== DEMO · Nucleo AI-first (Orquestador de IA) ===");

  show(
    "Aurora · usuario Joao · PT · momento de ansiedad",
    await responder({
      appId: "aurora",
      usuarioId: "u_joao",
      pregunta: "Ando muito ansioso com o trabalho, nao consigo dormir.",
      lang: "pt",
    })
  );

  show(
    "Sina · usuaria Ana · PT · pregunta de pareja (premium con voz)",
    await responder({
      appId: "sina",
      usuarioId: "u_ana",
      pregunta: "Como esta meu momento para o amor esta semana?",
      lang: "pt",
      conVoz: true,
    })
  );

  show(
    "Aurora · Joao · segundo turno (debe recordar lo anterior)",
    await responder({
      appId: "aurora",
      usuarioId: "u_joao",
      pregunta: "Hoje estou um pouco melhor, grato por isso.",
      lang: "pt",
    })
  );

  hr();
  line("> Filtro de limites (Capa 4) · salida simulada del modelo con frase prohibida");
  const personajeAurora = getPersonaje("aurora");
  const salidaPeligrosa = "Tranquilo, Dios te castiga por eso, no tienes salvacion.";
  const filtrado = filtrarSalida(salidaPeligrosa, personajeAurora, "es");
  line(`  modelo (simulado) -> "${salidaPeligrosa}"`);
  line(`  bloqueado: ${filtrado.bloqueado} (${filtrado.motivo || "-"})`);
  line(`  entregado al usuario -> ${filtrado.texto}`);

  await responder({ appId: "aurora", usuarioId: "u_joao", pregunta: "Estou ansioso de novo.", lang: "pt" });
  hr();
  line(`> Estadisticas de cache (versiculo/mapa del dia): ${JSON.stringify(cache.stats())}`);
  hr();
  line("OK Demo completa.\n");
};

run().catch((e) => {
  console.error("Error en demo:", e);
  process.exit(1);
});
