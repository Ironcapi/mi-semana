// =============================================================================
// VistaTanque.js — Medidor de gasolina: aguja, litros, hasta cuándo alcanza
// y los botones para decir qué marca el tablero.
// HTML: #gauge #tankState #tankLiters #tankDays #tankTip #fuelChips
// =============================================================================
import { FRACCIONES_TANQUE } from "../config.js";
import { $, negrita, pesos, fechaCorta, DIAS } from "../utilidades.js";

export class VistaTanque {
  constructor(app) { this.app = app; }

  iniciar() {
    const caja = $("fuelChips"); caja.innerHTML = "";
    for (const [etiqueta, fraccion] of FRACCIONES_TANQUE) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = etiqueta;
      b.setAttribute("aria-label", `Mi tablero marca ${etiqueta}`);
      b.addEventListener("click", () => this.calibrar(fraccion, etiqueta));
      caja.append(b);
    }
    setInterval(() => this.pintar(), 5 * 60 * 1000);   // el nivel baja con el tiempo
  }

  calibrar(fraccion, etiqueta) {
    try { this.app.tanque.calibrar(fraccion, etiqueta); }
    catch { $("tankDays").textContent = "No se pudo guardar la lectura. Intenta de nuevo."; }
  }

  pintar() {
    const tanque = this.app.tanque, p = tanque.pronostico();
    const estado = $("tankState"), consejo = $("tankTip");
    if (!p) {
      this.dibujarMedidor(null); estado.className = "state"; estado.textContent = "";
      $("tankLiters").textContent = "Sin lectura"; $("tankDays").textContent = "Toca abajo lo que marca tu tablero para empezar.";
      consejo.hidden = true; return;
    }
    this.dibujarMedidor(p.fraccion);
    estado.className = "state " + (p.fraccion <= 0.15 ? "over" : p.fraccion <= 0.3 ? "warn" : "ok");
    estado.textContent = p.fraccion <= 0.15 ? "Carga hoy" : p.fraccion <= 0.3 ? "Carga pronto" : "Vas bien";
    $("tankLiters").textContent = `≈ ${p.litros.toFixed(1)} L · ${Math.round(p.fraccion * 100)}%`;
    const t = tanque.config();
    $("tankDays").textContent = (p.seAcaba ? `Unos ${Math.round(p.km)} km: te alcanza hasta el ${DIAS[p.seAcaba.getDay()]} ${fechaCorta(p.seAcaba)}. ` : "") +
      (+t.consumoDia > 0 ? `Consumo fijo de ${(+t.consumoDia).toFixed(1)} L al día.` : `Cada día de trabajo (${(+t.kmTrabajo).toFixed(1)} km) usa ~${((+t.kmTrabajo) / tanque.rendimiento()).toFixed(1)} L.`);
    consejo.hidden = false; consejo.innerHTML = "";
    if (p.faltaParaDomingo > 0.5) {
      const litros = Math.ceil(p.faltaParaDomingo);
      consejo.append("Para llegar al domingo te faltan ~", negrita(`${litros} L (≈ ${pesos(litros * tanque.precio())})`), `. Te caben ${Math.floor(p.espacio)} L.`);
    } else {
      consejo.append("Con lo que tienes ", negrita("llegas al domingo"), " sin cargar.");
    }
  }

  /** Dibuja el semicírculo E–F en SVG. `fraccion` de 0 a 1, o null si no hay lectura. */
  dibujarMedidor(fraccion) {
    const cx = 100, cy = 100, r = 80;
    const punto = (f, radio) => { const a = Math.PI * (1 - f); return [cx + radio * Math.cos(a), cy - radio * Math.sin(a)]; };
    const arco = (f0, f1) => { const [x0, y0] = punto(f0, r), [x1, y1] = punto(f1, r); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
    let svg = `<path d="${arco(0, 1)}" class="g-track" fill="none" stroke-width="14" stroke-linecap="round"/>`;
    if (fraccion != null) {
      const color = fraccion <= 0.15 ? "var(--bad)" : fraccion <= 0.3 ? "var(--warn)" : "var(--accent)";
      if (fraccion > 0.005) svg += `<path d="${arco(0, Math.min(1, fraccion))}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>`;
      const [nx, ny] = punto(Math.min(1, Math.max(0, fraccion)), r - 22);
      svg += `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="g-needle" stroke-width="3" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="6" class="g-hub"/>`;
    }
    for (const [etiqueta, f] of [["E", 0], ["½", 0.5], ["F", 1]]) {
      const [x, y] = punto(f, r - 26);
      svg += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="g-text">${etiqueta}</text>`;
    }
    $("gauge").innerHTML = svg;
  }
}
