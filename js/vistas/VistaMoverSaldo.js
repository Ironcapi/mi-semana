// =============================================================================
// VistaMoverSaldo.js — "Mover saldo entre presupuestos" (solo en la semana actual).
// Nunca sube el total: solo pasa lo que te sobra de una categoría a otra.
// HTML: #mover #mvDe #mvA #mvMonto #mvBtn #mvMsg #mvList
// =============================================================================
import { CATEGORIAS_CON_PRESUPUESTO, categoria } from "../config.js";
import { $, pesos, aISO, hoy, lunesDe, redondear2 } from "../utilidades.js";

export class VistaMoverSaldo {
  constructor(app) { this.app = app; }

  iniciar() { $("mvBtn").addEventListener("click", () => this.mover()); }

  pintar() {
    const actual = this.app.vistaSemana.esSemanaActual();
    $("mover").hidden = !actual;
    if (!actual) return;
    const lunes = lunesDe(hoy()), p = this.app.presupuesto;
    const de = $("mvDe"), a = $("mvA"), antesDe = de.value, antesA = a.value;
    de.innerHTML = ""; a.innerHTML = "";
    for (const c of CATEGORIAS_CON_PRESUPUESTO) {
      const queda = Math.max(0, p.disponibleDe(c.id, lunes));
      de.append(Object.assign(document.createElement("option"), { value: c.id, textContent: `${c.name} (te quedan ${pesos(queda)})` }));
      a.append(Object.assign(document.createElement("option"), { value: c.id, textContent: c.name }));
    }
    de.value = antesDe || "gasolina"; a.value = antesA || (de.value === "comida" ? "gasolina" : "comida");

    // movimientos ya hechos esta semana, con opción de deshacer
    const lista = $("mvList"); lista.innerHTML = "";
    const nombre = (id) => (categoria(id) || {}).name || id;
    for (const m of this.app.estado.movimientos.filter((x) => x.semana === aISO(lunes))) {
      const fila = document.createElement("div"); fila.className = "mvi num";
      fila.innerHTML = `<span></span><button type="button" class="mark undo">Deshacer</button>`;
      fila.querySelector("span").textContent = `${nombre(m.de)} → ${nombre(m.a)}: ${pesos(m.monto)}`;
      fila.querySelector("button").addEventListener("click", () => this.deshacer(m, lunes));
      lista.append(fila);
    }
  }

  mover() {
    const lunes = lunesDe(hoy());
    const de = $("mvDe").value, a = $("mvA").value;
    const monto = redondear2(parseFloat($("mvMonto").value));
    const queda = this.app.presupuesto.disponibleDe(de, lunes);
    const msg = $("mvMsg");
    if (de === a) { msg.textContent = "Elige dos presupuestos distintos."; return; }
    if (!(monto > 0)) { msg.textContent = "Escribe cuánto quieres mover."; return; }
    if (monto > queda + 0.001) { msg.textContent = `Solo te quedan ${pesos(Math.max(0, queda))} en ${categoria(de).name}. No puedes mover más de lo que te sobra.`; return; }
    try {
      this.app.estado.agregarMovimiento({ semana: aISO(lunes), de, a, monto, creado: Date.now() });
      $("mvMsg").textContent = `Listo: moviste ${pesos(monto)}.`; $("mvMonto").value = "";
    } catch { $("mvMsg").textContent = "No se pudo mover. Intenta de nuevo."; }
  }

  deshacer(mov, lunes) {
    if (this.app.presupuesto.disponibleDe(mov.a, lunes) < mov.monto - 0.001) { $("mvMsg").textContent = "Ya gastaste parte de ese dinero, así que no se puede deshacer."; return; }
    try { this.app.estado.borrarMovimiento(mov.id); $("mvMsg").textContent = "Movimiento deshecho."; }
    catch { $("mvMsg").textContent = "No se pudo deshacer. Intenta de nuevo."; }
  }
}
