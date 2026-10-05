// =============================================================================
// VistaTarjetas.js — "Tarjetas: cuánto debes hoy" y la lista de compras a meses.
// HTML: #cards · #msiBox #msiList
// =============================================================================
import { TARJETAS, metodo, categoria } from "../config.js";
import { $, negrita, pesos, pesosExactos, hoy, deISO, fechaCorta } from "../utilidades.js";

export class VistaTarjetas {
  constructor(app) { this.app = app; }

  iniciar() {}

  pintar() { this.pintarTarjetas(); this.pintarComprasAMeses(); }

  pintarTarjetas() {
    const t = this.app.tarjetas, cfg = this.app.estado.cfg;
    const caja = $("cards"); caja.innerHTML = "";
    for (const id of TARJETAS) {
      const tarjeta = t.config(id), met = metodo(id), r = t.resumen(id);
      const corte = t.ciclo(tarjeta, hoy()).end;
      const tope = t.topeSano(id);
      const uso = tarjeta.limite > 0 ? r.total / tarjeta.limite : 0;
      const estado = r.total > tope ? "over" : (r.total >= tope * 0.85 ? "warn" : "ok");
      const el = document.createElement("div"); el.className = "card";
      el.innerHTML = `<div class="cn"><span class="dot" style="background:${met.color}"></span>${met.name}</div>
        <div class="amt num"></div>
        <div class="small num"></div>
        <div class="meter tall"><i class="${estado === "ok" ? "" : estado}" style="width:${Math.min(100, uso * 100)}%"></i><span class="tope" style="left:calc(${Math.min(100, cfg.tope * 100)}% - 1px)"></span></div>
        <span class="state ${estado}" style="align-self:flex-start"></span>
        <div class="lines num"></div>`;
      el.querySelector(".amt").textContent = pesos(r.total);
      el.querySelector(".small").textContent = `${Math.round(uso * 100)}% de ${pesos(tarjeta.limite)} · corte ${fechaCorta(corte)}`;
      el.querySelector(".state").textContent = estado === "over"
        ? `Alto: arriba de ${pesos(tope)}. No le cargues más`
        : `Puedes usar ${pesos(tope - r.total)} sin pasar el ${Math.round(cfg.tope * 100)}%`;
      // desglose
      const lineas = el.querySelector(".lines");
      const linea = (texto, valor, extra) => { const d = document.createElement("div"); d.append(texto, negrita(pesos(valor)), extra || ""); lineas.append(d); };
      if (r.deudaVieja > 0) linea("Deuda vieja: ", r.deudaVieja, r.sigPagoViejo ? ` · próximo pago ${fechaCorta(deISO(r.sigPagoViejo.fecha))}` : "");
      linea("Compras nuevas: ", r.porVencer, "");
      if (r.aMeses > 0) linea("Mensualidades futuras: ", r.aMeses, "");
      const prox = t.proximoPago(id);
      if (prox) linea(`Próximo pago (${fechaCorta(deISO(prox.fecha))}): `, prox.monto, "");
      if (r.saldoAFavor > 0) linea("Saldo a favor: ", r.saldoAFavor, "");
      caja.append(el);
    }
  }

  pintarComprasAMeses() {
    const filas = this.app.tarjetas.comprasAMeses();
    const lista = $("msiList"); lista.innerHTML = "";
    $("msiBox").hidden = filas.length === 0;
    for (const f of filas) {
      const met = metodo(f.gasto.metodo);
      const el = document.createElement("div"); el.className = "cat";
      el.innerHTML = `<div class="top"><div class="name"><span class="dot" style="background:${met.color}"></span><span></span></div><span class="state warn"></span></div>
        <div class="vals num"></div><div class="meter"><i style="width:${f.pagadas / f.meses * 100}%;background:${met.color}"></i></div>`;
      el.querySelector(".name span:last-child").textContent = f.gasto.nota || (categoria(f.gasto.categoria) || {}).name || "Compra";
      el.querySelector(".state").textContent = `${f.pagadas} de ${f.meses} pagadas`;
      el.querySelector(".vals").append(`${met.name} · `, negrita(pesosExactos(f.mensualidad)), ` al mes · faltan ${pesos(f.falta)} de ${pesos(f.gasto.monto)}`);
      lista.append(el);
    }
  }
}
