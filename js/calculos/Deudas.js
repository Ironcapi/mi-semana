// =============================================================================
// Deudas.js — Cuánto debes de cada deuda y qué pagos programados le faltan.
// Una deuda baja cuando marcas pagado uno de sus pagos o registras un abono extra.
// =============================================================================
import { sumar } from "../utilidades.js";

export class Deudas {
  /** @param {import("../datos/Estado.js").Estado} estado */
  constructor(estado) { this.estado = estado; }

  /** Las deudas en el orden en que se muestran. */
  ordenadas() { return [...this.estado.deudas].sort((a, b) => (a.orden || 0) - (b.orden || 0)); }

  /** La deuda vieja ligada a una tarjeta ("bbva" / "revolut"), si existe. */
  deTarjeta(idTarjeta) { return this.estado.deudas.find((d) => d.tarjeta === idTarjeta) || null; }

  /** ¿Existe un pago con ese id y está marcado como pagado? */
  estaPagado(idPago) { return this.estado.pagos.some((p) => p.id === idPago && p.pagado); }

  /** Total ya pagado a una deuda (pagos programados + abonos extra). */
  pagadoA(idDeuda) { return sumar(this.estado.pagos.filter((p) => p.deuda === idDeuda && p.pagado)); }

  /** Lo que falta por pagar de una deuda. */
  restante(deuda) { return Math.max(0, (+deuda.saldoInicial || 0) - this.pagadoA(deuda.id)); }

  /**
   * Pagos programados que faltan, recortados para que nunca sumen más de lo que aún debes
   * (si abonaste de más, los últimos pagos se reducen o quedan en 0). Cada uno trae `adj`.
   */
  pendientes(deuda) {
    let resto = this.restante(deuda);
    return this.estado.pagos.filter((p) => p.deuda === deuda.id && !p.pagado && !p.extra)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((p) => { const adj = Math.max(0, Math.min(+p.monto || 0, resto)); resto -= adj; return { ...p, adj }; });
  }

  /** Suma de lo que debes en total. */
  total() { return this.estado.deudas.reduce((x, d) => x + this.restante(d), 0); }
}
