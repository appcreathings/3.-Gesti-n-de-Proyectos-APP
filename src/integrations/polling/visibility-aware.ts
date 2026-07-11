import { pollingManager } from "./polling-manager";

let initialized = false;
// Referencia guardada para poder desuscribirla en `stopVisibilityAwarePolling`
// (spec 023 §F, auditoría de fugas). Antes `stop` solo reseteaba `initialized`
// sin quitar el listener real: un ciclo init→stop→init dejaba DOS listeners
// activos — cada `visibilitychange` futuro llamaba `resumeAll`/`pauseAll` dos
// veces. Dormido en producción (nada llama a `stop` hoy), pero real si algo
// alguna vez lo hiciera.
let handleVisibilityChange: (() => void) | null = null;

export function initVisibilityAwarePolling(): void {
  if (initialized) return;
  initialized = true;

  handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      pollingManager.resumeAll();
    } else {
      pollingManager.pauseAll();
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

export function stopVisibilityAwarePolling(): void {
  if (handleVisibilityChange) {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange = null;
  }
  initialized = false;
}
