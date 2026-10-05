// =============================================================================
// VistaAhorro.js — "Mi ahorro": ahorro libre, su desglose y avance del fondo.
// HTML: #savBody #savEmpty #savWhen #savLabel #savLibre #savRows #savMeter #savMeta
//       #savSaldo #savBtn #savMsg
// =============================================================================
import { $, pesos, MESES } from "../utilidades.js";

export class VistaAhorro {
  constructor(app) { this.app = app; }

  iniciar() { $("savBtn").addEventListener("click", () => this.guardar()); }

  pintar() {
    const r = this.app.ahorro.resumen();
    $("savBody").hidden = !r; $("savEmpty").hidden = !!r;
    if (!r) { $("savWhen").textContent = ""; return; }
    const dias = r.diasDesdeLectura;
    $("savWhen").textContent = dias === 0 ? "Saldo actualizado hoy" : `Saldo actualizado hace ${dias} ${dias === 1 ? "día" : "días"}`;
    $("savLabel").textContent = r.libre < 0 ? "Te falta para cubrir lo comprometido" : "Ahorro libre";
    $("savLibre").textContent = pesos(Math.abs(r.libre)); $("savLibre").classList.toggle("neg", r.libre < 0);

    const filas = $("savRows"); filas.innerHTML = "";
    const fila = (texto, valor, clase) => {
      const el = document.createElement("div"); el.className = "bl " + (clase || "");
      el.innerHTML = `<div class="k"><span></span></div><b class="num"></b><span></span>`;
      el.querySelector(".k span").textContent = texto; el.querySelector("b").textContent = valor; filas.append(el);
    };
    const quincena = `${r.quincena.getDate()} ${MESES[r.quincena.getMonth()]}`;
    fila(dias === 0 ? "Tienes en total" : "Tienes en total (estimado)", pesos(r.saldo), "in");
    fila(`Por gastar hasta tu quincena del ${quincena}`, "−" + pesos(r.porGastar), "neg");
    fila(`Pagos antes del ${quincena}`, "−" + pesos(r.pagosAntes), "neg");
    fila("Apartado para tarjetas", "−" + pesos(r.tarjetas), "neg");

    const barra = $("savMeter"), texto = $("savMeta");
    barra.hidden = !(r.meta > 0); texto.hidden = !(r.meta > 0);
    if (r.meta > 0) {
      const pct = Math.max(0, Math.min(1, r.libre / r.meta));
      barra.querySelector("i").style.width = (pct * 100) + "%";
      texto.textContent = `Fondo de emergencia: ${Math.round(pct * 100)}% de tu meta de ${pesos(r.meta)} (${this.app.estado.cfg.metaMeses || 3} meses de gastos esenciales).`;
    }
  }

  guardar() {
    const v = parseFloat($("savSaldo").value);
    if (!(v >= 0)) { $("savMsg").textContent = "Escribe cuánto dinero tienes en total."; return; }
    try { this.app.ahorro.actualizarSaldo(v); $("savSaldo").value = ""; $("savMsg").textContent = "Saldo actualizado."; }
    catch { $("savMsg").textContent = "No se pudo guardar el saldo. Intenta de nuevo."; }
  }
}
