export type AiErrorKind =
  | "invalid-key"
  | "rate-limit"
  | "all-models-exhausted"
  | "offline"
  | "aborted"
  | "unknown";

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  "invalid-key":
    "La API key no es válida o fue revocada. Revísala en Ajustes → Asistente IA.",
  "rate-limit":
    "Límite de peticiones alcanzado. Espera unos segundos y vuelve a intentarlo.",
  "all-models-exhausted":
    "Todos los modelos disponibles alcanzaron su límite. Espera un minuto y vuelve a intentarlo, o cambia el grupo de fallback en Ajustes.",
  offline: "Sin conexión a internet. El asistente necesita red para hablar con Gemini.",
  aborted: "Respuesta detenida.",
  unknown: "Error inesperado al hablar con Gemini. Inténtalo de nuevo.",
};

/** Map an unknown SDK/fetch failure to a user-facing error kind. */
export function classifyAiError(e: unknown): AiErrorKind {
  if (e instanceof DOMException && e.name === "AbortError") return "aborted";
  if (e instanceof Error && e.name === "AbortError") return "aborted";

  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (e instanceof TypeError) return "offline"; // fetch network failure

  const status = extractStatus(e);
  if (status === 400 || status === 401 || status === 403) return "invalid-key";
  if (status === 429) return "rate-limit";

  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  if (msg.includes("api key")) return "invalid-key";
  if (msg.includes("quota") || msg.includes("rate")) return "rate-limit";
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
