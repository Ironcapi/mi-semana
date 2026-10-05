// =============================================================================
// Respaldo.js — Descargar todos los datos a un archivo .json y restaurarlos.
// =============================================================================
import { aISO, hoy } from "../utilidades.js";

const NOMBRE_APP = "mi-semana-en-pesos";

export class Respaldo {
  /** @param {import("./Almacen.js").Almacen} almacen */
  constructor(almacen) { this.almacen = almacen; }

  /** Descarga un archivo con todo lo guardado. */
  descargar() {
    const contenido = { app: NOMBRE_APP, version: 1, exportado: new Date().toISOString(), docs: this.almacen.exportar() };
    const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: "application/json" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `respaldo-mi-semana-${aISO(hoy())}.json`;
    document.body.append(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 2000);
  }

  /**
   * Lee un archivo de respaldo y lo valida.
   * @returns {Promise<{docs: object, registros: number, fecha: string}>}
   */
  leerArchivo(archivo) {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onerror = () => rechazar(new Error("lectura"));
      lector.onload = () => {
        try {
          const p = JSON.parse(lector.result);
          if (!p || p.app !== NOMBRE_APP || typeof p.docs !== "object" || Array.isArray(p.docs)) throw new Error("formato");
          resolver({ docs: p.docs, registros: Object.keys(p.docs).length, fecha: p.exportado ? p.exportado.slice(0, 10) : "" });
        } catch { rechazar(new Error("formato")); }
      };
      lector.readAsText(archivo);
    });
  }

  /** Reemplaza TODO lo guardado con el contenido del respaldo. */
  restaurar(docs) { this.almacen.importar(docs); }
}
