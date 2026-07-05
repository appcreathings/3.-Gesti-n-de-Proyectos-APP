# Quickstart — Gestor de Proyectos

## Requisitos
- Node 18+ y un navegador **Chromium** (Chrome o Edge) para guardado directo en carpeta.
  (Firefox/Safari funcionan con Exportar/Importar JSON.)

## Arrancar
```bash
npm install
npm run dev
# abrir la URL que imprime Vite (http://localhost:5173) en Chrome/Edge
```

## Primer uso (flujo feliz)
1. **Elegir carpeta:** al abrir, pulsa "Elegir carpeta de datos" y selecciona/crea una carpeta vacía.
   Se crea `workspace.json`. (Al reabrir, pulsa "Reconectar carpeta" si el navegador pide permiso.)
2. **Crear una Plantilla de Checklist:** Biblioteca → Plantillas → "Nueva" (p.ej. "QA Release" con 3 ítems).
3. **Crear un Tipo de Proyecto:** Biblioteca → Tipos → "Nuevo". Añade áreas (p.ej. Desarrollo, Diseño) y
   asocia la plantilla de checklist a un área.
4. **Crear un Proyecto desde el Tipo:** Proyectos → "Nuevo desde Tipo". Se despliegan áreas + checklists.
5. **Documentar un Proceso:** entra al proyecto → pestaña Áreas → un área → "Nuevo proceso" (markdown + pasos).
6. **Completar checklist:** marca los ítems; si configuraste la regla, el área se marca completa.
7. **Fechas y resumen:** pon fecha límite a un ítem; al reabrir verás notificaciones y el "Resumen del día".
8. **Dashboard:** revisa salud RAG, vencidos y proyectos estancados.

## Estructura en disco (tu carpeta de datos)
```
workspace.json
products/<id>.json
projects/<id>.json
project-types/<id>.json
checklist-templates/<id>.json
automations/<id>.json
people/people.json
notifications/notifications.json
.backups/<timestamp>/...
```
Los archivos son JSON legibles: puedes versionarlos con git o respaldarlos.

## Scripts
```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run preview  # previsualizar build
npm run test     # Vitest
```
