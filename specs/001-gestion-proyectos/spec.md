# Especificación — Gestor de Proyectos, Procesos y Checklists

- **Feature ID:** 001-gestion-proyectos
- **Estado:** Borrador aprobado
- **Fecha:** 2026-06-25
- **Principios afectados (constitución):** I, II, III, IV, V, VI (todos)

## Resumen

Aplicación web **local-first** para que una persona (PM/CEO) gestione **múltiples productos y
proyectos**, con foco en **documentar procesos (SOPs) y checklists por área** de cada proyecto.
Permite definir **Tipos de Proyecto** y **Plantillas de Checklist** reutilizables, ejecutar
**automatizaciones sencillas de PM**, y ver un **dashboard de portafolio**. Datos en archivos
`.json` dentro de una carpeta local elegida por el usuario (File System Access API). Sin backend.

## Problema / Necesidad

Hoy los procesos, checklists y el estado de cada proyecto viven dispersos (cabeza, hojas de
cálculo, notas). No hay una fuente única que: (a) documente *cómo* se hace cada cosa por área,
(b) muestre *qué falta* por proyecto, y (c) dé al CEO una vista de portafolio. Se necesita una
herramienta propia, sin dependencia de la nube, con datos exportables/versionables.

## Usuarios y roles

- **PM (operador principal):** crea proyectos, documenta procesos, gestiona checklists y tareas,
  define plantillas y automatizaciones.
- **CEO (mismo usuario, otra lente):** consulta el dashboard de portafolio, salud y riesgos.
- *(Mono-usuario en el MVP; el modelo de "Personas" permite asignar responsables nominales.)*

## Historias de usuario (con criterios de aceptación)

### HU-01 — Elegir carpeta de datos
**Como** usuario, **quiero** elegir una carpeta local **para** que mis datos se guarden en JSON ahí.
- ✅ Al primer arranque, la app pide elegir/crear una carpeta y crea `workspace.json`.
- ✅ Al reabrir, recuerda la carpeta (handle persistido) y re-solicita permiso si el navegador lo exige.
- ✅ En navegadores sin File System Access API, ofrece export/import de JSON (fallback).

### HU-02 — Definir Tipo de Proyecto
**Como** PM, **quiero** definir un Tipo de Proyecto con áreas, procesos y checklists por defecto.
- ✅ Puedo crear/editar/eliminar Tipos.
- ✅ Un Tipo declara áreas por defecto, y por cada área, plantillas de checklist y procesos asociados.
- ✅ Un Tipo puede declarar automatizaciones por defecto.

### HU-03 — Definir Plantilla de Checklist
**Como** PM, **quiero** plantillas de checklist reutilizables.
- ✅ Una plantilla tiene nombre, categoría e ítems (texto, requerido).
- ✅ Puedo aplicar una plantilla a un área para generar un checklist instanciado.

### HU-04 — Crear Producto y Proyecto
**Como** CEO/PM, **quiero** agrupar proyectos bajo productos.
- ✅ Puedo crear Productos (nombre, visión, objetivos, estado de ciclo de vida).
- ✅ Puedo crear un Proyecto **desde un Tipo**, opcionalmente asociado a un Producto.
- ✅ Al crear desde Tipo, se despliegan automáticamente sus áreas + procesos + checklists.

### HU-05 — Documentar procesos por área
**Como** PM, **quiero** documentar SOPs por área de un proyecto.
- ✅ Cada área tiene N procesos; cada proceso tiene descripción (markdown), pasos y versión.
- ✅ Los procesos persisten en el JSON del proyecto.

### HU-06 — Gestionar checklists e ítems
**Como** PM, **quiero** marcar avance por checklist.
- ✅ Puedo añadir/editar/eliminar ítems; marcarlos hechos; asignar responsable y fecha.
- ✅ Veo el % de avance por checklist y por área.

### HU-07 — Gestionar tareas (Kanban)
**Como** PM, **quiero** tareas accionables por proyecto.
- ✅ Tareas con estado (Por hacer/En curso/Bloqueada/Hecha), prioridad, responsable, fecha.
- ✅ Una tarea puede originarse desde un ítem de checklist.

### HU-08 — Automatizaciones sencillas
**Como** PM, **quiero** reglas disparador→condición→acción.
- ✅ **Reglas de estado:** completar checklist/área → marca área completa o cambia estado del proyecto.
- ✅ **Plantillas automáticas:** crear proyecto/añadir área → genera checklists desde plantilla.
- ✅ **Recordatorios/fechas:** ítems con fecha → avisos al vencer/por vencer; checklists recurrentes.
- ✅ **Notificaciones/resumen:** al abrir la app, calcula vencidos, por vencer y proyectos estancados.
- ✅ Puedo activar/desactivar cada regla. Las acciones son idempotentes (no duplican).

### HU-09 — Notificaciones y "Resumen del día"
**Como** PM, **quiero** ver qué requiere atención.
- ✅ Centro de notificaciones in-app (leídas/no leídas, severidad).
- ✅ "Resumen del día" con vencidos, por vencer (7 días) y proyectos estancados.

### HU-10 — Dashboard de portafolio (CEO)
**Como** CEO, **quiero** una vista global.
- ✅ KPIs: nº por estado, % avance, vencidos, estancados.
- ✅ Salud RAG por producto y proyecto; distribución por estado.

### HU-11 — Interfaz limpia y accesible
- ✅ Jerarquía visual clara, estados vacíos que guían, dark/light, navegación por teclado, contraste AA.

### HU-12 — Portabilidad de datos
- ✅ Export/import de toda la carpeta o por colección a JSON.
- ✅ Backup automático antes de migraciones de esquema.

## Requisitos no funcionales

- **Local-first / privacidad:** sin envío de datos a la nube sin acción explícita.
- **Robustez de datos:** validación Zod al leer/escribir; `schemaVersion` y migraciones.
- **Rendimiento:** fluido con cientos de proyectos y miles de ítems (lectura perezosa por proyecto).
- **Mantenibilidad:** persistencia solo vía `StorageAdapter`; UI desacoplada del mecanismo.

## Fuera de alcance (MVP)

- Multiusuario, autenticación y colaboración en tiempo real.
- Backend/servidor, base de datos remota, sincronización en la nube.
- Diagramas de Gantt, dependencias entre tareas complejas, time-tracking.
- App móvil nativa.

## Supuestos

- Navegador Chromium (Chrome/Edge) para la experiencia completa; otros usan fallback.
- Un solo usuario por carpeta de datos.

## Métricas de éxito

- Crear un proyecto completo (tipo→áreas→procesos→checklists) en < 2 minutos.
- 0 pérdidas de datos en operaciones normales (round-trip Zod siempre válido).
- El CEO identifica proyectos en rojo/estancados de un vistazo en el dashboard.
