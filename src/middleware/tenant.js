/**
 * Middleware multi-tenant — Arquitectura §3.1 (API Gateway).
 *
 * Cada petición trae la identidad de la app (header X-App-Id, o :appId en la
 * ruta). El núcleo responde con la config de esa app. Sin app válida → 400.
 */
import { db } from "../core/db.js";

export function tenant(req, res, next) {
  const appId = req.params.appId || req.header("X-App-Id") || req.body?.appId;
  if (!appId) return res.status(400).json({ error: "Falta identificar la app (X-App-Id)" });
  const cfg = db.getAppConfig(appId);
  if (!cfg) return res.status(404).json({ error: `App desconocida: ${appId}` });
  if (!cfg.activo) return res.status(403).json({ error: `App inactiva: ${appId}` });
  req.appId = appId;
  req.appConfig = cfg;
  next();
}
