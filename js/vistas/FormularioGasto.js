// =============================================================================
// FormularioGasto.js — "Registrar gasto": monto, categoría, forma de pago,
// meses sin intereses, litros, fecha y nota. También muestra los avisos (hints).
// HTML: #form #monto #catChoices #metChoices #hint #msiField #msi #msiHint
//       #litrosField #litros #fecha #nota #add #msg
// =============================================================================
import { CATEGORIAS, METODOS, metodo } from "../config.js";
import { $, negrita, pesosExactos, aISO, deISO, hoy, enRango, redondear2 } from "../utilidades.js";

export class FormularioGasto {
  constructor(app) {
    this.app = app;
    this.eligioMetodo = false;   // true si el usuario tocó una forma de pago (ya no se le sugiere otra)
  }

  iniciar() {
    this.crearOpciones();
    $("fecha").value = aISO(hoy());
    $("form").addEventListener("submit", (e) => this.enviar(e));
    $("catChoices").addEventListener("change", () => this.sugerir());
    $("metChoices").addEventListener("change", () => { this.eligioMetodo = true; this.sugerir(); });
    $("msi").addEventListener("change", () => this.avisoMeses());
    $("monto").addEventListener("input", () => this.avisoMeses());
    $("fecha").addEventListener("change", () => { this.eligioMetodo = false; this.sugerir(); });
    this.sugerir();
  }

  pintar() { /* el formulario no se repinta con los datos: conserva lo que estás escribiendo */ }

  categoriaElegida() { return document.querySelector('input[name="categoria"]:checked')?.value || "gasolina"; }
  metodoElegido() { return document.querySelector('input[name="metodo"]:checked')?.value; }

  /** Crea los botones de categoría y de forma de pago a partir de config.js. */
  crearOpciones() {
    const cats = $("catChoices"); cats.innerHTML = "";
    CATEGORIAS.forEach((c, i) => {
      cats.insertAdjacentHTML("beforeend", `<input type="radio" name="categoria" id="cat-${c.id}" value="${c.id}" ${i === 0 ? "checked" : ""}><label for="cat-${c.id}"><span class="dot" style="background:${c.color}"></span>${c.name}</label>`);
    });
    const mets = $("metChoices"); mets.innerHTML = "";
    METODOS.forEach((m) => {
      mets.insertAdjacentHTML("beforeend", `<input type="radio" name="metodo" id="met-${m.id}" value="${m.id}"><label for="met-${m.id}"><span class="dot" style="background:${m.color}"></span>${m.name}</label>`);
    });
  }

  /** Con qué conviene pagar según la categoría y el día del mes (regla del jineteo). */
  metodoSugerido(cat, fecha) {
    if (cat === "encargo" || cat === "imprevisto") return null;
    if (cat !== "gasolina") return "debito";
    if (aISO(fecha) < (this.app.estado.cfg.inicioJineteo || "")) return "debito";
    const dia = fecha.getDate();
    return dia <= 7 ? "bbva" : (dia <= 21 ? "revolut" : "debito");
  }

  /** Preselecciona la forma de pago y muestra el aviso de la categoría. */
  sugerir() {
    const cat = this.categoriaElegida();
    $("litrosField").hidden = cat !== "gasolina";
    this.avisoMeses();
    const fecha = $("fecha").value ? deISO($("fecha").value) : hoy();
    const sugerido = this.metodoSugerido(cat, fecha);
    if (!this.eligioMetodo && sugerido) { const r = $("met-" + sugerido); if (r) r.checked = true; }
    const aviso = $("hint"); aviso.hidden = false; aviso.innerHTML = "";
    if (cat === "gasolina") {
      if (aISO(fecha) < (this.app.estado.cfg.inicioJineteo || "")) {
        aviso.append("Por ahora la gasolina va con ", negrita("Débito"), ": tus tarjetas todavía traen la deuda vieja.");
      } else {
        aviso.append("Día " + fecha.getDate() + ": la gasolina va con ", negrita(metodo(sugerido).name),
          sugerido === "debito" ? " (días 22 al fin de mes)." : (sugerido === "bbva" ? " (días 1 al 7)." : " (días 8 al 21)."));
      }
    } else if (cat === "imprevisto") {
      aviso.append("Sale de tu ", negrita("fondo de emergencia"), ", no de tu semana. Úsalo solo para urgencias reales: coche, salud o trabajo. Si pagas con tarjeta, aparta ese dinero de tu ahorro para la fecha de pago.");
    } else if (cat === "encargo") {
      aviso.append("No cuenta en tu presupuesto, pero sí en el saldo de la tarjeta. Cuando abones ese efectivo a la tarjeta, regístralo en ", negrita("Abono extra"), " (en Próximos pagos).");
    } else {
      aviso.hidden = true;
    }
  }

  /** Muestra el selector de meses solo con tarjeta, la mensualidad y el aviso si pasa del tope sano. */
  avisoMeses() {
    const t = this.app.tarjetas, met = this.metodoElegido();
    const esTarjeta = !!met && t.esTarjeta(met);
    $("msiField").hidden = !esTarjeta;
    const aviso = $("msiHint"); aviso.hidden = true; aviso.className = "hint";
    if (!esTarjeta) { $("msi").value = "1"; return; }
    const meses = +$("msi").value || 1, monto = parseFloat($("monto").value) || 0;
    if (!(monto > 0)) return;
    const tarjeta = t.config(met), tope = t.topeSano(met);
    const despues = t.resumen(met).total + monto;
    aviso.innerHTML = "";
    if (meses > 1) aviso.append("Pagarás ", negrita(pesosExactos(redondear2(monto / meses))), ` al mes durante ${meses} meses. El total ocupa tu línea de crédito desde hoy. `);
    if (tarjeta.limite > 0 && despues > tope) {
      aviso.className = "hint warn";
      aviso.append(`Con esta compra tu ${t.nombre(met)} quedaría en `, negrita(`${Math.round(despues / tarjeta.limite * 100)}%`), ` de uso, arriba del ${Math.round(this.app.estado.cfg.tope * 100)}% sano.`);
    }
    aviso.hidden = !aviso.textContent;
  }

  /** Valida y guarda el gasto. */
  enviar(evento) {
    evento.preventDefault();
    const monto = redondear2(parseFloat($("monto").value));
    if (!(monto > 0)) { $("msg").textContent = "Escribe un monto mayor a $0."; $("monto").focus(); return; }
    const gasto = {
      monto,
      categoria: this.categoriaElegida(),
      metodo: this.metodoElegido() || "debito",
      fecha: $("fecha").value || aISO(hoy()),
      nota: $("nota").value.trim().slice(0, 60),
      creado: Date.now(),
    };
    const litros = parseFloat($("litros").value);
    if (gasto.categoria === "gasolina" && litros > 0) gasto.litros = redondear2(litros);
    const meses = +$("msi").value || 1;
    if (this.app.tarjetas.esTarjeta(gasto.metodo) && meses > 1) gasto.msi = meses;

    $("add").disabled = true;
    try {
      this.app.estado.agregarGasto(gasto);
      const { inicio, fin } = this.app.vistaSemana.rango();
      $("msg").textContent = `Guardado: ${pesosExactos(monto)}${enRango(gasto, inicio, fin) ? "" : " (en otra semana)"}.`
        + (gasto.categoria === "encargo" ? " Cuando abones el efectivo a la tarjeta, regístralo en Abono extra." : "");
      $("monto").value = ""; $("nota").value = ""; $("litros").value = ""; $("msi").value = "1";
      this.eligioMetodo = false; this.sugerir();
      $("monto").focus();
    } catch {
      $("msg").textContent = "No se pudo guardar. Puede que el navegador ya no tenga espacio; descarga un respaldo e intenta de nuevo.";
    } finally { $("add").disabled = false; }
  }
}
