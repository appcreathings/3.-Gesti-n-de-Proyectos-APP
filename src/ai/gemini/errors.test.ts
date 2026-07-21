import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AI_ERROR_MESSAGES, classifyAiError } from "./errors";

// El entorno de vitest es "node": `navigator` existe pero `navigator.onLine` es undefined → falsy,
// lo que haría classifyAiError devolver siempre "offline". Forzamos online=true para aislar los
// demás branches.
function forceOnline(on: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: on,
    configurable: true,
    writable: true,
  });
}
const originalOnLine = navigator.onLine;

beforeEach(() => forceOnline(true));
afterEach(() => forceOnline(originalOnLine));

// Cuerpo JSON real reportado por el usuario (cuota de proyecto/región en 0).
const REAL_PROJECT_ZERO_QUOTA_BODY = `{"error":{"code":429,"message":"Quota exceeded for quota metric 'API requests' and limit 'Request limit per minute for a region' of service 'generativelanguage.googleapis.com'","status":"RESOURCE_EXHAUSTED","details":[{"reason":"RATE_LIMIT_EXCEEDED","metadata":{"quota_location":"us-south1","quota_limit_value":"0","quota_unit":"1/min/{project}/{region}","quota_limit":"ApiRequestsPerMinutePerProjectPerRegion"}}]}}`;

// Como lo envuelve el SDK en el camino streaming: "got status: <status>. <JSON>"
const STREAMING_PROJECT_ZERO_QUOTA = `got status: RESOURCE_EXHAUSTED. ${REAL_PROJECT_ZERO_QUOTA_BODY}`;

function sdkLikeError(message: string, status?: number): Error {
  const err = new Error(message);
  if (typeof status === "number") {
    // El ApiError del SDK expone `status` como propiedad numérica.
    (err as unknown as { status: number }).status = status;
  }
  err.name = "ApiError";
  return err;
}

describe("classifyAiError — project-quota-zero (HU-01)", () => {
  it("clasifica como project-quota-zero el JSON exacto reportado por el usuario (camino no-streaming)", () => {
    const err = sdkLikeError(REAL_PROJECT_ZERO_QUOTA_BODY, 429);
    expect(classifyAiError(err)).toBe("project-quota-zero");
  });

  it("clasifica como project-quota-zero el formato del camino streaming (sendMessageStream)", () => {
    const err = sdkLikeError(STREAMING_PROJECT_ZERO_QUOTA, 429);
    expect(classifyAiError(err)).toBe("project-quota-zero");
  });

  it("detecta quota_limit_value numérico (sin comillas) también", () => {
    const err = sdkLikeError('{"error":{"code":429,"details":[{"metadata":{"quota_limit_value":0}}]}}', 429);
    expect(classifyAiError(err)).toBe("project-quota-zero");
  });

  it("NO marca como project-quota-zero si quota_limit_value > 0", () => {
    const err = sdkLikeError(
      '{"error":{"code":429,"details":[{"metadata":{"quota_limit_value":"100","quota_limit":"ApiRequestsPerMinutePerProjectPerRegion"}}]}}',
      429,
    );
    // Es un 429 normal sin cuota-cero: debe caer como rate-limit.
    expect(classifyAiError(err)).toBe("rate-limit");
  });

  it("NO marca como project-quota-zero si quota_limit_value es '01' o '100' (no confundir prefijo 0)", () => {
    const err1 = sdkLikeError(
      '{"error":{"code":429,"details":[{"metadata":{"quota_limit_value":"01"}}]}}',
      429,
    );
    const err2 = sdkLikeError(
      '{"error":{"code":429,"details":[{"metadata":{"quota_limit_value":"100"}}]}}',
      429,
    );
    expect(classifyAiError(err1)).toBe("rate-limit");
    expect(classifyAiError(err2)).toBe("rate-limit");
  });

  it("no regresa project-quota-zero ante un 429 genérico sin quota_limit_value en el cuerpo", () => {
    const err = sdkLikeError('{"error":{"code":429,"message":"Rate limit exceeded"}}', 429);
    expect(classifyAiError(err)).toBe("rate-limit");
  });
});

describe("classifyAiError — regresión de los demás kinds", () => {
  it("429 sin cuerpo de cuota-cero sigue siendo rate-limit", () => {
    expect(classifyAiError(sdkLikeError('{"error":{"code":429}}', 429))).toBe("rate-limit");
  });

  it("400/401/403 → invalid-key", () => {
    expect(classifyAiError(sdkLikeError('{"error":{"code":400}}', 400))).toBe("invalid-key");
    expect(classifyAiError(sdkLikeError('{"error":{"code":401}}', 401))).toBe("invalid-key");
    expect(classifyAiError(sdkLikeError('{"error":{"code":403}}', 403))).toBe("invalid-key");
  });

  it("abort por AbortError → aborted", () => {
    expect(classifyAiError(new DOMException("aborted", "AbortError"))).toBe("aborted");
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(classifyAiError(err)).toBe("aborted");
  });

  it("TypeError → offline", () => {
    expect(classifyAiError(new TypeError("failed to fetch"))).toBe("offline");
  });

  it("navigator.onLine=false → offline aunque el status sea 429 con cuota-cero", () => {
    forceOnline(false);
    const err = sdkLikeError(REAL_PROJECT_ZERO_QUOTA_BODY, 429);
    // El guard de offline va antes que cualquier chequeo de cuerpo: la app offline debe avisar
    // que hace falta red antes que hablar de cuotas.
    expect(classifyAiError(err)).toBe("offline");
    forceOnline(true);
  });
});

describe("AI_ERROR_MESSAGES — exhaustividad y nuevo mensaje", () => {
  it("tiene un mensaje accionable para project-quota-zero que menciona Google Cloud Console o AI Studio", () => {
    const msg = AI_ERROR_MESSAGES["project-quota-zero"];
    expect(msg.length).toBeGreaterThan(20);
    // Accionable: debe mencionar Google Cloud Console o AI Studio para cumplir HU-01.
    expect(msg.toLowerCase()).toMatch(/google cloud console|ai studio/);
  });

  it("el mensaje de project-quota-zero NO promete que esperar/reintentar arregle nada", () => {
    const msg = AI_ERROR_MESSAGES["project-quota-zero"].toLowerCase();
    expect(msg).not.toContain("espera unos segundos");
    expect(msg).toContain("no es un límite temporal");
  });

  it("tiene entrada para todos los kinds del tipo AiErrorKind", () => {
    const kinds: Array<keyof typeof AI_ERROR_MESSAGES> = [
      "invalid-key",
      "rate-limit",
      "quota-exhausted",
      "project-quota-zero",
      "all-models-exhausted",
      "offline",
      "aborted",
      "unknown",
    ];
    for (const k of kinds) {
      expect(typeof AI_ERROR_MESSAGES[k]).toBe("string");
      expect(AI_ERROR_MESSAGES[k].length).toBeGreaterThan(0);
    }
  });
});
