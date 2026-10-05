// =============================================================================
// Ahorro.js — Ahorro libre = lo que tienes − lo que ya está comprometido.
//
// "Lo que tienes" parte del saldo que escribiste y se va estimando:
//   − gastos con débito/efectivo registrados después
//   − pagos marcados como pagados después
//   + quincenas que hayan caído desde entonces
// "Comprometido" = presupuesto por gastar hasta tu próxima quincena
//                + pagos de deudas antes de esa quincena
//                + lo apartado para estados de cuenta de tarjetas ya abiertos
// =============================================================================
import { CATEGORIAS_CON_PRESUPUESTO } from "../config.js";
import { aISO, deISO, hoy, sumarDias, lunesDe, diaAjustado, diasEntre, sumar } from "../utilidades.js";

export class Ahorro {
  /**
   * @param {import("../datos/Estado.js").Estado} estado
   * @param {import("./Presupuesto.js").Presupuesto} presupuesto
   * @param {import("./Tarjetas.js").Tarjetas} tarjetas
   * @param {import("./Pagos.js").Pagos} pagos
   */
  constructor(estado, presupuesto, tarjetas, pagos) {
    this.estado = estado; this.presupuesto = presupuesto; this.tarjetas = tarjetas; this.pagos = pagos;
  }

  /** Fechas ISO de quincena después de `desdeIso` y hasta `hastaIso` inclusive. */
  quincenasEntre(desdeIso, hastaIso) {
    const dias = (this.estado.cfg.ingreso && this.estado.cfg.ingreso.dias) || [15, 30];
    const a = deISO(desdeIso), b = deISO(hastaIso), out = [];
    for (let i = 0; i < 240; i++) {
      const primero = new Date(a.getFullYear(), a.getMonth() + i, 1);
      if (primero > b) break;
      for (const d of dias) {
        const x = aISO(diaAjustado(primero.getFullYear(), primero.getMonth(), d));
        if (x > desdeIso && x <= hastaIso) out.push(x);
      }
    }
    return out.sort();
  }

  /** La siguiente quincena después de `fecha`. */
  proximaQuincena(fecha) {
    return deISO(this.quincenasEntre(aISO(fecha), aISO(sumarDias(fecha, 62)))[0] || aISO(sumarDias(fecha, 15)));
  }

  /** Saldo estimado hoy a partir del último saldo real que escribiste. */
  saldoEstimado() {
    const s = this.estado.saldoAhorro, e = this.estado;
    const fechaLectura = aISO(new Date(s.ts)), tIso = aISO(hoy());
    let v = +s.saldo || 0;
    v -= sumar(e.gastos.filter((g) => (g.metodo === "debito" || g.metodo === "efectivo") && (g.creado || 0) > s.ts && g.fecha >= fechaLectura));
    v -= sumar(e.pagos.filter((p) => p.pagado && ((p.pagadoTs || 0) > s.ts || (!p.pagadoTs && (p.pagadoEl || "") > fechaLectura))));
    v += this.quincenasEntre(fechaLectura, tIso).length * (+(e.cfg.ingreso || {}).monto || 0);
    return v;
  }

  /** Dinero ya comprometido de aquí a la próxima quincena. */
  comprometido() {
    const t = hoy(), quincena = this.proximaQuincena(t), lunes = lunesDe(t), domingo = sumarDias(lunes, 6);
    const p = this.presupuesto;
    // 1. presupuesto que falta gastar
    let porGastar = CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + Math.max(0, p.disponibleDe(c.id, lunes)), 0);
    if (quincena <= domingo) {
      porGastar *= diasEntre(t, quincena) / (diasEntre(t, domingo) + 1);        // solo la parte de la semana antes de cobrar
    } else {
      for (let w = sumarDias(lunes, 7), i = 0; w < quincena && i < 10; w = sumarDias(w, 7), i++)
        porGastar += p.baseTotalDe(w) * Math.min(7, diasEntre(w, quincena)) / 7;  // semanas siguientes (la última, prorrateada)
    }
    // 2. pagos de deudas antes de cobrar
    const qIso = aISO(quincena);
    const pagosAntes = sumar(this.pagos.proximos().filter((x) => !x.pagado && !x.auto && x.fecha < qIso));
    // 3. tarjetas
    const tarjetas = this.tarjetas.apartadoTotal();
    return { quincena, porGastar, pagosAntes, tarjetas };
  }

  /** Meta del fondo de emergencia: N meses de gastos esenciales. */
  meta() {
    const cfg = this.estado.cfg;
    return (+cfg.metaMeses || 3) * sumar((cfg.mensual || []).filter((i) => i.tipo === "necesidad"));
  }

  /** Todo junto para la vista, o null si aún no has escrito tu saldo. */
  resumen() {
    if (!this.estado.saldoAhorro) return null;
    const saldo = this.saldoEstimado(), c = this.comprometido();
    return {
      saldo, ...c, libre: saldo - c.porGastar - c.pagosAntes - c.tarjetas, meta: this.meta(),
      diasDesdeLectura: diasEntre(deISO(aISO(new Date(this.estado.saldoAhorro.ts))), hoy()),
    };
  }

  /** Guarda tu saldo real de hoy. */
  actualizarSaldo(saldo) { this.estado.guardarSaldo({ saldo: Math.round(saldo * 100) / 100, ts: Date.now() }); }
}
