/**
 * Inyector de conocimiento — Sina (astrología). Plantilla Capa 3 / Arq. §8.2.
 *
 * Regla: las POSICIONES y tránsitos son datos duros; vienen del cálculo, no de
 * la memoria del modelo. El modelo interpreta, no inventa astronomía.
 *
 * Aquí el signo solar se calcula de verdad a partir de la fecha (rangos
 * tropicales estándar). Luna, Ascendente y tránsito se generan de forma
 * DETERMINISTA y están claramente marcados como STUB: en producción se
 * reemplaza por Swiss Ephemeris (efemérides reales con hora y lugar exactos).
 */

const SIGNOS = [
  { signo: "Capricórnio", hasta: [1, 19] },
  { signo: "Aquário", hasta: [2, 18] },
  { signo: "Peixes", hasta: [3, 20] },
  { signo: "Áries", hasta: [4, 19] },
  { signo: "Touro", hasta: [5, 20] },
  { signo: "Gêmeos", hasta: [6, 20] },
  { signo: "Câncer", hasta: [7, 22] },
  { signo: "Leão", hasta: [8, 22] },
  { signo: "Virgem", hasta: [9, 22] },
  { signo: "Libra", hasta: [10, 22] },
  { signo: "Escorpião", hasta: [11, 21] },
  { signo: "Sagitário", hasta: [12, 21] },
  { signo: "Capricórnio", hasta: [12, 31] },
];

/** Signo solar real por fecha de nacimiento (rangos tropicales). */
export function signoSolar(fechaISO) {
  const d = new Date(fechaISO + "T00:00:00Z");
  const mes = d.getUTCMonth() + 1;
  const dia = d.getUTCDate();
  for (const s of SIGNOS) {
    const [m, day] = s.hasta;
    if (mes < m || (mes === m && dia <= day)) return s.signo;
  }
  return "Capricórnio";
}

// STUB determinista (reemplazar por Swiss Ephemeris).
const LUNAS = ["Touro", "Câncer", "Escorpião", "Peixes", "Virgem", "Capricórnio"];
// Frases neutrales (sin artículos de un idioma): el modelo real las redacta;
// en el mock se interpolan tal cual para que lean bien en ES/PT/EN.
const TRANSITOS = [
  "Lua → diálogo honesto",
  "Mercúrio → ordenar ideas",
  "Vênus → vínculos cercanos",
  "Marte → impulso para iniciar",
  "céu → pausa y autocuidado",
];

function hashFecha(fechaISO) {
  let h = 0;
  for (const c of fechaISO) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * @param {{ perfil?: { nacimiento?: { fecha:string, hora:string, lugar:string } }, lang: string }} ctx
 */
export function inyectarEfemerides(ctx) {
  const nac = ctx.perfil?.nacimiento;
  if (!nac?.fecha) {
    return { tipo: "ephemeris", incompleto: true, motivo: "faltan datos de nacimiento", mapa: null };
  }
  const h = hashFecha(nac.fecha);
  const mapa = {
    sol: signoSolar(nac.fecha), // REAL
    luna: LUNAS[h % LUNAS.length], // STUB → Swiss Ephemeris
    ascendente: LUNAS[(h >> 3) % LUNAS.length], // STUB → requiere hora+lugar exactos
    transito_clave: TRANSITOS[h % TRANSITOS.length], // STUB → tránsitos reales del día
    _fuente: { sol: "cálculo real", resto: "STUB — reemplazar por Swiss Ephemeris" },
  };
  return {
    tipo: "ephemeris",
    mapa,
    cacheable: true,
    cacheKey: `sina:mapa:${nac.fecha}:${ctx.lang}`,
  };
}
