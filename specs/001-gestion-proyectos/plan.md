# Plan Técnico — Gestor de Proyectos

- **Feature:** 001-gestion-proyectos
- **Constitución:** alineado con los 6 principios. Sin violaciones (no backend, datos del usuario, esquema-contrato).

## Stack ratificado

| Capa | Tecnología |
|------|------------|
| Lenguaje | TypeScript (estricto) |
| Build | Vite |
| UI | React 18 |
| Estilos | Tailwind CSS |
| Componentes | shadcn/ui (Radix) + lucide-react |
| Estado | Zustand (slices por dominio) |
| Validación | Zod (límites de I/O) |
| Persistencia | File System Access API (`FileSystemAdapter`) + fallback (`DownloadAdapter`) |
| Routing | React Router |
| Markdown | react-markdown (procesos) |
| Tests | Vitest + React Testing Library |

## Estructura de carpetas (resumen; detalle en `/` plan raíz)

```
src/
  domain/{schemas,migrations}/   # Zod + tipos derivados + migraciones
  storage/                        # StorageAdapter, FileSystemAdapter, DownloadAdapter, workspace bootstrap
  store/                          # slices Zustand
  automations/                    # events.ts, engine.ts, actions.ts
  features/                       # dashboard, products, projects, project-detail, library, automations, notifications, settings
  components/ui/                  # primitivos shadcn
  lib/                            # fechas, rag, ids, markdown
```

## Capas y dependencias (regla de acoplamiento)

```
features/ ─▶ store/ ─▶ storage/StorageAdapter (interfaz) ─▶ FileSystemAdapter | DownloadAdapter
   │            │
   └────────────┴─▶ domain/ (tipos + Zod)     automations/ ◀─ store emite eventos
```
- `features/` nunca importa `FileSystemAdapter` ni la File System API directamente.
- `domain/` no depende de nada de UI ni storage.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| File System API solo Chromium | `DownloadAdapter` + banner; mismo contrato |
| Re-otorgar permiso al reabrir | Botón "Reconectar carpeta" tras gesto de usuario |
| Corrupción/escritura parcial | Backup antes de migraciones; validación Zod al leer |
| Archivos de proyecto grandes | Índice ligero en workspace.json; opción de dividir vía adapter |
| Automatizaciones duplicadas | Acciones idempotentes + `lastRunAt` |

## Estrategia de implementación

Rebanadas verticales por milestone (ver `tasks.md`). Cada milestone deja la app usable de punta a punta
(Principio V). M0 establece la columna vertebral (esquemas + adapter + bootstrap) sin la cual nada persiste.

## Gates de la constitución (revisión)

- ✅ **I Local-first:** sin servidor; datos en carpeta del usuario.
- ✅ **II Esquema-contrato:** Zod como fuente de verdad; `schemaVersion` + migraciones.
- ✅ **III Plantillas/Tipos 1ª clase:** M2 dedicado; crear-desde-tipo central.
- ✅ **IV Diseño limpio:** Tailwind+shadcn, estados vacíos, A11y.
- ✅ **V Simplicidad/incremental:** milestones verticales; sin backend/ORM.
- ✅ **VI Migrabilidad:** todo tras `StorageAdapter`.
