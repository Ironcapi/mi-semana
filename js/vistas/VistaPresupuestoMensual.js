// =============================================================================
// VistaPresupuestoMensual.js — Tabla del presupuesto del mes (solo informativa).
// Los renglones vienen de cfg.mensual: {concepto, monto, tipo}
//   tipo: "ingreso" | "necesidad" | "colchon" | "deuda"   (el ahorro se calcula solo)
// HTML: #split #budget #budgetNote
// =============================================================================
import { $, pesos, sumar } from "../utilidades.js";

const COLORES = { necesidad: "var(--rev)", colchon: "#9dbfe9", deuda: "#7a5af5", ahorro: "var(--accent)" };

export class VistaPresupuestoMensual {
  constructor(app) { this.app = app; }

  iniciar() {}

  pintar() {
    const cfg = this.app.estado.cfg, renglones = cfg.mensual || [];
    const ingreso = sumar(renglones.filter((i) => i.tipo === "ingreso"));
    const salidas = renglones.filter((i) => i.tipo !== "ingreso");
    const ahorro = ingreso - sumar(salidas);

    // barra de proporciones
    const grupos = ["necesidad", "colchon", "deuda"].map((t) => ({ t, v: sumar(salidas.filter((i) => i.tipo === t)) }));
    grupos.push({ t: "ahorro", v: Math.max(0, ahorro) });
    $("split").innerHTML = grupos.filter((g) => g.v > 0).map((g) => `<i style="flex:${g.v};background:${COLORES[g.t]}"></i>`).join("");

    // tabla
    const caja = $("budget"); caja.innerHTML = "";
    const fila = (concepto, monto, clase, color) => {
      const el = document.createElement("div"); el.className = "bl " + (clase || "");
      el.innerHTML = `<div class="k">${color ? `<span class="dot" style="background:${color}"></span>` : ""}<span></span></div><b class="num"></b><span class="p num"></span>`;
      el.querySelector(".k span:last-child").textContent = concepto;
      el.querySelector("b").textContent = pesos(monto);
      el.querySelector(".p").textContent = ingreso > 0 ? Math.round(monto / ingreso * 100) + "%" : "";
      caja.append(el);
    };
    fila("Ingreso", ingreso, "in");
    for (const i of salidas) fila(i.concepto, i.monto, "", COLORES[i.tipo]);
    fila("Ahorro (lo que queda)", ahorro, "sav", COLORES.ahorro);
    $("budgetNote").textContent = cfg.notaMensual || "";
  }
}
