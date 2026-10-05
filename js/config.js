// =============================================================================
// config.js — Listas fijas y valores por defecto.
// Aquí NO van tus cifras: esas viven en tu respaldo (documento "config/presupuesto").
// =============================================================================

/** Clave bajo la que se guarda todo en el navegador (localStorage). */
export const CLAVE_ALMACEN = "msp:v1";

/** Categorías de gasto. `fuera: true` = no cuenta en el presupuesto de la semana. */
export const CATEGORIAS = [
  { id: "gasolina", name: "Gasolina", color: "var(--rev)" },
  { id: "comida", name: "Comida y salidas", color: "var(--accent)" },
  { id: "otros", name: "Otros / gustos", color: "var(--warn)" },
  { id: "encargo", name: "Encargo (no es mío)", color: "#8a6fd1", fuera: true },
  { id: "imprevisto", name: "Imprevisto (de mi ahorro)", color: "var(--bad)", fuera: true },
];

/** Solo las categorías que tienen presupuesto semanal. */
export const CATEGORIAS_CON_PRESUPUESTO = CATEGORIAS.filter((c) => !c.fuera);

/** Formas de pago. Las dos primeras son tarjetas de crédito. */
export const METODOS = [
  { id: "bbva", name: "BBVA", color: "var(--bbva)" },
  { id: "revolut", name: "Revolut", color: "var(--rev)" },
  { id: "debito", name: "Débito", color: "var(--deb)" },
  { id: "efectivo", name: "Efectivo", color: "var(--deb)" },
];

/** Ids de las tarjetas de crédito (deben existir en METODOS y en cfg.tarjetas). */
export const TARJETAS = ["bbva", "revolut"];

/** Opciones del tablero para calibrar el tanque: [etiqueta, fracción]. */
export const FRACCIONES_TANQUE = [["E", 0], ["1/8", 0.125], ["1/4", 0.25], ["3/8", 0.375], ["1/2", 0.5], ["5/8", 0.625], ["3/4", 0.75], ["7/8", 0.875], ["F", 1]];

/**
 * Configuración base (genérica). Lo que traiga tu respaldo la sustituye.
 * - semanal: presupuesto por categoría a la semana
 * - tarjetas: límite, día de corte, día de pago y cargos automáticos (fijos)
 * - tope: uso máximo sano de cada tarjeta (0.30 = 30%)
 * - inicioJineteo: desde cuándo se sugiere tarjeta para la gasolina y cuentan los cargos fijos
 * - inicioGas: lunes desde el que se arrastra lo que sobra/falta de cada presupuesto
 * - desde: solo cuentan en tarjetas los gastos registrados a partir de esta fecha
 * - topes: tope semanal total por periodo [{desde, total}]
 * - historial: cambios de presupuesto por categoría [{desde, monto}]
 * - ingreso: cuánto y qué días te pagan
 * - mensual: renglones del presupuesto mensual que se muestra al final
 */
export const CONFIG_BASE = {
  semanal: { gasolina: 0, comida: 0, otros: 0 },
  tarjetas: {
    bbva: { limite: 0, corte: 15, pago: 5, fijos: [] },
    revolut: { limite: 0, corte: 15, pago: 5, fijos: [] },
  },
  tope: 0.30,
  inicioJineteo: "2099-01-01",
  inicioGas: "",
  tanque: { capacidad: 40, precio: 24, kmL: 12, kmTrabajo: 0, diasTrabajo: 5, kmExtraSemana: 0, consumoDia: 0 },
  desde: "2000-01-01",
  topes: [],
  historial: {},
  topeSanoMax: 0.30,
  ingreso: { monto: 0, dias: [15, 30] },
  metaMeses: 3,
  mensual: [],
  notaMensual: "",
};

/** Color con el que se pinta cada deuda. */
export function colorDeDeuda(id) {
  if (id === "bbva") return "var(--bbva)";
  if (id === "revolut") return "var(--rev)";
  if (id === "coche") return "#7a5af5";
  return "var(--accent)";
}

export const categoria = (id) => CATEGORIAS.find((c) => c.id === id);
export const metodo = (id) => METODOS.find((m) => m.id === id);
