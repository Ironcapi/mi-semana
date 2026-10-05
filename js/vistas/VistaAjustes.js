// =============================================================================
// VistaAjustes.js — "Ajustar presupuesto": presupuestos semanales (con candado
// de tope), límites de tarjetas, ingreso y datos del coche.
// HTML: #settings #lockInfo #saveCfg #cfgMsg
// =============================================================================
import { CATEGORIAS_CON_PRESUPUESTO } from "../config.js";
import { $, negrita, pesos, aISO, hoy, lunesDe } from "../utilidades.js";

export class VistaAjustes {
  constructor(app) {
    this.app = app;
    this.ultimaConfig = "";   // para no borrar lo que estás escribiendo si la config no cambió
  }

  iniciar() { $("saveCfg").addEventListener("click", () => this.guardar()); }

  /** Lista de campos: id del input, etiqueta y valor actual. Para agregar un ajuste, agrégalo aquí y en guardar(). */
  campos() {
    const cfg = this.app.estado.cfg, tq = this.app.tanque.config(), p = this.app.presupuesto, lunes = lunesDe(hoy());
    return [
      ...CATEGORIAS_CON_PRESUPUESTO.map((c) => ({ id: "cfg-" + c.id, etiqueta: `${c.name} (semana)`, valor: p.baseDe(c.id, lunes) })),
      { id: "cfg-limb", etiqueta: "Límite BBVA", valor: cfg.tarjetas.bbva.limite },
      { id: "cfg-limr", etiqueta: "Límite Revolut", valor: cfg.tarjetas.revolut.limite },
      { id: "cfg-tope", etiqueta: "Tope sano (%)", valor: Math.round(cfg.tope * 100) },
      { id: "cfg-ing", etiqueta: "Ingreso por quincena (días 15 y 30)", valor: (cfg.ingreso || {}).monto || 0 },
      { id: "cfg-cap", etiqueta: "Tanque del coche (litros)", valor: tq.capacidad },
      { id: "cfg-precio", etiqueta: "Precio por litro", valor: tq.precio },
      { id: "cfg-kml", etiqueta: "Rendimiento (km por litro)", valor: tq.kmL },
      { id: "cfg-kmt", etiqueta: "Km por día de trabajo (ida y vuelta)", valor: tq.kmTrabajo },
      { id: "cfg-dias", etiqueta: "Días de trabajo (5 = lun–vie, 6 = lun–sáb)", valor: tq.diasTrabajo },
      { id: "cfg-kmx", etiqueta: "Km extra por semana", valor: tq.kmExtraSemana },
    ];
  }

  pintar() {
    const firma = JSON.stringify(this.app.estado.cfg) + aISO(lunesDe(hoy()));
    if (firma === this.ultimaConfig) return;
    this.ultimaConfig = firma;
    const caja = $("settings"); caja.innerHTML = "";
    for (const c of this.campos()) {
      caja.insertAdjacentHTML("beforeend", `<div class="field"><label class="label" for="${c.id}"></label><input id="${c.id}" type="number" inputmode="decimal" min="0" step="any"></div>`);
      caja.querySelector(`label[for="${c.id}"]`).textContent = c.etiqueta;
      $(c.id).value = c.valor;
    }
    for (const c of CATEGORIAS_CON_PRESUPUESTO) $("cfg-" + c.id).addEventListener("input", () => this.pintarCandado());
    this.pintarCandado();
  }

  /** Lo que el usuario tiene escrito en un campo, como número ≥ 0. */
  numero(id) { return Math.max(0, parseFloat($(id)?.value) || 0); }

  /** Recuadro que dice cuál es el tope semanal y cuánto llevas. */
  pintarCandado() {
    const caja = $("lockInfo");
    const tope = this.app.presupuesto.topeDe(lunesDe(hoy()));
    if (!isFinite(tope)) { caja.textContent = "Sin tope configurado. Restaura tu respaldo para cargar tu plan."; return; }
    const suma = CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + this.numero("cfg-" + c.id), 0);
    caja.innerHTML = "";
    caja.append("Tope semanal para gasolina, comida y gustos: ", negrita(pesos(tope)), `. Vas en ${pesos(suma)}${suma > tope ? " (te pasas por " + pesos(suma - tope) + ")" : ""}. Para subir uno, baja otro.`);
    const gasolina = this.numero("cfg-gasolina"), necesita = this.app.tanque.gastoSemanalEstimado();
    if (gasolina + 1 < necesita) caja.append(` Ojo: tu coche gasta ~${pesos(necesita)} a la semana con tus trayectos.`);
  }

  guardar() {
    const estado = this.app.estado, p = this.app.presupuesto, cfg = estado.cfg, msg = $("cfgMsg");
    const nueva = structuredClone(cfg);
    const lunes = lunesDe(hoy()), lunesIso = aISO(lunes);
    CATEGORIAS_CON_PRESUPUESTO.forEach((c) => nueva.semanal[c.id] = this.numero("cfg-" + c.id));

    // ---- candados: no se guarda si rompe el tope ----
    const suma = CATEGORIAS_CON_PRESUPUESTO.reduce((x, c) => x + nueva.semanal[c.id], 0), tope = p.topeDe(lunes);
    if (suma > tope + 0.001) { msg.textContent = `No se guardó: tus presupuestos suman ${pesos(suma)} y el tope es ${pesos(tope)}. Baja otro presupuesto para compensar.`; return; }
    const maxSano = cfg.topeSanoMax || 0.3;
    if (this.numero("cfg-tope") / 100 > maxSano + 1e-9) { msg.textContent = `No se guardó: el tope sano de las tarjetas no puede pasar de ${Math.round(maxSano * 100)}%.`; return; }

    // ---- historial: un cambio de presupuesto cuenta desde esta semana, no hacia atrás ----
    nueva.historial = { ...(cfg.historial || {}) };
    for (const c of CATEGORIAS_CON_PRESUPUESTO) {
      if (Math.abs(nueva.semanal[c.id] - p.baseDe(c.id, lunes)) < 0.001) continue;
      const previo = p.historialDe(c.id);
      const hist = previo.length ? [...previo] : [{ desde: cfg.inicioGas || lunesIso, monto: +cfg.semanal[c.id] || 0 }];
      nueva.historial[c.id] = hist.filter((h) => h.desde !== lunesIso).concat([{ desde: lunesIso, monto: nueva.semanal[c.id] }]);
    }

    // ---- resto de ajustes ----
    nueva.tarjetas.bbva.limite = this.numero("cfg-limb");
    nueva.tarjetas.revolut.limite = this.numero("cfg-limr");
    nueva.tope = Math.min(maxSano * 100, this.numero("cfg-tope")) / 100;
    nueva.ingreso = { dias: [15, 30], ...(cfg.ingreso || {}), monto: this.numero("cfg-ing") };
    nueva.tanque = {
      ...this.app.tanque.config(),
      capacidad: this.numero("cfg-cap") || 46, precio: this.numero("cfg-precio") || 23.72, kmL: this.numero("cfg-kml") || 12,
      kmTrabajo: this.numero("cfg-kmt"), diasTrabajo: Math.min(7, Math.round(this.numero("cfg-dias"))), kmExtraSemana: this.numero("cfg-kmx"), consumoDia: 0,
    };
    try { estado.guardarConfig(nueva); msg.textContent = "Presupuesto guardado."; }
    catch { msg.textContent = "No se pudo guardar el presupuesto. Intenta de nuevo."; }
  }
}
