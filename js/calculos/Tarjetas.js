// =============================================================================
// Tarjetas.js — Cortes, mensualidades y saldo de cada tarjeta de crédito.
//
// Ideas clave:
//  · "Estado de cuenta" = todo lo comprado entre un corte y el siguiente; se paga en una fecha.
//  · Una compra a N meses sin intereses se parte en N cargos iguales, uno por estado de cuenta.
//  · Saldo de la tarjeta = deuda vieja que falta + estados de cuenta sin pagar (incluye
//    mensualidades futuras, porque la compra completa ocupa tu línea desde el primer día).
// =============================================================================
import { TARJETAS, metodo } from "../config.js";
import { aISO, deISO, hoy, sumarDias, diaAjustado, redondear2 } from "../utilidades.js";

export class Tarjetas {
  /**
   * @param {import("../datos/Estado.js").Estado} estado
   * @param {import("./Deudas.js").Deudas} deudas
   */
  constructor(estado, deudas) { this.estado = estado; this.deudas = deudas; }

  config(id) { return this.estado.cfg.tarjetas[id]; }
  esTarjeta(idMetodo) { return !!this.estado.cfg.tarjetas[idMetodo]; }
  /** Uso sano máximo en pesos (límite × tope). */
  topeSano(id) { return this.config(id).limite * this.estado.cfg.tope; }
  /** Id con el que se guarda el pago de un estado de cuenta. */
  idDePago(id, fechaPago) { return `tarjeta-${id}-${aISO(fechaPago)}`; }

  /** Periodo de corte en el que cae una fecha: {start, end (día de corte), pay (fecha límite de pago)}. */
  ciclo(tarjeta, fecha) {
    const y = fecha.getFullYear(), m = fecha.getMonth();
    const corteEsteMes = diaAjustado(y, m, tarjeta.corte);
    const end = fecha <= corteEsteMes ? corteEsteMes : diaAjustado(y, m + 1, tarjeta.corte);
    const cortePrevio = diaAjustado(end.getFullYear(), end.getMonth() - 1, tarjeta.corte);
    const start = sumarDias(cortePrevio, 1);
    const pay = diaAjustado(end.getFullYear(), end.getMonth() + (tarjeta.pago <= tarjeta.corte ? 1 : 0), tarjeta.pago);
    return { start, end, pay };
  }

  /** Parte un gasto en sus cargos: 1 si es de contado, N si es a meses sin intereses. */
  mensualidades(gasto) {
    const n = Math.max(1, Math.round(+gasto.msi || 1));
    if (n === 1) return [{ fecha: gasto.fecha, monto: gasto.monto }];
    const d = deISO(gasto.fecha), parte = redondear2(gasto.monto / n), out = [];
    for (let k = 0; k < n; k++) {
      const fecha = diaAjustado(d.getFullYear(), d.getMonth() + k, d.getDate());
      // la última mensualidad absorbe los centavos del redondeo
      out.push({ fecha: aISO(fecha), monto: k === n - 1 ? redondear2(gasto.monto - parte * (n - 1)) : parte, msi: true, gid: gasto.id, k });
    }
    return out;
  }

  /** Todos los cargos de una tarjeta: gastos registrados (ya partidos) + cargos automáticos. */
  cargos(id) {
    const cfg = this.estado.cfg, tarjeta = this.config(id), t = hoy(), tIso = aISO(t), out = [];
    for (const g of this.estado.gastos) {
      if (g.metodo !== id || g.fecha < cfg.desde || g.fecha > tIso) continue;
      for (const q of this.mensualidades(g)) out.push(q);
    }
    // cargos fijos (suscripciones, plan de datos) desde que empieza el jineteo
    const inicio = deISO(cfg.inicioJineteo);
    for (let k = 0; k < 120; k++) {
      const primero = new Date(inicio.getFullYear(), inicio.getMonth() + k, 1);
      if (primero > t) break;
      for (const f of tarjeta.fijos || []) {
        const dia = diaAjustado(primero.getFullYear(), primero.getMonth(), f.dia);
        if (dia >= inicio && dia <= t) out.push({ fecha: aISO(dia), monto: f.monto });
      }
    }
    return out;
  }

  /** Cargos agrupados por estado de cuenta, del más antiguo al más nuevo. */
  estadosDeCuenta(id) {
    const tarjeta = this.config(id), mapa = new Map();
    for (const cargo of this.cargos(id)) {
      const c = this.ciclo(tarjeta, deISO(cargo.fecha)), k = aISO(c.pay);
      if (!mapa.has(k)) mapa.set(k, { ...c, monto: 0, msi: 0 });
      mapa.get(k).monto += cargo.monto;
      if (cargo.msi) mapa.get(k).msi += cargo.monto;
    }
    return [...mapa.values()].sort((a, b) => a.pay - b.pay);
  }

  /**
   * Foto completa de una tarjeta.
   * @returns {{ deudaVieja:number, nuevas:number, total:number, estados:object[], sigPagoViejo:object|null,
   *             saldoAFavor:number, porVencer:number, aMeses:number }}
   */
  resumen(id) {
    const vieja = this.deudas.deTarjeta(id);
    const deudaVieja = vieja ? this.deudas.restante(vieja) : 0;
    // Lo abonado de más a la deuda vieja cubre compras nuevas, empezando por el estado más antiguo.
    let credito = vieja ? Math.max(0, this.deudas.pagadoA(vieja.id) - (+vieja.saldoInicial || 0)) : 0;
    const estados = [];
    for (const e of this.estadosDeCuenta(id)) {
      const pago = this.estado.pagos.find((p) => p.id === this.idDePago(id, e.pay) && p.pagado);
      if (pago) { credito = Math.max(0, credito - Math.max(0, e.monto - (+pago.monto || 0))); continue; }
      const usa = Math.min(credito, e.monto); credito -= usa;
      estados.push({ ...e, monto: e.monto - usa, cubierto: usa });
    }
    const nuevas = estados.reduce((x, e) => x + e.monto, 0);
    const t = hoy();
    // Estados ya abiertos o cerrados = lo que de verdad toca pagar pronto; los demás son mensualidades futuras.
    const porVencer = estados.filter((e) => e.start <= t).reduce((x, e) => x + e.monto, 0);
    const sigPagoViejo = vieja ? this.deudas.pendientes(vieja).find((p) => p.adj > 0) || null : null;
    return { deudaVieja, nuevas, total: deudaVieja + nuevas, estados, sigPagoViejo, saldoAFavor: credito, porVencer, aMeses: nuevas - porVencer };
  }

  /** La siguiente fecha de pago de la tarjeta y cuánto toca en total ese día. */
  proximoPago(id) {
    const porFecha = new Map();
    const vieja = this.deudas.deTarjeta(id);
    if (vieja) for (const p of this.deudas.pendientes(vieja)) if (p.adj > 0) porFecha.set(p.fecha, (porFecha.get(p.fecha) || 0) + p.adj);
    for (const e of this.resumen(id).estados) if (e.monto > 0) porFecha.set(aISO(e.pay), (porFecha.get(aISO(e.pay)) || 0) + e.monto);
    const primera = [...porFecha.keys()].sort()[0];
    return primera ? { fecha: primera, monto: porFecha.get(primera) } : null;
  }

  /** Compras a meses que aún no terminas de pagar. */
  comprasAMeses() {
    const cfg = this.estado.cfg, filas = [];
    for (const g of this.estado.gastos) {
      const n = Math.round(+g.msi || 1);
      if (n <= 1 || !this.esTarjeta(g.metodo) || g.fecha < cfg.desde) continue;
      const tarjeta = this.config(g.metodo), partes = this.mensualidades(g);
      const pagadas = partes.filter((q) => this.deudas.estaPagado(this.idDePago(g.metodo, this.ciclo(tarjeta, deISO(q.fecha)).pay)));
      const falta = g.monto - pagadas.reduce((x, q) => x + q.monto, 0);
      if (falta <= 0.005) continue;
      filas.push({ gasto: g, meses: n, pagadas: pagadas.length, falta, mensualidad: partes[0].monto });
    }
    return filas.sort((a, b) => a.gasto.fecha.localeCompare(b.gasto.fecha));
  }

  /** Suma de lo "por vencer" de todas las tarjetas (lo que hay que tener apartado). */
  apartadoTotal() { return TARJETAS.reduce((x, id) => x + this.resumen(id).porVencer, 0); }

  nombre(id) { return metodo(id).name; }
}
