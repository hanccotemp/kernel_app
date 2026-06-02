/**
 * Auth mínima (demo) — Arquitectura §3.2 (Auth: email / Google / Apple).
 *
 * Esta es una versión de andamiaje: toma el usuario de X-User-Id / body. En
 * producción se valida un JWT emitido tras el login social, y se aísla por app.
 */
export function auth(req, res, next) {
  const usuarioId = req.header("X-User-Id") || req.body?.usuarioId;
  if (!usuarioId) return res.status(401).json({ error: "Falta identificar al usuario (X-User-Id)" });
  req.usuarioId = usuarioId;
  next();
}
