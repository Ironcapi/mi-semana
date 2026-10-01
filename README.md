# Mi Semana en Pesos

Registro personal de gastos con presupuesto semanal, arrastre entre semanas, tarjetas, deudas y medidor de gasolina.
Es una sola página estática (`index.html`): no necesita servidor ni cuenta.

## Publicar en GitHub Pages

1. Crea un repositorio **público** en GitHub (por ejemplo `mi-semana`).
2. Sube estos archivos a la raíz: `index.html`, `icon-180.png`, `icon-512.png`, `manifest.json`, `.gitignore`, `README.md`.
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`, **Save**.
4. En 1–2 minutos queda en `https://TU-USUARIO.github.io/mi-semana/`.

Con git:

```bash
git init && git add . && git commit -m "Mi Semana en Pesos"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mi-semana.git
git push -u origin main
```

## Instalar en el iPhone

1. Abre la dirección en **Safari**.
2. Compartir → **Agregar a pantalla de inicio**.
3. Abre el ícono, baja a **Respaldo** y restaura tu archivo `respaldo-mi-semana-AAAA-MM-DD.json`
   (pásalo al iPhone por AirDrop o iCloud Drive).

## Datos y privacidad

- El código **no contiene** tus cifras. Tus gastos, deudas, pagos y configuración viven en el navegador
  de cada dispositivo (`localStorage`) y en tus archivos de respaldo.
- **No subas los respaldos al repositorio**: `.gitignore` ya excluye `respaldo*.json`.
- Los datos no se sincronizan entre dispositivos. Para pasarlos de uno a otro: *Descargar respaldo* en uno
  y *Restaurar* en el otro.
- Haz un respaldo de vez en cuando: si borras los datos de Safari o quitas el ícono de la pantalla de inicio,
  iOS puede borrar lo guardado.

## Cambiar el plan

Presupuestos, límites de tarjetas, tope semanal, fechas de corte y datos del coche están en el documento
`config/presupuesto` dentro del respaldo. Deudas y pagos programados están en `deudas/*` y `pagos/*`.
Puedes editar el JSON y restaurarlo.
