# Research — Decisiones técnicas

Investigación de soporte para el `plan.md`. Resuelve las incógnitas técnicas antes de implementar.

## R1 — File System Access API (persistencia local en JSON)

**Decisión:** usar `window.showDirectoryPicker()` para obtener un `FileSystemDirectoryHandle` y leer/escribir
archivos `.json` dentro.

**Hallazgos clave:**
- **Soporte:** Chromium (Chrome/Edge/Opera) en escritorio. **No** en Firefox ni Safari → requiere fallback.
- **Persistir el acceso:** el `FileSystemDirectoryHandle` es serializable a **IndexedDB** (no a localStorage).
  Se guarda el handle y se recupera al reabrir.
- **Permisos:** tras recuperar el handle, hay que llamar `handle.queryPermission({ mode: "readwrite" })`;
  si no es `"granted"`, pedir con `handle.requestPermission(...)`. Algunos navegadores **exigen un gesto
  del usuario** (clic) para re-otorgar → manejar con un botón "Reconectar carpeta".
- **Escritura:** `const w = await fileHandle.createWritable(); await w.write(blob); await w.close();`. La API
  **no** garantiza rename atómico, así que: hacer backup antes de operaciones de riesgo (migraciones).
- **Listar:** iterar `for await (const [name, handle] of dirHandle.entries())`.

**Implicación:** `FileSystemAdapter` encapsula todo esto; la UI solo ve `StorageAdapter`.

## R2 — Fallback para navegadores no Chromium

**Decisión:** `DownloadAdapter` que mantiene el estado en **IndexedDB** y ofrece **export/import** a `.json`.
- Banner que informa: "Tu navegador no soporta guardado directo en carpeta; usa Exportar/Importar".
- Mismo contrato `StorageAdapter`, distinta implementación → cero cambios en UI.

## R3 — Validación de datos

**Decisión:** **Zod** en los límites de lectura/escritura. Tipos derivados con `z.infer`.
- Pros: una sola fuente de verdad (esquema = validación = tipos), mensajes de error claros.
- Alternativa descartada: validar a mano (frágil) o JSON Schema + ajv (más boilerplate para derivar tipos TS).

## R4 — Estado de la aplicación

**Decisión:** **Zustand** con slices por dominio. La persistencia se invoca desde acciones del store que
llaman al `StorageAdapter`; el store **no** importa la File System API.
- Alternativa descartada: Redux Toolkit (más boilerplate para un mono-usuario), React Context puro
  (re-renders y ergonomía inferiores para este tamaño).

## R5 — UI / componentes

**Decisión:** **Tailwind + shadcn/ui (Radix)** + `lucide-react`.
- Accesibilidad y estética limpia "de fábrica"; componentes copiados al repo (control total, sin dependencia pesada).
- Se apoyará el diseño con el skill `frontend-design` para pantallas clave (dashboard, detalle de proyecto).

## R6 — Modelo de archivo: agregado vs. normalizado

**Decisión MVP:** **un archivo por proyecto** con áreas/procesos/checklists/ítems/tareas **embebidos**.
- Pros: diff git limpio, respaldo y edición manual triviales, lectura atómica por proyecto.
- Contras: archivos grandes en proyectos enormes → aceptable para el caso de uso; el adapter permite dividir luego.
- Listados rápidos sin abrir cada proyecto: **índice ligero** en `workspace.json`.

## R7 — Salud RAG

**Decisión:** RAG **manual por defecto**, con opción de **derivación** automática (vencidos/estancado → rojo;
por vencer → ámbar; si no, verde). Configurable por proyecto.

## R8 — Ejecución de automatizaciones temporales sin backend

**Decisión:** evaluar triggers `app.opened`, `schedule`, `date.*` **en cliente**: al iniciar la app y por
`setInterval` mientras está abierta. `lastRunAt` evita duplicados. Sin backend, no hay ejecución con la app
cerrada (limitación aceptada y documentada).

## R9 — Testing

**Decisión:** Vitest + React Testing Library.
- Unit: `FileSystemAdapter` con mocks de handles; round-trip Zod por colección; evaluador de automatizaciones.
- Componentes: pantallas clave (estados vacíos, navegación por teclado).
