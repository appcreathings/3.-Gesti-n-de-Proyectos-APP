# Constitución — Gestor de Proyectos & Procesos

> Documento fundacional (Spec Kit). Define los principios no negociables que rigen
> cada `spec`, `plan`, `task` e implementación del proyecto. Si un plan contradice
> la constitución, gana la constitución (o se enmienda la constitución de forma explícita).

- **Versión:** 1.0.0
- **Fecha de ratificación:** 2026-06-25
- **Última enmienda:** 2026-06-25

---

## Principio I — Local-First, los datos son del usuario

La aplicación funciona **sin servidor ni cuenta**. Toda la información vive en archivos
`.json` legibles dentro de una carpeta elegida por el usuario mediante la
**File System Access API**. El usuario puede abrir, versionar (git), respaldar o editar
esos archivos con cualquier herramienta. Nada queda atrapado en un formato propietario.

- No se envían datos a la nube sin acción explícita del usuario.
- El formato en disco es estable, documentado y versionado (`schemaVersion`).

## Principio II — El esquema de datos es el contrato

El modelo de datos (`data-model.md`) es la fuente de verdad. La UI se construye **sobre**
el esquema, no al revés. Todo cambio de esquema:

1. Incrementa `schemaVersion`.
2. Incluye una migración hacia adelante (`migrations/`).
3. Nunca rompe archivos existentes sin migración.

## Principio III — Plantillas y tipos como ciudadanos de primera clase

Definir **Tipos de Proyecto** y **Plantillas de Checklist** no es una función secundaria:
es el corazón del producto. Crear un proyecto debe ser "elegir un tipo y obtener sus
áreas, procesos y checklists listos para usar". Las plantillas son reutilizables,
versionables y desacopladas de las instancias que generan.

## Principio IV — Diseño limpio y enfocado

La interfaz prioriza claridad sobre densidad. Reglas:

- Jerarquía visual obvia, mucho espacio en blanco, tipografía legible.
- Componentes accesibles (Radix/shadcn), navegación por teclado, contraste AA.
- Sin "ruido": cada elemento en pantalla justifica su existencia.
- Estados vacíos guían al usuario hacia la siguiente acción.

## Principio V — Simplicidad y entrega incremental

Se construye en rebanadas verticales funcionales. Se evita la sobre-ingeniería:
nada de backend, ORM ni estado global complejo mientras un enfoque más simple baste.
Cada incremento deja la app usable de punta a punta.

## Principio VI — Migrabilidad deliberada

El almacenamiento se accede **solo** a través de una capa `StorageAdapter`. Hoy es
File System API; mañana puede ser IndexedDB, un backend Node o SQLite, **sin tocar la UI**.
El acoplamiento al mecanismo de persistencia está prohibido fuera de esa capa.

---

## Restricciones técnicas (stack ratificado)

- **Frontend:** React 18 + TypeScript (estricto) + Vite.
- **Estilos:** Tailwind CSS + shadcn/ui (Radix) + lucide-react.
- **Estado:** Zustand. Datos remotos/persistencia vía adapter, no en el store directamente.
- **Persistencia:** File System Access API (Chromium). Fallback documentado: descarga/carga de JSON.
- **Validación:** Zod en los límites (al leer/escribir JSON).
- **Sin backend, sin base de datos externa** en el MVP.

## Gobernanza

- Las enmiendas a esta constitución se registran aquí con fecha y motivo.
- Toda PR/feature declara qué principios afecta en su `spec.md`.
- Versionado de la constitución: SemVer (MAJOR = principio removido/redefinido).
