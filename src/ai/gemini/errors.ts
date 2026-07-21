export type AiErrorKind =
  | "invalid-key"
  | "rate-limit"
  | "quota-exhausted"
  | "project-quota-zero"
  | "all-models-exhausted"
  | "offline"
  | "aborted"
  | "unknown";

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  "invalid-key":
    "La API key no es válida o fue revocada. Revísala en Ajustes → Asistente IA.",
  "rate-limit":
    "Límite de peticiones alcanzado. Espera unos segundos y vuelve a intentarlo.",
  "quota-exhausted":
    "Cuota de tokens agotada para este modelo. Cambia a otro modelo o espera a que se restablezca.",
  "project-quota-zero":
    "Tu proyecto de Google Cloud tiene esta cuota en 0 en la región asignada — no es un límite " +
    "temporal, reintentar no lo va a arreglar. Revisa las cuotas de tu proyecto en Google Cloud " +
    "Console, o genera una API key nueva en otro proyecto desde Google AI Studio (Ajustes → " +
    "Asistente IA).",
  "all-models-exhausted":
    "Todos los modelos disponibles alcanzaron su límite. Espera un minuto y vuelve a intentarlo, o cambia el grupo de fallback en Ajustes.",
  offline: "Sin conexión a internet. El asistente necesita red para hablar con Gemini.",
  aborted: "Respuesta detenida.",
  unknown: "Error inesperado al hablar con Gemini. Inténtalo de nuevo.",
};

/** Detects `"quota_limit_value":"0"` (or numeric 0) embedded in the SDK error message. */
function hasZeroQuota(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // Matches "quota_limit_value":"0" or "quota_limit_value":0, but NOT 0 as a prefix of a larger
  // number like "01" or "100" (negative lookahead on the next digit/quote boundary).
  return /"quota_limit_value"\s*:\s*"?0"?(?!\d)/.test(msg);
}

/** Map an unknown SDK/fetch failure to a user-facing error kind. */
export function classifyAiError(e: unknown): AiErrorKind {
  if (e instanceof DOMException && e.name === "AbortError") return "aborted";
  if (e instanceof Error && e.name === "AbortError") return "aborted";

  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (e instanceof TypeError) return "offline"; // fetch network failure

  // Detect project-level zero quota BEFORE the generic 429 mapping: the JSON body embedded in the
  // SDK's ApiError.message (see design.md §2) tells us the quota is 0/min for the whole project/
  // region, which is not actionable with wait/retry and should not trigger the model fallback chain.
  if (hasZeroQuota(e)) return "project-quota-zero";

  const status = extractStatus(e);
  if (status === 400 || status === 401 || status === 403) return "invalid-key";
  if (status === 429) return "rate-limit";

  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  if (msg.includes("api key")) return "invalid-key";
  if (msg.includes("quota") || msg.includes("rate")) {
    if (msg.includes("token") || msg.includes("exceeded") || msg.includes("daily limit")) {
      return "quota-exhausted";
    }
    return "rate-limit";
  }
  if (msg.includes("fetch failed") || msg.includes("networkerror")) return "offline";
  return "unknown";
}

function extractStatus(e: unknown): number | null {
  if (e && typeof e === "object") {
    const anyErr = e as { status?: unknown; code?: unknown };
    if (typeof anyErr.status === "number") return anyErr.status;
    if (typeof anyErr.code === "number") return anyErr.code;
  }
  // ApiError messages embed the JSON body: {"error":{"code":400,...}}
  const m = e instanceof Error ? /"code"\s*:\s*(\d{3})/.exec(e.message) : null;
  return m ? Number(m[1]) : null;
}
