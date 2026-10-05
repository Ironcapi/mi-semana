// =============================================================================
// Estado.js — La "memoria" de la app: todo lo que hay guardado, ya leído y ordenado.
// Las clases de cálculo leen de aquí; las vistas llaman a sus acciones para guardar.
// Cada vez que algo cambia, vuelve a leer del Almacen y avisa para repintar.
// =============================================================================
import { CONFIG_BASE } from "../config.js";

export class Estado {
  /** @param {import("./Almacen.js").Almacen} almacen */
  constructor(almacen) {
    this.almacen = almacen;
    this.oyentes = new Set();
    this.cargar();
    almacen.alCambiar(() => { this.cargar(); this.oyentes.forEach((fn) => fn()); });
  }

  /** Lee todo del almacén y lo deja listo en propiedades. */
  cargar() {
    const a = this.almacen;
    /** Configuración efectiva (base + lo guardado). */
    this.cfg = Estado.combinarConfig(a.leer("config/presupuesto"));
    /** {id, monto, categoria, metodo, fecha, nota, creado, litros?, msi?} — más reciente primero */
    this.gastos = a.listar("gastos").filter((g) => typeof g.monto === "number" && typeof g.fecha === "string")
      .sort((x, y) => y.fecha.localeCompare(x.fecha));
    /** {id, fecha, concepto, deuda?, tarjeta?, monto, pagado, pagadoEl?, pagadoTs?, auto?, extra?} */
    this.pagos = a.listar("pagos").filter((p) => typeof p.fecha === "string" && typeof p.monto === "number")
      .sort((x, y) => x.fecha.localeCompare(y.fecha));
    /** {id, nombre, saldoInicial, orden, tarjeta?} */
    this.deudas = a.listar("deudas");
    /** {id, semana, de, a, monto, creado} — saldo movido entre presupuestos */
    this.movimientos = a.listar("movimientos").filter((m) => typeof m.monto === "number" && m.semana && m.de && m.a);
    /** {litros, ts, marca} — última lectura del tablero, o null */
    const t = a.leer("config/tanque");
    this.lecturaTanque = t && typeof t.litros === "number" && typeof t.ts === "number" ? t : null;
    /** {saldo, ts} — última vez que escribiste tu saldo real, o null */
    const s = a.leer("config/ahorro");
    this.saldoAhorro = s && typeof s.saldo === "number" && typeof s.ts === "number" ? s : null;
  }

  /** Mezcla la configuración base con la guardada, cuidando los objetos anidados. */
  static combinarConfig(guardada) {
    const base = structuredClone(CONFIG_BASE);
    if (!guardada) return base;
    const tarjetasG = guardada.tarjetas || {};
    const cfg = {
      ...base, ...guardada,
      semanal: { ...base.semanal, ...(guardada.semanal || {}) },
      tarjetas: { bbva: { ...base.tarjetas.bbva, ...(tarjetasG.bbva || {}) }, revolut: { ...base.tarjetas.revolut, ...(tarjetasG.revolut || {}) } },
      tanque: { ...base.tanque, ...(guardada.tanque || {}) },
    };
    if (!Array.isArray(cfg.mensual)) cfg.mensual = base.mensual;
    cfg.topes = Array.isArray(guardada.topes) ? guardada.topes : base.topes;
    cfg.topeSanoMax = Math.min(+guardada.topeSanoMax || base.topeSanoMax, 0.30);
    cfg.tope = Math.min(+cfg.tope || 0.3, cfg.topeSanoMax);
    cfg.historial = { ...base.historial, ...(guardada.historial || {}) };
    return cfg;
  }

  /** Registra una función que se llama después de cada cambio. */
  alCambiar(fn) { this.oyentes.add(fn); }

  // ---------------------------------------------------------------- acciones
  agregarGasto(gasto) { const id = this.almacen.nuevoId(); this.almacen.guardar("gastos/" + id, gasto); return id; }
  borrarGasto(id) { this.almacen.borrar("gastos/" + id); }

  guardarPago(id, pago) { this.almacen.guardar("pagos/" + id, pago); }
  actualizarPago(id, cambios) { this.almacen.actualizar("pagos/" + id, cambios); }
  borrarPago(id) { this.almacen.borrar("pagos/" + id); }

  agregarMovimiento(mov) { this.almacen.guardar("movimientos/mov-" + Date.now(), mov); }
  borrarMovimiento(id) { this.almacen.borrar("movimientos/" + id); }

  guardarConfig(cfg) { this.almacen.guardar("config/presupuesto", cfg); }
  guardarLecturaTanque(lectura) { this.almacen.guardar("config/tanque", lectura); }
  guardarSaldo(saldo) { this.almacen.guardar("config/ahorro", saldo); }
}
