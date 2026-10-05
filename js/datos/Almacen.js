// =============================================================================
// Almacen.js — Guarda y lee los datos en el navegador (localStorage).
// Todo vive en UN solo objeto: { "gastos/abc": {...}, "pagos/xyz": {...}, ... }
// La "ruta" de cada documento es "coleccion/id".
// =============================================================================

export class Almacen {
  /** @param {string} clave nombre de la entrada en localStorage */
  constructor(clave) {
    this.clave = clave;
    this.docs = {};
    this.disponible = true;   // false si el navegador no deja guardar (p. ej. navegación privada)
    this.oyentes = new Set();
    try {
      this.docs = JSON.parse(localStorage.getItem(clave) || "{}") || {};
      localStorage.setItem(clave, JSON.stringify(this.docs));
    } catch {
      this.disponible = false;
    }
    // Si la página está abierta en otra pestaña y allá cambian los datos, recargar aquí.
    window.addEventListener("storage", (e) => {
      if (e.key !== this.clave) return;
      try { this.docs = JSON.parse(e.newValue || "{}") || {}; } catch { /* se conserva lo que había */ }
      this._avisar();
    });
  }

  /** Un documento por su ruta ("config/presupuesto"), o null si no existe. */
  leer(ruta) { return ruta in this.docs ? this.docs[ruta] : null; }

  /** Todos los documentos de una colección, cada uno con su `id`. */
  listar(coleccion) {
    const prefijo = coleccion + "/";
    return Object.keys(this.docs).filter((k) => k.startsWith(prefijo) && !k.slice(prefijo.length).includes("/")).sort()
      .map((k) => ({ id: k.slice(prefijo.length), ...this.docs[k] }));
  }

  /** Crea o reemplaza un documento completo. */
  guardar(ruta, doc) { this.docs[ruta] = JSON.parse(JSON.stringify(doc)); this._persistir(); }

  /** Cambia solo algunos campos de un documento que ya existe. */
  actualizar(ruta, cambios) {
    if (!(ruta in this.docs)) throw new Error("No existe " + ruta);
    this.docs[ruta] = { ...this.docs[ruta], ...JSON.parse(JSON.stringify(cambios)) };
    this._persistir();
  }

  borrar(ruta) { delete this.docs[ruta]; this._persistir(); }

  /** Id nuevo para un documento. */
  nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  estaVacio() { return Object.keys(this.docs).length === 0; }
  exportar() { return JSON.parse(JSON.stringify(this.docs)); }
  importar(docs) { this.docs = JSON.parse(JSON.stringify(docs)); this._persistir(); }

  /** Registra una función que se llama cada vez que cambian los datos. */
  alCambiar(fn) { this.oyentes.add(fn); }

  _persistir() {
    if (this.disponible) localStorage.setItem(this.clave, JSON.stringify(this.docs));
    this._avisar();
  }
  _avisar() { this.oyentes.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
}
