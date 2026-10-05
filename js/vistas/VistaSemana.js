// =============================================================================
// VistaSemana.js — Parte de arriba: selector de semana, "Te queda esta semana",
// barras por categoría y la lista de gastos de la semana (con borrar).
// HTML: #prev #next #weekTitle · .hero · #cats · #list
// =============================================================================
import { CATEGORIAS, CATEGORIAS_CON_PRESUPUESTO, METODOS, categoria, metodo } from "../config.js";
import { $, negrita, pesos, pesosExactos, hoy, sumarDias, lunesDe, fechaCorta, deISO, diasEntre, DIAS } from "../utilidades.js";

export class VistaSemana {
  constructor(app) {
    this.app = app;
    this.desfase = 0;          // 0 = esta semana, -1 = la pasada, etc.
    this.porBorrar = null;     // id del gasto que espera confirmación de borrado
  }

  /** Lunes y domingo de la semana que se está viendo. */
  rango() {
    const inicio = sumarDias(lunesDe(hoy()), this.desfase * 7);
    return { inicio, fin: sumarDias(inicio, 6) };
  }
  esSemanaActual() { return this.desfase === 0; }

  iniciar() {
    $("prev").addEventListener("click", () => { this.desfase--; this.porBorrar = null; this.app.pintar(); });
    $("next").addEventListener("click", () => { if (this.desfase < 0) { this.desfase++; this.porBorrar = null; this.app.pintar(); } });
  }

  pintar() {
    const { inicio, fin } = this.rango();
    const r = this.app.presupuesto.resumenSemana(inicio);
    this.pintarTitulo(inicio, fin);
    this.pintarTotal(r, fin);
    this.pintarCategorias(r);
    this.pintarLista(r.gastos);
  }

  pintarTitulo(inicio, fin) {
    const actual = this.esSemanaActual(), d = this.desfase;
    const titulo = document.createElement("span");
    titulo.textContent = actual ? "Esta semana" : (d === -1 ? "Semana pasada" : (d < 0 ? `Hace ${-d} semanas` : "Próxima semana"));
    const sub = document.createElement("small"); sub.textContent = `lun ${fechaCorta(inicio)} – dom ${fechaCorta(fin)}`;
    $("weekTitle").innerHTML = ""; $("weekTitle").append(titulo, sub);
    $("next").disabled = d >= 0;
  }

  /** El recuadro azul grande. */
  pintarTotal(r, fin) {
    const actual = this.esSemanaActual();
    $("heroLabel").textContent = r.queda < 0
      ? (actual ? "Te pasaste esta semana por" : "Te pasaste esa semana por")
      : (actual ? "Te queda esta semana" : "Te sobró esa semana");
    $("left").textContent = pesos(Math.abs(r.queda));
    $("left").classList.toggle("over", r.queda < 0);
    $("heroSub").innerHTML = "";
    $("heroSub").append("de ", negrita(pesos(r.presupuesto)), ` · gastado ${pesos(r.gastado)}`);
    const pct = r.presupuesto > 0 ? Math.min(100, r.gastado / r.presupuesto * 100) : (r.gastado > 0 ? 100 : 0);
    const barra = $("heroBar"); barra.style.width = pct + "%";
    barra.className = r.gastado > r.presupuesto ? "over" : (pct >= 80 ? "warn" : "");

    const fichas = $("daily"); fichas.innerHTML = "";
    const ficha = (texto) => { const s = document.createElement("span"); s.className = "chip-s num"; s.textContent = texto; fichas.append(s); };
    if (actual) {
      const dias = diasEntre(hoy(), fin) + 1;
      ficha(`${dias} ${dias === 1 ? "día" : "días"} restantes`);
      if (r.queda > 0) ficha(`≈ ${pesos(r.queda / dias)} por día`);
    }
    if (Math.abs(r.arrastreTotal) >= 1)
      ficha(r.arrastreTotal > 0 ? `Incluye ${pesos(r.arrastreTotal)} que te sobró antes` : `Ya trae −${pesos(-r.arrastreTotal)} de semanas pasadas`);
  }

  /** Una barra por categoría con presupuesto. */
  pintarCategorias(r) {
    const caja = $("cats"); caja.innerHTML = "";
    for (const c of CATEGORIAS_CON_PRESUPUESTO) {
      const { base, arrastre, ajuste, gastado, total } = r.porCategoria[c.id];
      if (base === 0 && arrastre === 0 && ajuste === 0 && gastado === 0 && c.id === "otros") continue;
      const p = total > 0 ? gastado / total : (gastado > 0 ? 2 : 0);
      const estado = p > 1 ? "over" : (p >= 0.8 ? "warn" : "ok");
      const el = document.createElement("div"); el.className = "cat";
      el.innerHTML = `<div class="top"><div class="name"><span class="dot" style="background:${c.color}"></span><span></span></div><span class="state ${estado}"></span></div>
        <div class="vals num"></div><div class="meter"><i class="${estado === "ok" ? "" : estado}" style="width:${Math.min(100, p * 100)}%"></i></div>`;
      el.querySelector(".name span:last-child").textContent = c.name;
      el.querySelector(".state").textContent = estado === "over" ? `${pesos(gastado - total)} se restan a la otra semana` : `Quedan ${pesos(total - gastado)}`;
      const v = el.querySelector(".vals");
      v.append(negrita(pesos(gastado)), ` de ${pesos(total)}`);
      const partes = [];
      if (Math.abs(arrastre) >= 1) partes.push(arrastre > 0 ? `+ ${pesos(arrastre)} que te sobró antes` : `− ${pesos(-arrastre)} que gastaste de más antes`);
      if (Math.abs(ajuste) >= 1) partes.push(ajuste > 0 ? `+ ${pesos(ajuste)} que moviste aquí` : `− ${pesos(-ajuste)} que moviste a otro`);
      if (partes.length) v.append(` (${pesos(base)} ${partes.join(" ")})`);
      caja.append(el);
    }
  }

  /** Lista de gastos de la semana, con botón de borrar (pide confirmar con un segundo toque). */
  pintarLista(gastos) {
    const actual = this.esSemanaActual();
    $("listTitle").textContent = actual ? "Gastos de esta semana" : "Gastos de esa semana";
    const lista = $("list"); lista.innerHTML = "";
    if (gastos.length === 0) {
      lista.innerHTML = `<div class="empty">${actual ? "Aún no registras gastos esta semana. Escribe el monto arriba y toca “Agregar gasto”." : "No hay gastos registrados en esa semana."}</div>`;
      return;
    }
    const orden = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || 0) - (a.creado || 0));
    for (const g of orden) {
      const d = deISO(g.fecha);
      const cat = categoria(g.categoria) || CATEGORIAS[2];
      const met = metodo(g.metodo) || METODOS[2];
      const fila = document.createElement("div"); fila.className = "item";
      fila.innerHTML = `<div class="d"><b class="num">${d.getDate()}</b>${DIAS[d.getDay()]}</div>
        <div class="what"><div></div><div><span class="dot" style="background:${met.color}"></span><span></span></div></div>
        <div class="m num"></div><button class="del" type="button" aria-label="Borrar gasto">×</button>`;
      fila.querySelector(".what div:first-child").textContent = g.nota || cat.name;
      fila.querySelector(".what div:last-child span:last-child").textContent =
        `${g.nota ? cat.name + " · " : ""}${met.name}${+g.msi > 1 ? " · " + g.msi + " MSI" : ""}${cat.fuera ? " · no cuenta en tu semana" : ""}`;
      fila.querySelector(".m").textContent = pesosExactos(g.monto);
      const boton = fila.querySelector(".del");
      if (this.porBorrar === g.id) { boton.className = "del confirm"; boton.textContent = "Borrar"; boton.setAttribute("aria-label", "Confirmar borrar"); }
      boton.addEventListener("click", () => this.borrar(g));
      lista.append(fila);
    }
  }

  borrar(gasto) {
    if (this.porBorrar !== gasto.id) {          // primer toque: pedir confirmación 4 segundos
      this.porBorrar = gasto.id; this.pintar();
      setTimeout(() => { if (this.porBorrar === gasto.id) { this.porBorrar = null; this.pintar(); } }, 4000);
      return;
    }
    this.porBorrar = null;
    try { this.app.estado.borrarGasto(gasto.id); }
    catch { $("msg").textContent = "No se pudo borrar. Intenta de nuevo."; this.pintar(); }
  }
}
