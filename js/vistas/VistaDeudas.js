// =============================================================================
// VistaDeudas.js — "Mis deudas" (barra de avance de cada una) y la lista de
// "Imprevistos pagados con tu ahorro".
// HTML: #deudas #debtTotal · #impPanel #impTotal #impList
// =============================================================================
import { colorDeDeuda, METODOS, metodo } from "../config.js";
import { $, negrita, pesos, pesosExactos, aISO, deISO, hoy, fechaCorta, sumar, MESES } from "../utilidades.js";

export class VistaDeudas {
  constructor(app) { this.app = app; }

  iniciar() {}

  pintar() { this.pintarDeudas(); this.pintarImprevistos(); }

  pintarDeudas() {
    const deudas = this.app.deudas, caja = $("deudas"); caja.innerHTML = "";
    const lista = deudas.ordenadas();
    if (lista.length === 0) { caja.innerHTML = '<div class="empty">Sin deudas registradas.</div>'; $("debtTotal").textContent = ""; return; }
    for (const d of lista) {
      const falta = deudas.restante(d), inicial = +d.saldoInicial || 0;
      const avance = inicial > 0 ? (inicial - falta) / inicial : 1;
      const siguientes = deudas.pendientes(d).filter((p) => p.adj > 0);
      const ultimo = siguientes[siguientes.length - 1];
      const color = colorDeDeuda(d.id);
      const el = document.createElement("div"); el.className = "cat";
      el.innerHTML = `<div class="top"><div class="name"><span class="dot" style="background:${color}"></span><span></span></div><span class="state ${falta === 0 ? "ok" : "warn"}"></span></div>
        <div class="vals num"></div><div class="meter"><i style="width:${Math.min(100, avance * 100)}%;background:${color}"></i></div>`;
      el.querySelector(".name span:last-child").textContent = d.nombre;
      let estado = "Pendiente";
      if (falta === 0) estado = "Liquidada";
      else if (ultimo) { const f = deISO(ultimo.fecha); estado = `Terminas ${fechaCorta(f)} ${f.getFullYear() !== hoy().getFullYear() ? f.getFullYear() : ""}`.trim(); }
      el.querySelector(".state").textContent = estado;
      const v = el.querySelector(".vals");
      v.append("Debes ", negrita(pesos(falta)), ` de ${pesos(inicial)}`);
      if (siguientes[0]) v.append(` · siguiente: ${pesos(siguientes[0].adj)} el ${fechaCorta(deISO(siguientes[0].fecha))}`);
      caja.append(el);
    }
    $("debtTotal").textContent = `Total: ${pesos(deudas.total())}`;
  }

  pintarImprevistos() {
    const imprevistos = this.app.estado.gastos.filter((g) => g.categoria === "imprevisto")
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || 0) - (a.creado || 0));
    $("impPanel").hidden = imprevistos.length === 0;
    if (!imprevistos.length) return;
    const total = sumar(imprevistos), mes = aISO(hoy()).slice(0, 7);
    const delMes = sumar(imprevistos.filter((g) => g.fecha.slice(0, 7) === mes));
    $("impTotal").textContent = `Total: ${pesos(total)}${delMes && delMes !== total ? " · este mes " + pesos(delMes) : ""}`;
    const lista = $("impList"); lista.innerHTML = "";
    for (const g of imprevistos.slice(0, 12)) {
      const d = deISO(g.fecha), met = metodo(g.metodo) || METODOS[2];
      const fila = document.createElement("div"); fila.className = "item";
      fila.innerHTML = `<div class="d"><b class="num">${d.getDate()}</b>${MESES[d.getMonth()]}</div>
        <div class="what"><div></div><div><span class="dot" style="background:${met.color}"></span><span></span></div></div>
        <div class="m num"></div><span></span>`;
      fila.querySelector(".what div:first-child").textContent = g.nota || "Imprevisto";
      fila.querySelector(".what div:last-child span:last-child").textContent = met.name;
      fila.querySelector(".m").textContent = pesosExactos(g.monto);
      lista.append(fila);
    }
  }
}
