// =============================================================================
// Tanque.js — Estimación de la gasolina que queda.
// Parte de la última lectura del tablero, suma los litros de cada carga registrada
// y resta el consumo de cada día (trayecto de trabajo + km extra repartidos).
// =============================================================================
import { CONFIG_BASE } from "../config.js";
import { aISO, deISO, hoy, sumarDias, lunesDe, MS_DIA } from "../utilidades.js";

export class Tanque {
  /** @param {import("../datos/Estado.js").Estado} estado */
  constructor(estado) { this.estado = estado; }

  /** Datos del coche: capacidad, precio por litro, km/L, km por día de trabajo, etc. */
  config() { return this.estado.cfg.tanque || CONFIG_BASE.tanque; }
  capacidad() { return +this.config().capacidad || 46; }
  precio() { return +this.config().precio || 23.72; }
  rendimiento() { return +this.config().kmL || 12; }

  /** Litros que se gastan en un día concreto (lun–sáb trabajo según diasTrabajo). */
  litrosDelDia(fecha) {
    const t = this.config();
    if (+t.consumoDia > 0) return +t.consumoDia;
    const dow = fecha.getDay(), dias = Math.min(7, +t.diasTrabajo || 0);
    const esDeTrabajo = dow === 0 ? dias >= 7 : dow <= dias;
    return ((esDeTrabajo ? +t.kmTrabajo || 0 : 0) + (+t.kmExtraSemana || 0) / 7) / this.rendimiento();
  }

  /** Litros consumidos entre dos momentos (en milisegundos). */
  consumido(desdeMs, hastaMs) {
    let litros = 0, c = desdeMs;
    for (let i = 0; c < hastaMs && i < 400; i++) {
      const d = new Date(c);
      const medianoche = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const fin = Math.min(medianoche, hastaMs);
      litros += this.litrosDelDia(d) * (fin - c) / MS_DIA;
      c = fin;
    }
    return litros;
  }

  /** Litros estimados ahora, o null si nunca has dado una lectura. */
  nivel(ahoraMs) {
    const lectura = this.estado.lecturaTanque;
    if (!lectura) return null;
    const cap = this.capacidad(), precio = this.precio();
    const cargas = this.estado.gastos.filter((g) => g.categoria === "gasolina").map((g) => {
      const creado = g.creado ? new Date(g.creado) : null;
      // si se registró el mismo día se usa la hora real; si no, mediodía de su fecha
      const t = creado && aISO(creado) === g.fecha ? g.creado : deISO(g.fecha).getTime() + 12 * 3600e3;
      return { t, litros: +g.litros > 0 ? +g.litros : g.monto / precio };
    }).filter((c) => c.t > lectura.ts && c.t <= ahoraMs).sort((a, b) => a.t - b.t);
    let nivel = Math.min(cap, Math.max(0, +lectura.litros || 0)), ultimo = lectura.ts;
    for (const c of cargas) {
      nivel = Math.max(0, nivel - this.consumido(ultimo, c.t));
      nivel = Math.min(cap, nivel + c.litros);
      ultimo = c.t;
    }
    return Math.max(0, nivel - this.consumido(ultimo, ahoraMs));
  }

  /**
   * Pronóstico para pintar el medidor.
   * @returns {null | { litros:number, fraccion:number, km:number, seAcaba:Date|null, faltaParaDomingo:number, espacio:number }}
   */
  pronostico(ahoraMs = Date.now()) {
    const litros = this.nivel(ahoraMs);
    if (litros == null) return null;
    // Avanza día por día con el patrón real de la semana hasta vaciar el tanque.
    let resto = litros, c = ahoraMs, seAcaba = null;
    for (let i = 0; i < 90 && resto > 0; i++) {
      const d = new Date(c);
      const medianoche = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const uso = this.consumido(c, medianoche);
      if (uso >= resto) { seAcaba = new Date(c + (medianoche - c) * (resto / uso)); resto = 0; break; }
      resto -= uso; c = medianoche;
    }
    const proximoLunes = sumarDias(lunesDe(hoy()), 7);
    return {
      litros, fraccion: litros / this.capacidad(), km: litros * this.rendimiento(), seAcaba,
      faltaParaDomingo: this.consumido(ahoraMs, proximoLunes.getTime()) - litros,
      espacio: this.capacidad() - litros,
    };
  }

  /** Lo que cuesta la gasolina de una semana normal con tus trayectos. */
  gastoSemanalEstimado() {
    const w = lunesDe(hoy()).getTime();
    return this.consumido(w, w + 7 * MS_DIA) * this.precio();
  }

  /** Guarda lo que marca el tablero ahora (fracción de 0 a 1). */
  calibrar(fraccion, etiqueta) {
    this.estado.guardarLecturaTanque({ litros: Math.round(fraccion * this.capacidad() * 100) / 100, ts: Date.now(), marca: etiqueta });
  }
}
