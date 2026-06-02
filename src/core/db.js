/**
 * Modelo de datos genérico (filosofía Odoo) — Arquitectura §5.
 *
 * Datos abstractos y configurables, NO cableados a "astrología". Agregar una
 * app o un tipo de contenido nuevo = configurar, no reprogramar el esquema.
 *
 * Esta es una implementación en memoria con la MISMA forma que tendría en
 * PostgreSQL (AWS São Paulo). Se reemplaza por un repositorio SQL manteniendo
 * la interfaz pública (find/insert/update). El resto del sistema no cambia.
 *
 * Entidades núcleo: App · Usuario · Suscripcion · Conversacion · Mensaje ·
 * Recurso (ítem abstracto) · Config.
 * Entidades de seguridad (RBAC, §6): Objeto · Rol · Permiso · UsuarioRol.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPS_DIR = path.join(__dirname, "..", "config", "apps");

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Tabla genérica en memoria con CRUD mínimo. */
class Table {
  constructor(name) {
    this.name = name;
    /** @type {Map<string, any>} */
    this.rows = new Map();
  }
  insert(row) {
    const id = row.id ?? genId(this.name.slice(0, 3));
    const record = { ...row, id };
    this.rows.set(id, record);
    if (this.persist) this.persist("upsert", record);
    return record;
  }
  get(id) {
    return this.rows.get(id);
  }
  update(id, patch) {
    const cur = this.rows.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    this.rows.set(id, next);
    if (this.persist) this.persist("upsert", next);
    return next;
  }
  find(predicate) {
    return [...this.rows.values()].filter(predicate);
  }
  remove(id) {
    const ok = this.rows.delete(id);
    if (this.persist) this.persist("remove", id);
    return ok;
  }
  findOne(predicate) {
    return [...this.rows.values()].find(predicate);
  }
  all() {
    return [...this.rows.values()];
  }
}

class DB {
  constructor() {
    this.apps = new Table("app");
    this.usuarios = new Table("usuario");
    this.suscripciones = new Table("suscripcion");
    this.conversaciones = new Table("conversacion");
    this.mensajes = new Table("mensaje");
    this.recursos = new Table("recurso"); // ítem abstracto (tarot, versículo, tránsito…)
    this.config = new Table("config");

    // RBAC (back-office)
    this.objetos = new Table("objeto");
    this.roles = new Table("rol");
    this.permisos = new Table("permiso");
    this.usuarioRoles = new Table("usuario_rol");

    this._loadApps();
    this._seed();
    this.persistencia = "memoria"; // se actualiza en init() si hay PostgreSQL
  }

  /**
   * Conecta la persistencia (PostgreSQL) si hay DATABASE_URL. Mantiene la misma
   * interfaz: el resto del núcleo no cambia. Idempotente y opcional (sin
   * DATABASE_URL, el sistema corre 100% en memoria como antes).
   */
  async init() {
    const url = process.env.DATABASE_URL;
    if (!url) return this;

    const tablas = {
      usuario: this.usuarios,
      suscripcion: this.suscripciones,
      conversacion: this.conversaciones,
      mensaje: this.mensajes,
    };

    // Si PostgreSQL no responde, NO se cae el servidor: cae a modo memoria.
    try {
      const { PgStore } = await import("./pgstore.js");
      this.store = new PgStore(url);
      await this.store.init(Object.keys(tablas));

      if ((await this.store.count("usuario")) > 0) {
        // PostgreSQL es la fuente de verdad: descartar el seed en memoria e hidratar.
        for (const [name, tabla] of Object.entries(tablas)) {
          tabla.rows.clear();
          for (const row of await this.store.loadAll(name)) tabla.rows.set(row.id, row);
        }
        this.persistencia = "postgres (datos hidratados)";
      } else {
        // Primer arranque: subir el seed actual a PostgreSQL.
        for (const [name, tabla] of Object.entries(tablas)) {
          for (const row of tabla.all()) await this.store.upsert(name, row);
        }
        this.persistencia = "postgres (sembrado inicial)";
      }

      // Write-through: cada insert/update/remove se refleja en PostgreSQL.
      for (const [name, tabla] of Object.entries(tablas)) {
        tabla.persist = (accion, arg) => {
          const p = accion === "remove" ? this.store.remove(name, arg) : this.store.upsert(name, arg);
          p.catch((e) => console.error(`[pg] ${name}:`, e.message));
        };
      }
    } catch (e) {
      this.store = undefined;
      this.persistencia = `memoria (PostgreSQL no disponible: ${e.code || e.message})`;
      console.warn(`\n  ⚠ PostgreSQL no disponible (${e.code || e.message}). Corriendo en MEMORIA.`);
      console.warn(`  Para persistir, arranca PostgreSQL:`);
      console.warn(`  .pg\\pgsql\\bin\\pg_ctl.exe -D .pgdata -o "-p 5432" -l .pgdata\\server.log start\n`);
    }
    return this;
  }

  /** Carga cada app desde su JSON de configuración (multi-tenant). */
  _loadApps() {
    const files = fs.readdirSync(APPS_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const cfg = JSON.parse(fs.readFileSync(path.join(APPS_DIR, f), "utf8"));
      this.apps.insert({
        id: cfg.id,
        sigla: cfg.sigla,
        nombre: cfg.nombre,
        activo: cfg.activo,
      });
      // La config completa (personaje, precios, módulos, piel) vive en Config.
      this.config.insert({ id: `cfg_${cfg.id}`, app_id: cfg.id, data: cfg });
    }
  }

  getAppConfig(appId) {
    const c = this.config.get(`cfg_${appId}`);
    return c ? c.data : undefined;
  }

  /** Datos de ejemplo para que el sistema corra y se pueda demostrar. */
  _seed() {
    // Usuarios finales (mundo "usuario final": solo free/premium, dueño de sus datos)
    const ana = this.usuarios.insert({
      id: "u_ana",
      app_id: "sina",
      nombre: "Ana",
      email: "ana@example.com",
      idioma: "pt",
      perfil: {
        // contexto de usuario (Capa 2) — en prod se calcula/recoge en onboarding
        nacimiento: { fecha: "1994-03-21", hora: "07:15", lugar: "São Paulo, BR" },
      },
    });
    this.suscripciones.insert({
      app_id: "sina",
      usuario_id: ana.id,
      plan: "premium",
      addons: ["voz"],
      estado: "trial",
      vence: "2026-12-31",
    });

    const joao = this.usuarios.insert({
      id: "u_joao",
      app_id: "aurora",
      nombre: "João",
      email: "joao@example.com",
      idioma: "pt",
      perfil: {
        plan_lectura_actual: "Salmos en 30 días (día 4)",
      },
    });
    this.suscripciones.insert({
      app_id: "aurora",
      usuario_id: joao.id,
      plan: "free",
      addons: [],
      estado: "activo",
      vence: null,
    });

    // RBAC mínimo v1 (§6.6): 2 roles fijos por app, sin panel configurable aún.
    for (const appId of ["sina", "aurora"]) {
      const superAdmin = this.roles.insert({ app_id: appId, nombre: "super_admin", activo: true });
      const editor = this.roles.insert({ app_id: appId, nombre: "editor", activo: true });

      const objContenido = this.objetos.insert({
        app_id: appId, nombre: "contenido", tipo: "recurso", url: "/contenido", activo: true,
      });
      const objUsuarios = this.objetos.insert({
        app_id: appId, nombre: "usuario", tipo: "entidad", url: "/usuarios", activo: true,
      });

      // super_admin: CRUD total
      for (const obj of [objContenido, objUsuarios]) {
        this.permisos.insert({ rol_id: superAdmin.id, objeto_id: obj.id, ver: true, agregar: true, editar: true, eliminar: true });
      }
      // editor: ve/edita contenido, solo VE usuarios (sin datos sensibles — §6.5)
      this.permisos.insert({ rol_id: editor.id, objeto_id: objContenido.id, ver: true, agregar: true, editar: true, eliminar: false });
      this.permisos.insert({ rol_id: editor.id, objeto_id: objUsuarios.id, ver: true, agregar: false, editar: false, eliminar: false });
    }

    // Usuario demo genérico por app: cualquier app nueva (soltar un JSON) queda
    // probable de inmediato con u_demo_<appId>, sin tocar el motor.
    for (const a of this.apps.all()) {
      const id = `u_demo_${a.id}`;
      if (!this.usuarios.get(id)) {
        this.usuarios.insert({ id, app_id: a.id, nombre: "Demo", email: `demo@${a.id}.app`, idioma: this.getAppConfig(a.id)?.idioma_default || "es", perfil: {} });
        this.suscripciones.insert({ app_id: a.id, usuario_id: id, plan: "premium", addons: ["voz"], estado: "trial", vence: "2026-12-31" });
      }
    }

    // Un usuario de back-office con rol editor en Aurora (ejemplo)
    const editorAurora = this.usuarios.insert({
      id: "bo_maria", nombre: "María (editora)", email: "maria@nucleo.app", activo: true, backoffice: true,
    });
    const rolEditorAurora = this.roles.findOne((r) => r.app_id === "aurora" && r.nombre === "editor");
    this.usuarioRoles.insert({ usuario_id: editorAurora.id, rol_id: rolEditorAurora.id, app_id: "aurora" });
  }

  getUsuario(appId, usuarioId) {
    const u = this.usuarios.get(usuarioId);
    if (!u) return undefined;
    if (u.backoffice) return u;
    return u.app_id === appId ? u : undefined; // aislamiento por app
  }

  getSuscripcion(appId, usuarioId) {
    return this.suscripciones.findOne((s) => s.app_id === appId && s.usuario_id === usuarioId);
  }
}

export const db = new DB();
