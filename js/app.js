// =============================================================================
// app.js — Punto de entrada. Crea las piezas, las conecta y pinta la pantalla.
//
// Flujo:  Almacen (localStorage)  →  Estado (datos en memoria)
//                                      ↓ lo leen
//         calculos/*  (Presupuesto, Deudas, Tarjetas, Pagos, Tanque, Ahorro)
//                                      ↓ los usan
//         vistas/*    (cada sección de la página)
//
// Cuando una vista guarda algo, el Estado avisa y app.pintar() repinta todo.
// =============================================================================
import { CLAVE_ALMACEN } from "./config.js";
import { $ } from "./utilidades.js";
import { Almacen } from "./datos/Almacen.js";
import { Estado } from "./datos/Estado.js";
import { Respaldo } from "./datos/Respaldo.js";
import { Presupuesto } from "./calculos/Presupuesto.js";
import { Deudas } from "./calculos/Deudas.js";
import { Tarjetas } from "./calculos/Tarjetas.js";
import { Pagos } from "./calculos/Pagos.js";
import { Tanque } from "./calculos/Tanque.js";
import { Ahorro } from "./calculos/Ahorro.js";
import { VistaSemana } from "./vistas/VistaSemana.js";
import { VistaMoverSaldo } from "./vistas/VistaMoverSaldo.js";
import { FormularioGasto } from "./vistas/FormularioGasto.js";
import { VistaTanque } from "./vistas/VistaTanque.js";
import { VistaPagos } from "./vistas/VistaPagos.js";
import { VistaTarjetas } from "./vistas/VistaTarjetas.js";
import { VistaAhorro } from "./vistas/VistaAhorro.js";
import { VistaDeudas } from "./vistas/VistaDeudas.js";
import { VistaPresupuestoMensual } from "./vistas/VistaPresupuestoMensual.js";
import { VistaAjustes } from "./vistas/VistaAjustes.js";
import { VistaRespaldo } from "./vistas/VistaRespaldo.js";

class App {
  constructor() {
    // ---- datos ----
    this.almacen = new Almacen(CLAVE_ALMACEN);
    this.estado = new Estado(this.almacen);
    this.respaldo = new Respaldo(this.almacen);

    // ---- cálculos (el orden importa: unos usan a otros) ----
    this.presupuesto = new Presupuesto(this.estado);
    this.deudas = new Deudas(this.estado);
    this.tarjetas = new Tarjetas(this.estado, this.deudas);
    this.pagos = new Pagos(this.estado, this.deudas, this.tarjetas);
    this.tanque = new Tanque(this.estado);
    this.ahorro = new Ahorro(this.estado, this.presupuesto, this.tarjetas, this.pagos);

    // ---- vistas (en el orden en que aparecen en la página) ----
    this.vistaSemana = new VistaSemana(this);
    this.vistas = [
      this.vistaSemana,
      new FormularioGasto(this),
      new VistaMoverSaldo(this),
      new VistaTanque(this),
      new VistaPagos(this),
      new VistaTarjetas(this),
      new VistaAhorro(this),
      new VistaDeudas(this),
      new VistaPresupuestoMensual(this),
      new VistaAjustes(this),
      new VistaRespaldo(this),
    ];
  }

  iniciar() {
    this.vistas.forEach((v) => v.iniciar());
    this.estado.alCambiar(() => this.pintar());
    this.avisoInicial();
    this.pintar();
  }

  /** Repinta todas las secciones con los datos actuales. */
  pintar() { this.vistas.forEach((v) => v.pintar()); }

  /** Aviso amarillo de arriba: sin almacenamiento, o primera vez sin datos. */
  avisoInicial() {
    const aviso = $("banner");
    if (!this.almacen.disponible) {
      aviso.hidden = false;
      aviso.textContent = "Este navegador no permite guardar datos (¿navegación privada?). Puedes registrar gastos, pero se perderán al cerrar la página.";
    } else if (this.almacen.estaVacio()) {
      aviso.hidden = false;
      aviso.textContent = "Primera vez en este navegador: baja a Respaldo y restaura tu archivo de respaldo para cargar tu plan.";
    }
  }
}

const app = new App();
app.iniciar();
window.app = app;   // para inspeccionar desde la consola del navegador: app.estado, app.tarjetas.resumen("bbva"), etc.
