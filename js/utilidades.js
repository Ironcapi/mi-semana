// =============================================================================
// utilidades.js — Funciones pequeñas que usa todo el proyecto: fechas, formato y DOM.
// =============================================================================

export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const MS_DIA = 864e5;

// ---- DOM ----
/** Atajo de document.getElementById. */
export const $ = (id) => document.getElementById(id);
/** Crea un <b> con texto (para resaltar cifras sin usar innerHTML). */
export const negrita = (texto) => Object.assign(document.createElement("b"), { textContent: texto });

// ---- Dinero ----
/** $1,234 (sin centavos). Los negativos salen como −$1,234. */
export const pesos = (n) => (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString("es-MX", { maximumFractionDigits: 0 });
/** $1,234.50 (con centavos si los hay). */
export const pesosExactos = (n) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const redondear2 = (n) => Math.round(n * 100) / 100;

// ---- Fechas ----
/** Date → "2026-10-05". */
export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** "2026-10-05" → Date (a medianoche local). */
export const deISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
/** Hoy a medianoche. */
export const hoy = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
export const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** El lunes de la semana de esa fecha (las semanas van de lunes a domingo). */
export const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));
/** "5 oct". */
export const fechaCorta = (d) => `${d.getDate()} ${MESES[d.getMonth()]}`;
/** Día `dia` del mes indicado; si el mes no lo tiene (30 de febrero) usa su último día. */
export const diaAjustado = (anio, mes, dia) => new Date(anio, mes, Math.min(dia, new Date(anio, mes + 1, 0).getDate()));
/** Días completos entre dos fechas. */
export const diasEntre = (a, b) => Math.round((b - a) / MS_DIA);
/** ¿La fecha del gasto cae entre a y b (inclusive)? */
export const enRango = (gasto, a, b) => { const d = deISO(gasto.fecha); return d >= a && d <= b; };
/** Suma un campo numérico de una lista. */
export const sumar = (lista, campo = "monto") => lista.reduce((x, i) => x + (+i[campo] || 0), 0);
