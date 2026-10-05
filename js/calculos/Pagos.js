// =============================================================================
// Pagos.js — La lista de "Próximos pagos" y la acción de marcar uno como pagado.
// Junta tres fuentes:
//   1. pagos programados de tus deudas (los que vienen en tu plan)
//   2. abonos extra que registraste
//   3. estados de cuenta de las tarjetas (se generan solos a partir de tus gastos)
// =============================================================================
import { TARJETAS } from "../config.js";
import { aISO, hoy, fechaCorta, redondear2 } from "../utilidades.js";

export class Pagos {
  /**
   * @param {import("../datos/Estado.js").Estado} estado
   * @param {import("./Deudas.js").Deudas} deudas
   * @param {import("./Tarjetas.js").Tarjetas} tarjetas
   */
  constructor(estado, deudas, tarjetas) { this.estado = estado; this.deudas = deudas; this.tarjetas = tarjetas; }

  /** Todos los pagos (pagados y pendientes), ordenados por fecha. */
  proximos() {
    const t = hoy();
    // ya pagados y abonos extra
    const lista = this.estado.pagos.filter((p) => !p.auto && (p.pagado || p.extra)).map((p) => ({ ...p }));
    // pendientes de cada deuda, con el monto ajustado por abonos
    for (const d of this.estado.deudas)
      for (const p of this.deudas.pendientes(d))
        if (p.adj > 0) lista.push({ ...p, montoPlan: p.montoPlan ?? p.monto, monto: p.adj, ajustado: p.adj < p.monto });
    // estados de cuenta de las tarjetas
    for (const id of TARJETAS) {
      const nombre = this.tarjetas.nombre(id);
      for (const e of this.tarjetas.estadosDeCuenta(id)) {
        const clave = this.tarjetas.idDePago(id, e.pay);
        const guardado = this.estado.pagos.find((p) => p.id === clave && p.pagado);
        if (guardado) lista.push({ ...guardado, id: clave, auto: true });
      }
      for (const e of this.tarjetas.resumen(id).estados) {
        if (e.monto <= 0) continue;
        lista.push({
          id: this.tarjetas.idDePago(id, e.pay), auto: true, tarjeta: id, fecha: aISO(e.pay), monto: e.monto, pagado: false,
          concepto: e.start > t ? `${nombre}: mensualidades a meses (corte ${fechaCorta(e.end)})` : `${nombre}: compras del ${fechaCorta(e.start)} al ${fechaCorta(e.end)}`,
          abierto: t <= e.end && e.start <= t, ajustado: e.cubierto > 0,
        });
      }
    }
    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Marca un pago como pagado, o lo desmarca si ya lo estaba. */
  alternar(pago) {
    const e = this.estado;
    if (pago.extra) {                       // abono extra: "deshacer" lo borra
      if (pago.pagado) e.borrarPago(pago.id);
    } else if (pago.auto) {                 // estado de cuenta de tarjeta: se guarda solo al pagarlo
      if (pago.pagado) e.borrarPago(pago.id);
      else e.guardarPago(pago.id, { fecha: pago.fecha, concepto: pago.concepto, tarjeta: pago.tarjeta, monto: redondear2(pago.monto), pagado: true, pagadoEl: aISO(hoy()), pagadoTs: Date.now(), auto: true });
    } else {                                // pago programado de una deuda
      const plan = pago.montoPlan ?? pago.monto;
      e.actualizarPago(pago.id, pago.pagado
        ? { pagado: false, pagadoEl: null, pagadoTs: null, monto: plan }
        : { pagado: true, pagadoEl: aISO(hoy()), pagadoTs: Date.now(), monto: redondear2(pago.monto), montoPlan: plan });
    }
  }

  /** Registra un abono extra a una deuda o tarjeta. */
  abonar(deuda, monto, fecha, nota) {
    const nombre = deuda.tarjeta ? this.tarjetas.nombre(deuda.tarjeta) : deuda.nombre;
    this.estado.guardarPago(`extra-${deuda.id}-${Date.now()}`, {
      fecha, concepto: `Abono extra a ${nombre}${nota ? " · " + nota : ""}`, deuda: deuda.id, tarjeta: deuda.tarjeta || null,
      monto, pagado: true, pagadoEl: fecha, pagadoTs: Date.now(), extra: true,
    });
    return nombre;
  }
}
