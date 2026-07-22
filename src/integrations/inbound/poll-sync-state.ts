/** Estado de sincronización incremental por poll key, en `localStorage`.
 * Extraído de `hubspot-polling-manager.ts` para compartirlo con
 * `sheets-polling-manager.ts` sin duplicar la lógica. */

function lastSyncStorageKey(pollKey: string): string {
  return `hito:poll-lastSync:${pollKey}`;
}

export function loadLastSyncAt(pollKey: string): string | null {
  try {
    return localStorage.getItem(lastSyncStorageKey(pollKey));
  } catch {
    return null;
  }
}

export function saveLastSyncAt(pollKey: string, value: string): void {
  try {
    localStorage.setItem(lastSyncStorageKey(pollKey), value);
  } catch {
    // localStorage unavailable (e.g. private mode) — incremental sync degrades
    // to always re-fetching the last page, which is safe (idempotency dedupes).
  }
}

// --- Backlog del inbox (spec 033 A2) -----------------------------------
// El proxy Apps Script reporta cuántas entregas quedan acumuladas tras cada
// `drain` (`result.data.backlog`). Lo persistimos por poll-key para que el
// semáforo de salud por conexión pueda avisar cuando el backlog crece hacia
// el límite de retención (7 días, spec 026 §E) — síntoma de que Hito estuvo
// cerrado demasiado tiempo o de que Make/Zapier empuja más rápido de lo que
// se drena.

function lastBacklogStorageKey(pollKey: string): string {
  return `hito:poll-backlog:${pollKey}`;
}

export function loadLastBacklog(pollKey: string): number | null {
  try {
    const raw = localStorage.getItem(lastBacklogStorageKey(pollKey));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveLastBacklog(pollKey: string, backlog: number): void {
  try {
    localStorage.setItem(lastBacklogStorageKey(pollKey), String(backlog));
  } catch {
    // localStorage unavailable — el semáforo simplemente no mostrará backlog.
  }
}
