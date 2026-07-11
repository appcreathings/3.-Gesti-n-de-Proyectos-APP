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
