/**
 * Servidor / API Gateway — Arquitectura §3.1.
 *
 * REST para datos; WebSocket para chat en tiempo real con la IA (mejor
 * experiencia de conversación). Multi-tenant: cada petición identifica la app.
 *
 * Endpoints:
 *   GET  /api/health                      estado + proveedor + caché
 *   GET  /api/apps                         apps activas (catálogo)
 *   GET  /api/apps/:appId/config           config pública de una app (piel, precios, idiomas)
 *   POST /api/apps/:appId/chat             { usuarioId, pregunta, lang?, conVoz? } → respuesta IA
 *   WS   /ws                               { appId, usuarioId, pregunta, lang? } → respuesta IA
 *   GET  /                                 cliente de chat de demostración
 */
import "dotenv/config";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { responder } from "./orchestrator/index.js";
import { getProvider, listProviders } from "./orchestrator/providers/index.js";
import { cache } from "./core/cache.js";
import { db } from "./core/db.js";
import { tenant } from "./middleware/tenant.js";
import { auth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" })); // 10mb para entrada multimodal (imágenes base64)

// CORS: permite que el frontend (Flutter Web en otro puerto) consuma el API.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-App-Id, X-User-Id");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: getProvider().name,
    providersDisponibles: listProviders(),
    cache: cache.stats(),
    persistencia: db.persistencia,
    apps: db.apps.find((a) => a.activo).map((a) => a.id),
  });
});

// Catálogo de proveedores de IA para la interfaz: modelo por defecto, si
// necesita key y si ya hay una en el entorno (.env). Nunca devuelve la key.
app.get("/api/providers", (_req, res) => {
  const catalogo = {
    mock: { label: "Mock (sin costo, sin key)", necesitaKey: false, modeloDefault: null, envKey: null },
    deepseek: { label: "DeepSeek (barato, recomendado)", necesitaKey: true, modeloDefault: process.env.DEEPSEEK_MODEL || "deepseek-chat", envKey: "DEEPSEEK_API_KEY" },
    openai: { label: "OpenAI (GPT)", necesitaKey: true, modeloDefault: process.env.OPENAI_MODEL || "gpt-4o-mini", envKey: "OPENAI_API_KEY" },
    anthropic: { label: "Anthropic (Claude)", necesitaKey: true, modeloDefault: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514", envKey: "ANTHROPIC_API_KEY" },
  };
  res.json(
    listProviders().map((id) => {
      const c = catalogo[id] || { label: id, necesitaKey: true, modeloDefault: null, envKey: null };
      return {
        id,
        label: c.label,
        necesitaKey: c.necesitaKey,
        modeloDefault: c.modeloDefault,
        keyEnEntorno: c.envKey ? !!process.env[c.envKey] : false,
      };
    })
  );
});

app.get("/api/apps", (_req, res) => {
  res.json(
    db.apps.find((a) => a.activo).map((a) => {
      const cfg = db.getAppConfig(a.id);
      return { id: a.id, nombre: a.nombre, sigla: a.sigla, vertical: cfg.vertical, idiomas: cfg.idiomas, piel: cfg.piel };
    })
  );
});

app.get("/api/apps/:appId/config", tenant, (req, res) => {
  const c = req.appConfig;
  res.json({
    id: c.id, nombre: c.nombre, vertical: c.vertical, idiomas: c.idiomas,
    idioma_default: c.idioma_default, modulos: c.modulos, precios: c.precios, piel: c.piel,
    personaje: { nombre: c.personaje.nombre, identidad: c.personaje.capa1_identidad },
  });
});

app.post("/api/apps/:appId/chat", tenant, auth, async (req, res) => {
  try {
    const { pregunta, lang, conVoz, provider, apiKey, model, imagenes } = req.body || {};
    if (!pregunta || !pregunta.trim()) return res.status(400).json({ error: "Falta 'pregunta'" });
    const r = await responder({
      appId: req.appId, usuarioId: req.usuarioId, pregunta, lang, conVoz, provider, apiKey, model, imagenes,
    });
    res.status(r.ok ? 200 : 502).json(r);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

const server = http.createServer(app);

// WebSocket para chat en tiempo real
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ tipo: "bienvenida", mensaje: "Conectado al núcleo AI-first" }));
  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return ws.send(JSON.stringify({ tipo: "error", error: "JSON inválido" }));
    }
    const { appId, usuarioId, pregunta, lang, conVoz, provider, apiKey, model, imagenes } = msg;
    if (!appId || !usuarioId || !pregunta) {
      return ws.send(JSON.stringify({ tipo: "error", error: "Faltan appId, usuarioId o pregunta" }));
    }
    try {
      const r = await responder({ appId, usuarioId, pregunta, lang, conVoz, provider, apiKey, model, imagenes });
      ws.send(JSON.stringify({ tipo: "respuesta", ...r }));
    } catch (err) {
      ws.send(JSON.stringify({ tipo: "error", error: err.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
// Conecta la persistencia (PostgreSQL si hay DATABASE_URL) antes de escuchar.
await db.init();
server.listen(PORT, () => {
  console.log(`\n  Núcleo AI-first escuchando en http://localhost:${PORT}`);
  console.log(`  Proveedor de IA: ${getProvider().name}  (AI_PROVIDER para cambiar)`);
  console.log(`  Persistencia: ${db.persistencia}`);
  console.log(`  Apps activas: ${db.apps.find((a) => a.activo).map((a) => a.id).join(", ")}`);
  console.log(`  Cliente de demo: http://localhost:${PORT}/\n`);
});
