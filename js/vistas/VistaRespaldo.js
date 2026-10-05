// =============================================================================
// VistaRespaldo.js — Botones de "Descargar respaldo" y "Restaurar".
// HTML: #bkExport #bkFile #bkImport #bkMsg
// =============================================================================
import { $ } from "../utilidades.js";

export class VistaRespaldo {
  constructor(app) {
    this.app = app;
    this.pendiente = null;   // contenido del archivo elegido, esperando confirmación
  }

  iniciar() {
    $("bkExport").addEventListener("click", () => this.descargar());
    $("bkFile").addEventListener("change", (e) => this.elegirArchivo(e));
    $("bkImport").addEventListener("click", () => this.restaurar());
  }

  pintar() {}

  descargar() {
    this.app.respaldo.descargar();
    $("bkMsg").textContent = "Respaldo descargado. Guárdalo en Archivos o iCloud; no lo subas a GitHub.";
  }

  async elegirArchivo(evento) {
    const archivo = evento.target.files && evento.target.files[0];
    this.pendiente = null; $("bkImport").hidden = true;
    if (!archivo) return;
    try {
      const r = await this.app.respaldo.leerArchivo(archivo);
      this.pendiente = r.docs;
      $("bkMsg").textContent = `El respaldo tiene ${r.registros} registros${r.fecha ? " (del " + r.fecha + ")" : ""}. Al restaurarlo se reemplaza todo lo que hay ahora en este navegador.`;
      $("bkImport").hidden = false;
    } catch (e) {
      $("bkMsg").textContent = e.message === "lectura" ? "No se pudo leer el archivo." : "Ese archivo no es un respaldo de esta página.";
    }
  }

  restaurar() {
    if (!this.pendiente) return;
    try { this.app.respaldo.restaurar(this.pendiente); location.reload(); }
    catch { $("bkMsg").textContent = "No se pudo restaurar: el navegador no dejó guardar los datos."; }
  }
}
