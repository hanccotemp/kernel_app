/**
 * Caché tipo Redis (capa intercambiable).
 *
 * Arquitectura §3.3 / §8.5: "Caché agresivo (Redis) desde el día uno" para
 * abaratar IA y bajar latencia en lo repetible (versículo/horóscopo del día,
 * respuestas comunes).
 *
 * En producción se reemplaza esta clase por un cliente Redis real manteniendo
 * la misma interfaz (get / set / wrap). El resto del sistema no se entera.
 */
export class Cache {
  constructor() {
    /** @type {Map<string, { value: any, expiresAt: number | null }>} */
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /** @param {string} key */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds] sin TTL = persiste en memoria del proceso
   */
  set(key, value, ttlSeconds) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return value;
  }

  /**
   * Patrón "cache-aside": si no está, lo computa con producer() y lo guarda.
   * @param {string} key
   * @param {number} ttlSeconds
   * @param {() => Promise<any>} producer
   */
  async wrap(key, ttlSeconds, producer) {
    const cached = this.get(key);
    if (cached !== undefined) return { value: cached, cached: true };
    const value = await producer();
    this.set(key, value, ttlSeconds);
    return { value, cached: false };
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      ratio: total ? +(this.hits / total).toFixed(2) : 0,
      keys: this.store.size,
    };
  }
}

export const cache = new Cache();
