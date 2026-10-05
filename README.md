# Mi Semana en Pesos

Registro personal de gastos: presupuesto semanal con arrastre, tarjetas (cortes y meses sin intereses),
deudas, ahorro libre y medidor de gasolina. Es una página estática: no necesita servidor ni cuenta.
Los datos se guardan en el navegador de cada dispositivo.

## Estructura

```
index.html                 Estructura de la página (solo HTML; cada sección dice qué vista la controla)
css/estilos.css            Todos los estilos (colores, tipografía, componentes)
js/
  app.js                   Punto de entrada: crea todo, lo conecta y repinta
  config.js                Categorías, formas de pago y configuración base
  utilidades.js            Fechas, formato de pesos, atajos de DOM
  datos/
    Almacen.js             Lee y guarda en localStorage
    Estado.js              Datos en memoria + acciones para guardar (agregarGasto, guardarPago, ...)
    Respaldo.js            Descargar / restaurar el archivo .json
  calculos/                Reglas del negocio. No tocan la pantalla.
    Presupuesto.js         Presupuesto por semana y categoría, arrastre, tope, movimientos
    Deudas.js              Cuánto falta de cada deuda y sus pagos pendientes
    Tarjetas.js            Cortes, mensualidades (MSI), saldo y próximo pago de cada tarjeta
    Pagos.js               Lista de próximos pagos, marcar pagado, abonos extra
    Tanque.js              Estimación de gasolina
    Ahorro.js              Ahorro libre y meta del fondo de emergencia
  vistas/                  Una clase por sección de la página. Solo pintan y escuchan clics.
    VistaSemana.js         Selector de semana, total, barras por categoría, lista de gastos
    FormularioGasto.js     Registrar gasto (sugerencia de tarjeta, meses sin intereses, avisos)
    VistaMoverSaldo.js     Mover saldo entre presupuestos
    VistaTanque.js         Medidor de gasolina
    VistaPagos.js          Próximos pagos y abono extra
    VistaTarjetas.js       Tarjetas y compras a meses
    VistaAhorro.js         Mi ahorro
    VistaDeudas.js         Mis deudas e imprevistos
    VistaPresupuestoMensual.js
    VistaAjustes.js        Ajustar presupuesto (con candado de tope)
    VistaRespaldo.js       Botones de respaldo
```

## Cómo fluye

```
Almacen (localStorage) → Estado (datos) → calculos/* (números) → vistas/* (pantalla)
                              ↑                                        |
                              └────────── la vista guarda algo ────────┘
```

Cada vista tiene dos métodos: `iniciar()` (conecta botones, una sola vez) y `pintar()` (dibuja con los datos actuales).
Cuando algo se guarda, `Estado` avisa y `app.pintar()` repinta todas las vistas.

## ¿Dónde le muevo si quiero…?

| Quiero… | Archivo |
|---|---|
| Agregar o renombrar una categoría o forma de pago | `js/config.js` |
| Cambiar la regla de con qué tarjeta va la gasolina (días 1–7, 8–21) | `js/vistas/FormularioGasto.js` → `metodoSugerido()` |
| Cambiar cómo se arrastra lo que sobra de una semana | `js/calculos/Presupuesto.js` → `arrastreDe()` |
| Cambiar cómo se calcula el corte o la fecha de pago | `js/calculos/Tarjetas.js` → `ciclo()` |
| Cambiar cómo se reparten los meses sin intereses | `js/calculos/Tarjetas.js` → `mensualidades()` |
| Cambiar qué cuenta como "comprometido" en el ahorro | `js/calculos/Ahorro.js` → `comprometido()` |
| Cambiar el consumo de gasolina por día | `js/calculos/Tanque.js` → `litrosDelDia()` |
| Agregar un campo en "Ajustar presupuesto" | `js/vistas/VistaAjustes.js` → `campos()` y `guardar()` |
| Cambiar textos o el orden de las secciones | `index.html` (y el texto dinámico en su vista) |
| Cambiar colores o tamaños | `css/estilos.css` (los colores están arriba, en `:root`) |
| Agregar una sección nueva | HTML en `index.html`, una clase en `js/vistas/`, y registrarla en `js/app.js` |

Para probar cosas desde la consola del navegador: `app.estado.gastos`, `app.tarjetas.resumen("bbva")`,
`app.presupuesto.resumenSemana(new Date(2026, 9, 5))`.

## Datos guardados

Todo vive en `localStorage` bajo la clave `msp:v1`, como un objeto `{ "coleccion/id": documento }`:

| Ruta | Contenido |
|---|---|
| `gastos/<id>` | `{monto, categoria, metodo, fecha, nota, creado, litros?, msi?}` |
| `pagos/<id>` | `{fecha, concepto, deuda?, tarjeta?, monto, pagado, pagadoEl?, pagadoTs?, extra?, auto?}` |
| `deudas/<id>` | `{nombre, saldoInicial, orden, tarjeta?}` |
| `movimientos/<id>` | `{semana, de, a, monto, creado}` |
| `config/presupuesto` | Tu plan: presupuestos, tarjetas, topes, ingreso, coche (ver `CONFIG_BASE` en `js/config.js`) |
| `config/tanque` | Última lectura del tablero `{litros, ts, marca}` |
| `config/ahorro` | Último saldo real `{saldo, ts}` |

El código **no contiene** tus cifras: vienen del respaldo. **No subas los respaldos al repositorio**
(`.gitignore` ya excluye `respaldo*.json`).

## Probar en tu computadora

Como usa módulos de JavaScript, no funciona abriendo `index.html` con doble clic. Opciones:

- VS Code: instala la extensión **Live Server** y elige "Open with Live Server".
- Terminal, dentro de la carpeta: `python3 -m http.server 8000` y abre `http://localhost:8000`.

## Publicar

GitHub Pages: **Settings → Pages → Deploy from a branch**, rama `main`, carpeta `/ (root)`.
Para subir cambios desde VS Code: Source Control → mensaje → **Commit** → **Sync Changes**.

## En el iPhone

Abre la dirección en Safari → Compartir → **Agregar a pantalla de inicio**. Los datos no se sincronizan entre
dispositivos: usa *Descargar respaldo* en uno y *Restaurar* en el otro. Haz un respaldo de vez en cuando.
