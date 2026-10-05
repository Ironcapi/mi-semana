// =============================================================================
// VistaPagos.js — "Próximos pagos" (con el botón "Ya pagué") y el formulario
// de "Abono extra".
// HTML: #pagos #nextTotal · #abonoForm #abMonto #abDeuda #abFecha #abNota #abAdd #abMsg
// =============================================================================
import { colorDeDeuda } from "../config.js";
import { $, pesos, pesosExactos, aISO, deISO, hoy, sumarDias, diasEntre, redondear2, sumar, MESES } from "../utilidades.js";

const MAX_PENDIENTES = 6;   // cuántos pagos pendientes se muestran a la vez

export class VistaPagos {
  constructor(app) { this.app = app; }

  iniciar() {
    $("abFecha").value = aISO(hoy());
    $("abonoForm").addEventListener("submit", (e) => this.abonar(e));
  }

  pintar() { this.pintarLista(); this.pintarOpcionesDeAbono(); }

  pintarLista() {
    const caja = $("pagos"); caja.innerHTML = "";
    const t = hoy(), tIso = aISO(t), enUnaSemana = aISO(sumarDias(t, 7)), haceUnaSemana = aISO(sumarDias(t, -7));
    const todos = this.app.pagos.proximos();
    // se muestran los pendientes y los pagados en los últimos 7 días
    const visibles = todos.filter((p) => !p.pagado || ((p.pagadoEl || p.fecha) >= haceUnaSemana));
    const pendientes = visibles.filter((p) => !p.pagado);
    const primeros = new Set(pendientes.slice(0, MAX_PENDIENTES).map((p) => p.id));
    const lista = visibles.filter((p) => p.pagado || primeros.has(p.id));
    const en30 = sumar(pendientes.filter((p) => p.fecha <= aISO(sumarDias(t, 30))));
    $("nextTotal").textContent = pendientes.length ? `${pesos(en30)} en los próximos 30 días` : "";
    if (lista.length === 0) { caja.innerHTML = '<div class="empty">No tienes pagos pendientes.</div>'; return; }

    for (const p of lista) {
      const d = deISO(p.fecha), vencido = !p.pagado && p.fecha < tIso;
      const fila = document.createElement("div"); fila.className = "pago" + (p.pagado ? " done" : "") + (vencido ? " late" : "");
      fila.innerHTML = `<div class="when"><b class="num">${d.getDate()}</b>${MESES[d.getMonth()]}</div>
        <div class="c"><div></div><div></div></div>
        <div class="r"><b class="num"></b><button type="button" class="mark"></button></div>`;
      fila.querySelector(".c div:first-child").textContent = p.concepto;
      const detalle = fila.querySelector(".c div:last-child");
      detalle.insertAdjacentHTML("beforeend", `<span class="dot" style="background:${colorDeDeuda(p.tarjeta || p.deuda)}"></span>`);
      const etiqueta = document.createElement("span"); etiqueta.className = "tag";
      if (p.pagado) etiqueta.textContent = "Pagado";
      else if (vencido) { etiqueta.className = "tag late"; etiqueta.textContent = "Vencido"; }
      else if (p.fecha <= enUnaSemana) { etiqueta.className = "tag soon"; etiqueta.textContent = p.fecha === tIso ? "Hoy" : "Esta semana"; }
      else etiqueta.textContent = `en ${diasEntre(t, d)} días`;
      detalle.append(etiqueta);
      if (p.extra) detalle.append(" · abono extra");
      if (p.ajustado && !p.pagado) detalle.append(" · ajustado por tus abonos");
      if (p.abierto && !p.pagado) detalle.append(" · sigue sumando hasta el corte");
      fila.querySelector(".r b").textContent = pesos(p.monto);
      const boton = fila.querySelector(".mark");
      boton.textContent = p.pagado ? "Deshacer" : "Ya pagué"; if (p.pagado) boton.classList.add("undo");
      boton.addEventListener("click", () => this.alternar(p));
      caja.append(fila);
    }
  }

  alternar(pago) {
    try { this.app.pagos.alternar(pago); }
    catch { $("msg").textContent = "No se pudo actualizar el pago. Intenta de nuevo."; }
  }

  /** Llena el selector "A qué" del abono con tus deudas. */
  pintarOpcionesDeAbono() {
    const sel = $("abDeuda"), antes = sel.value; sel.innerHTML = "";
    const opciones = this.app.deudas.ordenadas().map((d) => ({ v: d.id, t: d.tarjeta ? this.app.tarjetas.nombre(d.tarjeta) : d.nombre }));
    for (const o of opciones) sel.append(Object.assign(document.createElement("option"), { value: o.v, textContent: o.t }));
    if (antes && opciones.some((o) => o.v === antes)) sel.value = antes;
    $("abAdd").disabled = opciones.length === 0;
  }

  abonar(evento) {
    evento.preventDefault();
    const monto = redondear2(parseFloat($("abMonto").value));
    if (!(monto > 0)) { $("abMsg").textContent = "Escribe un monto mayor a $0."; return; }
    const deuda = this.app.estado.deudas.find((x) => x.id === $("abDeuda").value);
    if (!deuda) { $("abMsg").textContent = "Elige a qué deuda o tarjeta va el abono."; return; }
    const fecha = $("abFecha").value || aISO(hoy());
    const nota = $("abNota").value.trim().slice(0, 60);
    try {
      const nombre = this.app.pagos.abonar(deuda, monto, fecha, nota);
      $("abMsg").textContent = `Abono de ${pesosExactos(monto)} a ${nombre} registrado.`;
      $("abMonto").value = ""; $("abNota").value = "";
    } catch { $("abMsg").textContent = "No se pudo registrar el abono. Intenta de nuevo."; }
  }
}
