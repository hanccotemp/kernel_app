/**
 * Almacén PostgreSQL (capa de persistencia) — Arquitectura §3.3.
 *
 * Guarda cada entidad como (id, data JSONB), de modo que la forma de los datos
 * es idéntica a la del modelo en memoria. Permite hidratar las tablas al
 * arrancar y escribir cambios (write-through) sin tocar la lógica del núcleo.
 *
 * En producción se pueden añadir columnas/índices reales por rendimiento; aquí
 * el aislamiento y las consultas siguen ocurriendo en la capa de dominio.
 */
import pg from "pg";
const { Pool } = pg;

function ident(t) {
  if (!/^[a-z_]+$/.test(t)) throw new Error(`Nombre de tabla inválido: ${t}`);
  return t;
}

export class PgStore {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }
  async init(tablas) {
    for (const t of tablas) {
      await this.pool.query(`CREATE TABLE IF NOT EXISTS ${ident(t)} (id TEXT PRIMARY KEY, data JSONB NOT NULL)`);
    }
  }
  async count(tabla) {
    const r = await this.pool.query(`SELECT count(*)::int AS n FROM ${ident(tabla)}`);
    return r.rows[0].n;
  }
  async loadAll(tabla) {
    const r = await this.pool.query(`SELECT data FROM ${ident(tabla)}`);
    return r.rows.map((row) => row.data);
  }
  async upsert(tabla, row) {
    await this.pool.query(
      `INSERT INTO ${ident(tabla)} (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [row.id, row]
    );
  }
  async remove(tabla, id) {
    await this.pool.query(`DELETE FROM ${ident(tabla)} WHERE id = $1`, [id]);
  }
  async close() {
    await this.pool.end();
  }
}
