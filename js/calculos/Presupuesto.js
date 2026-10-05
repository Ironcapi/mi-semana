// =============================================================================
// Presupuesto.js — El presupuesto de cada semana, por categoría.
//
// Disponible de una categoría en una semana =
//     base de esa semana            (lo que le toca: cfg.semanal o su historial)
//   + arrastre                      (lo que sobró o faltó en TODAS las semanas anteriores)
//   + ajuste                        (saldo que moviste desde/hacia otra categoría esa semana)
//   − gastado esa semana
// =============================================================================
import { CATEGORIAS_CON_PRESUPUESTO, categoria } from "../config.js";
import { aISO, deISO, hoy, sumarDias, lunesDe, enRango, redondear2, sumar } from "../utilidades.js";

export class Presupuesto {
  /** @param {import("../datos/Estado.js").Estado} estado */
  constructor(estado) { this.estado = estado; }

  /** ¿El gasto cuenta en el presupuesto semanal? (encargos e imprevistos no) */
  cuenta(gasto) { return !(categoria(gasto.categoria) || {}).fuera; }

  /** Cambios de presupuesto de una categoría: [{desde: "lunes ISO", monto}]. */
  historialDe(cat) {
    const cfg = this.estado.cfg;
    if (cfg.historial && Array.isArray(cfg.historial[cat])) return cfg.historial[cat];
    if (cat === "gasolina" && Array.isArray(cfg.historialGas)) return cfg.historialGas; // formato antiguo
    return [];
  }

  /** Presupuesto base de la categoría en la semana que empieza en `lunes`. */
  baseDe(cat, lunes) {
    const hist = [...this.historialDe(cat)].sort((a, b) => a.desde.localeCompare(b.desde));
    if (!hist.length) return +this.estado.cfg.semanal[cat] || 0;
    let v = +hist[0].monto;
    for (const h of hist) if (h.desde <= aISO(lunes)) v = +h.monto;
    return v;
  }

  /** Tope total permitido (suma de todas las categorías) en esa semana. Infinity si no hay tope. */
  topeDe(lunes) {
    const topes = [...(this.estado.cfg.topes || [])].sort((a, b) => a.desde.localeCompare(b.desde));
    let v = topes.length ? +topes[0].total : Infinity;
    for (const t of topes) if (t.desde <= aISO(lunes)) v = +t.total;
    return v;
  }

  /** Saldo movido hacia (+) o desde (−) la categoría en esa semana. */
  ajusteDe(cat, lunes) {
    const k = aISO(lunes);
    return this.estado.movimientos.filter((m) => m.semana === k)
      .reduce((x, m) => x + (m.a === cat ? m.monto : 0) - (m.de === cat ? m.monto : 0), 0);
  }

  /** Lo gastado en la categoría durante esa semana. */
  gastadoEn(cat, lunes) {
    const fin = sumarDias(lunes, 6);
    return sumar(this.estado.gastos.filter((g) => g.categoria === cat && enRango(g, lunes, fin)));
  }

  /** Lunes desde el que se empieza a arrastrar (cfg.inicioGas; si no hay, esta semana). */
  inicioArrastre() { return lunesDe(deISO(this.estado.cfg.inicioGas || aISO(lunesDe(hoy())))); }

  /** Lo que sobró (+) o faltó (−) acumulado en las semanas anteriores a `lunes`. */
  arrastreDe(cat, lunes) {
    let arrastre = 0;
    let w = this.inicioArrastre();
    for (let i = 0; w < lunes && i < 520; i++) {
      arrastre += this.baseDe(cat, w) + this.ajusteDe(cat, w) - this.gastadoEn(cat, w);
      w = sumarDias(w, 7);
    }
    return redondear2(arrastre);
  }

  /** Lo que queda por gastar en la categoría esa semana (puede ser negativo). */
  disponibleDe(cat, lunes) {
    return this.baseDe(cat, lunes) + this.arrastreDe(cat, lunes) + this.ajusteDe(cat, lunes) - this.gastadoEn(cat, lunes);
  }

  /** Suma de los presupuestos base de una semana (sin arrastres). */
  baseTotalDe(lunes) { return CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + this.baseDe(c.id, lunes), 0); }

  /**
   * Todo lo que la pantalla necesita de una semana.
   * @returns {{ gastos: object[], porCategoria: object, presupuesto: number, gastado: number, queda: number, arrastreTotal: number }}
   */
  resumenSemana(lunes) {
    const fin = sumarDias(lunes, 6);
    const gastos = this.estado.gastos.filter((g) => enRango(g, lunes, fin));   // incluye encargos e imprevistos
    const propios = gastos.filter((g) => this.cuenta(g));
    const porCategoria = {};
    for (const c of CATEGORIAS_CON_PRESUPUESTO) {
      const base = this.baseDe(c.id, lunes), arrastre = this.arrastreDe(c.id, lunes), ajuste = this.ajusteDe(c.id, lunes);
      const gastado = sumar(propios.filter((g) => g.categoria === c.id));
      porCategoria[c.id] = { base, arrastre, ajuste, gastado, total: base + arrastre + ajuste };
    }
    const presupuesto = CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + porCategoria[c.id].total, 0);
    const gastado = sumar(propios);
    const arrastreTotal = CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + porCategoria[c.id].arrastre, 0);
    return { gastos, porCategoria, presupuesto, gastado, queda: presupuesto - gastado, arrastreTotal };
  }
}
