/**
 * Control de acceso por roles (RBAC) — Arquitectura §6.
 *
 * Importante: este RBAC es para el BACK-OFFICE (equipo interno, editores,
 * soporte, contador). Los usuarios finales NO usan esto: se rigen por
 * "plan (free/premium) + dueño de sus propios datos" (ver subscriptions.js).
 *
 * v1: 2-3 roles fijos por app, sin panel configurable (§6.6). El modelo de
 * datos ya nace preparado para el panel completo y para permisos por campo /
 * auditoría (§6.5).
 */
import { db } from "./db.js";

/**
 * ¿Puede este usuario de back-office hacer `accion` sobre `objetoNombre` en `appId`?
 * Flujo §6.4: identifica rol del usuario en la app → busca permiso sobre el objeto.
 * @param {string} usuarioId
 * @param {string} appId
 * @param {string} objetoNombre
 * @param {"ver"|"agregar"|"editar"|"eliminar"} accion
 */
export function puede(usuarioId, appId, objetoNombre, accion) {
  const asignaciones = db.usuarioRoles.find(
    (ur) => ur.usuario_id === usuarioId && ur.app_id === appId
  );
  if (asignaciones.length === 0) return false;

  const objeto = db.objetos.findOne(
    (o) => o.app_id === appId && o.nombre === objetoNombre && o.activo
  );
  if (!objeto) return false;

  for (const a of asignaciones) {
    const permiso = db.permisos.findOne(
      (p) => p.rol_id === a.rol_id && p.objeto_id === objeto.id
    );
    if (permiso && permiso[accion] === true) {
      audit(usuarioId, appId, objetoNombre, accion, "permitido");
      return true;
    }
  }
  audit(usuarioId, appId, objetoNombre, accion, "bloqueado");
  return false;
}

/** Auditoría (§6.5, recomendable para datos sensibles). Aquí: log simple. */
const auditLog = [];
function audit(usuarioId, appId, objeto, accion, resultado) {
  auditLog.push({ ts: new Date().toISOString(), usuarioId, appId, objeto, accion, resultado });
}
export function getAuditLog() {
  return auditLog.slice();
}
