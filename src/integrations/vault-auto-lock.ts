import { useVaultStore } from "./vault";

const AUTO_LOCK_MINUTES_KEY = "hito:vault-autolock-min";
const DEFAULT_AUTO_LOCK_MINUTES = 10;

let lockTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function resetTimer(): void {
  if (lockTimer) clearTimeout(lockTimer);
  const minutes = loadAutoLockMinutes();
  if (minutes <= 0) return;
  lockTimer = setTimeout(() => {
    useVaultStore.getState().lock();
  }, minutes * 60 * 1000);
}

/** Applies a settings change immediately instead of waiting for the next
 * mouse/keyboard event to re-arm the timer with the new duration. */
export function applyAutoLockSettings(): void {
  if (!initialized) return;
  resetTimer();
}

/** `0` disables auto-lock entirely (only manual lock / explicit persistence
 * changes apply). Defaults to the previous hardcoded 10 minutes. */
export function loadAutoLockMinutes(): number {
  const raw = localStorage.getItem(AUTO_LOCK_MINUTES_KEY);
  if (raw === null) return DEFAULT_AUTO_LOCK_MINUTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_AUTO_LOCK_MINUTES;
}

export function saveAutoLockMinutes(minutes: number): void {
  localStorage.setItem(AUTO_LOCK_MINUTES_KEY, String(Math.max(0, minutes)));
}

export function initVaultAutoLock(): void {
  if (initialized) return;
  initialized = true;

  const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
  for (const event of events) {
    document.addEventListener(event, resetTimer, { passive: true });
  }

  // A persisted key (session/always) is meant to survive a reload — locking
  // on `beforeunload` would defeat that entirely, so it's skipped whenever
  // persistence is enabled (spec 023 §A).
  window.addEventListener("beforeunload", () => {
    if (useVaultStore.getState().persistenceMode === "off") {
      useVaultStore.getState().lock();
    }
  });

  resetTimer();
}

export function stopVaultAutoLock(): void {
  if (lockTimer) {
    clearTimeout(lockTimer);
    lockTimer = null;
  }
  initialized = false;
}
